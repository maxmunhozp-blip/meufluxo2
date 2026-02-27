
-- Fix workspaces INSERT policy: drop restrictive, create permissive
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
CREATE POLICY "Users can create workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Fix workspaces SELECT policy
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
CREATE POLICY "Users can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (is_workspace_member(auth.uid(), id) OR is_super_admin(auth.uid()));

-- Fix workspaces UPDATE policy
DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
CREATE POLICY "Owners can update workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id OR is_super_admin(auth.uid()));

-- Fix workspaces DELETE policy
DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;
CREATE POLICY "Owners can delete workspaces"
ON public.workspaces
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id OR is_super_admin(auth.uid()));

-- Fix workspace_members INSERT policy (also had a bug: wm.workspace_id = wm.workspace_id is always true)
DROP POLICY IF EXISTS "Owners/admins can add members" ON public.workspace_members;
CREATE POLICY "Owners/admins can add members"
ON public.workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  )
  OR is_super_admin(auth.uid())
);

-- Fix workspace_members SELECT policy
DROP POLICY IF EXISTS "Members can view workspace members" ON public.workspace_members;
CREATE POLICY "Members can view workspace members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- Fix workspace_members DELETE policy
DROP POLICY IF EXISTS "Owners can remove members" ON public.workspace_members;
CREATE POLICY "Owners can remove members"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'
  )
  OR is_super_admin(auth.uid())
);
