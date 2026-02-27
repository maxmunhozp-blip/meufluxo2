-- Add position column to projects table for drag-and-drop ordering
ALTER TABLE public.projects ADD COLUMN position integer NOT NULL DEFAULT 0;

-- Set initial positions based on created_at order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY workspace_id ORDER BY created_at) - 1 AS pos
  FROM public.projects
)
UPDATE public.projects SET position = ranked.pos FROM ranked WHERE public.projects.id = ranked.id;