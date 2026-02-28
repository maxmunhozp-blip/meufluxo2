
-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content JSONB DEFAULT '[]'::jsonb,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Notes readable by workspace members"
ON public.notes FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Notes insertable by workspace members"
ON public.notes FOR INSERT
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = created_by);

CREATE POLICY "Notes updatable by workspace members"
ON public.notes FOR UPDATE
USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Notes deletable by creator"
ON public.notes FOR DELETE
USING (auth.uid() = created_by OR is_super_admin(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for project queries
CREATE INDEX idx_notes_project_id ON public.notes(project_id);
CREATE INDEX idx_notes_workspace_id ON public.notes(workspace_id);

-- Storage bucket for note images
INSERT INTO storage.buckets (id, name, public) VALUES ('notes-images', 'notes-images', true);

-- Storage policies
CREATE POLICY "Note images readable by all"
ON storage.objects FOR SELECT
USING (bucket_id = 'notes-images');

CREATE POLICY "Note images uploadable by authenticated"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'notes-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Note images deletable by uploader"
ON storage.objects FOR DELETE
USING (bucket_id = 'notes-images' AND auth.uid()::text = (storage.foldername(name))[1]);
