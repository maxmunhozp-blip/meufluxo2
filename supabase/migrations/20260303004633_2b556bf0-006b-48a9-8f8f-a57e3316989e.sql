
-- Add is_fixed column to sections
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS is_fixed boolean NOT NULL DEFAULT false;

-- Add depth column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS depth integer NOT NULL DEFAULT 0;

-- Add check constraint for depth (use trigger instead of CHECK for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_depth_range'
  ) THEN
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_depth_range CHECK (depth >= 0 AND depth <= 3);
  END IF;
END $$;

-- Set section_type default
ALTER TABLE public.sections ALTER COLUMN section_type SET DEFAULT 'custom';

-- Migrate existing data: mark Entrada sections as inbox/fixed
UPDATE public.sections SET section_type = 'inbox', is_fixed = true WHERE name = 'Entrada' AND (section_type IS NULL OR section_type = 'custom');

-- Update depth for existing tasks based on parent hierarchy
-- Level 0: no parent
UPDATE public.tasks SET depth = 0 WHERE parent_task_id IS NULL AND depth != 0;

-- Level 1: parent has no parent
UPDATE public.tasks t SET depth = 1
FROM public.tasks p
WHERE t.parent_task_id = p.id AND p.parent_task_id IS NULL AND t.depth != 1;

-- Level 2: grandparent has no parent
UPDATE public.tasks t SET depth = 2
FROM public.tasks p
JOIN public.tasks gp ON p.parent_task_id = gp.id
WHERE t.parent_task_id = p.id AND gp.parent_task_id IS NULL AND t.depth != 2;
