
-- Table for shareable invite links
CREATE TABLE public.workspace_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  used_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Owners/admins can create invite links
CREATE POLICY "Invite links creatable by workspace owners/admins"
ON public.workspace_invites FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_invites.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

-- Workspace members can view invite links
CREATE POLICY "Invite links readable by workspace members"
ON public.workspace_invites FOR SELECT
USING (
  is_workspace_member(auth.uid(), workspace_id)
  OR is_super_admin(auth.uid())
);

-- Anyone authenticated can read by invite_code (for accepting)
CREATE POLICY "Invite links readable by code for authenticated"
ON public.workspace_invites FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Owners/admins can delete invite links
CREATE POLICY "Invite links deletable by workspace owners/admins"
ON public.workspace_invites FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_invites.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
);

-- Allow update (mark as used) by authenticated users
CREATE POLICY "Invite links updatable by authenticated"
ON public.workspace_invites FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast lookup by code
CREATE INDEX idx_workspace_invites_code ON public.workspace_invites(invite_code);
