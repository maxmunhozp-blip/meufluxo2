
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'member');

-- 2. Create workspace_role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member');

-- 3. Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 4. Create workspace_members table
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 5. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. Add workspace_id to existing tables
ALTER TABLE public.projects ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.sections ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 7. Security definer function: check if user has app role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 8. Security definer function: check if user is member of workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- 9. Security definer function: check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- 10. Trigger: auto-create workspace + assign roles on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _workspace_id uuid;
  _user_count int;
  _full_name text;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  -- Upsert profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, _full_name)
  ON CONFLICT (id) DO NOTHING;

  -- Create personal workspace
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (_full_name || ' Workspace', NEW.id)
  RETURNING id INTO _workspace_id;

  -- Add user as workspace owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role, accepted_at)
  VALUES (_workspace_id, NEW.id, 'owner', now());

  -- First user gets super_admin
  SELECT count(*) INTO _user_count FROM public.user_roles;
  IF _user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  END IF;

  -- Assign default member role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 11. RLS Policies for workspaces
CREATE POLICY "Users can view their workspaces"
ON public.workspaces FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can create workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update workspaces"
ON public.workspaces FOR UPDATE
USING (auth.uid() = owner_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Owners can delete workspaces"
ON public.workspaces FOR DELETE
USING (auth.uid() = owner_id OR public.is_super_admin(auth.uid()));

-- 12. RLS Policies for workspace_members
CREATE POLICY "Members can view workspace members"
ON public.workspace_members FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Owners/admins can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
  OR public.is_super_admin(auth.uid())
  -- Allow self-insert during signup (workspace creation trigger)
  OR auth.uid() = user_id
);

CREATE POLICY "Owners can remove members"
ON public.workspace_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'owner'
  )
  OR public.is_super_admin(auth.uid())
);

-- 13. RLS Policies for user_roles (read-only for users, managed by system)
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

-- 14. Update existing table policies to use workspace_id scoping
-- Drop old policies on projects
DROP POLICY IF EXISTS "Projects deletable by authenticated" ON public.projects;
DROP POLICY IF EXISTS "Projects insertable by authenticated" ON public.projects;
DROP POLICY IF EXISTS "Projects readable by authenticated" ON public.projects;
DROP POLICY IF EXISTS "Projects updatable by authenticated" ON public.projects;

CREATE POLICY "Projects readable by workspace members"
ON public.projects FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Projects insertable by workspace members"
ON public.projects FOR INSERT
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Projects updatable by workspace members"
ON public.projects FOR UPDATE
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Projects deletable by workspace members"
ON public.projects FOR DELETE
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

-- Drop old policies on sections
DROP POLICY IF EXISTS "Sections deletable by authenticated" ON public.sections;
DROP POLICY IF EXISTS "Sections insertable by authenticated" ON public.sections;
DROP POLICY IF EXISTS "Sections readable by authenticated" ON public.sections;
DROP POLICY IF EXISTS "Sections updatable by authenticated" ON public.sections;

CREATE POLICY "Sections readable by workspace members"
ON public.sections FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Sections insertable by workspace members"
ON public.sections FOR INSERT
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Sections updatable by workspace members"
ON public.sections FOR UPDATE
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Sections deletable by workspace members"
ON public.sections FOR DELETE
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

-- Drop old policies on tasks
DROP POLICY IF EXISTS "Tasks deletable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks insertable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks readable by authenticated" ON public.tasks;
DROP POLICY IF EXISTS "Tasks updatable by authenticated" ON public.tasks;

CREATE POLICY "Tasks readable by workspace members"
ON public.tasks FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Tasks insertable by workspace members"
ON public.tasks FOR INSERT
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Tasks updatable by workspace members"
ON public.tasks FOR UPDATE
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Tasks deletable by workspace members"
ON public.tasks FOR DELETE
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

-- 15. Create indexes for performance
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX idx_sections_workspace ON public.sections(workspace_id);
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
