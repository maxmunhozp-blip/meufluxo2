
-- Fix comments RLS: scope to workspace via task
DROP POLICY IF EXISTS "Comments readable by authenticated" ON public.comments;
DROP POLICY IF EXISTS "Comments insertable by authenticated" ON public.comments;
DROP POLICY IF EXISTS "Comments updatable by own" ON public.comments;
DROP POLICY IF EXISTS "Comments deletable by own" ON public.comments;

CREATE POLICY "Comments readable by workspace members"
ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (public.is_workspace_member(auth.uid(), t.workspace_id) OR public.is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Comments insertable by workspace members"
ON public.comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND public.is_workspace_member(auth.uid(), t.workspace_id)
  )
);

CREATE POLICY "Comments updatable by author"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Comments deletable by author"
ON public.comments FOR DELETE
USING (auth.uid() = user_id);

-- Fix task_members RLS
DROP POLICY IF EXISTS "Task members readable by authenticated" ON public.task_members;
DROP POLICY IF EXISTS "Task members insertable by authenticated" ON public.task_members;
DROP POLICY IF EXISTS "Task members deletable by authenticated" ON public.task_members;

CREATE POLICY "Task members readable by workspace"
ON public.task_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (public.is_workspace_member(auth.uid(), t.workspace_id) OR public.is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Task members insertable by workspace"
ON public.task_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND public.is_workspace_member(auth.uid(), t.workspace_id)
  )
);

CREATE POLICY "Task members deletable by workspace"
ON public.task_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (public.is_workspace_member(auth.uid(), t.workspace_id) OR public.is_super_admin(auth.uid()))
  )
);

-- Fix task_attachments RLS
DROP POLICY IF EXISTS "Attachments readable by authenticated" ON public.task_attachments;
DROP POLICY IF EXISTS "Attachments insertable by authenticated" ON public.task_attachments;
DROP POLICY IF EXISTS "Attachments deletable by own" ON public.task_attachments;

CREATE POLICY "Attachments readable by workspace"
ON public.task_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (public.is_workspace_member(auth.uid(), t.workspace_id) OR public.is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Attachments insertable by workspace members"
ON public.task_attachments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND public.is_workspace_member(auth.uid(), t.workspace_id)
  )
);

CREATE POLICY "Attachments deletable by author"
ON public.task_attachments FOR DELETE
USING (auth.uid() = user_id);

-- Fix activity_log RLS
DROP POLICY IF EXISTS "Activity log readable by authenticated" ON public.activity_log;
DROP POLICY IF EXISTS "Activity log insertable by authenticated" ON public.activity_log;

CREATE POLICY "Activity log readable by workspace"
ON public.activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
    AND (public.is_workspace_member(auth.uid(), t.workspace_id) OR public.is_super_admin(auth.uid()))
  )
  OR task_id IS NULL
);

CREATE POLICY "Activity log insertable by authenticated"
ON public.activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);
