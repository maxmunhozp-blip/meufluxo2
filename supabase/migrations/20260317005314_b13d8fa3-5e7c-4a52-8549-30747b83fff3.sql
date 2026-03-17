
-- Document versions table for history
CREATE TABLE public.document_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookup by document
CREATE INDEX idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON public.document_versions(document_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Versions readable by workspace members"
  ON public.document_versions FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Versions insertable by workspace members"
  ON public.document_versions FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Versions deletable by workspace members"
  ON public.document_versions FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- Function to auto-cleanup old versions (keep last 30 per document)
CREATE OR REPLACE FUNCTION public.cleanup_old_document_versions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.document_versions
  WHERE id IN (
    SELECT id FROM public.document_versions
    WHERE document_id = NEW.document_id
    ORDER BY created_at DESC
    OFFSET 30
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_document_versions
  AFTER INSERT ON public.document_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_document_versions();
