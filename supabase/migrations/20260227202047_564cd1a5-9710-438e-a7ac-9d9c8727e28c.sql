
-- Create service_tags table for user-customizable service tags
CREATE TABLE public.service_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service tags readable by workspace members"
  ON public.service_tags FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Service tags insertable by workspace members"
  ON public.service_tags FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Service tags updatable by workspace members"
  ON public.service_tags FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Service tags deletable by workspace members"
  ON public.service_tags FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- Add service_tag_id column to tasks
ALTER TABLE public.tasks ADD COLUMN service_tag_id UUID REFERENCES public.service_tags(id) ON DELETE SET NULL;

-- Enable realtime for service_tags
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_tags;
