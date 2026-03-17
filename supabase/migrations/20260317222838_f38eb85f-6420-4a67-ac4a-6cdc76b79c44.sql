-- Create document_attachments table
CREATE TABLE public.document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  content_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doc attachments readable by workspace members"
  ON public.document_attachments FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Doc attachments insertable by workspace members"
  ON public.document_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Doc attachments deletable by author"
  ON public.document_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for document attachments (100MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('document-attachments', 'document-attachments', true, 104857600);

-- Storage RLS policies
CREATE POLICY "Doc attachments upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'document-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Doc attachments read" ON storage.objects FOR SELECT
  USING (bucket_id = 'document-attachments');

CREATE POLICY "Doc attachments delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'document-attachments' AND auth.uid() IS NOT NULL);