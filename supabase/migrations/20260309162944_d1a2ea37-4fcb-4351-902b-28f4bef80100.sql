
CREATE TABLE public.project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  created_by UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Documento',
  content JSONB DEFAULT '{}',
  pinned BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents readable by workspace members"
  ON public.project_documents FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Documents insertable by workspace members"
  ON public.project_documents FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Documents updatable by workspace members"
  ON public.project_documents FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Documents deletable by workspace members"
  ON public.project_documents FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_documents;
