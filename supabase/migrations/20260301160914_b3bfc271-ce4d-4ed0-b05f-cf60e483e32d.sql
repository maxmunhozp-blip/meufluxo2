
-- Add display_month column to tasks: the permanent month a task belongs to
ALTER TABLE public.tasks ADD COLUMN display_month date;

-- Backfill: use scheduled_date first, then due_date, then created_at
UPDATE public.tasks SET display_month = date_trunc('month', COALESCE(scheduled_date, due_date, created_at::date))::date;

-- Make it NOT NULL with a default of the current month
ALTER TABLE public.tasks ALTER COLUMN display_month SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN display_month SET DEFAULT (date_trunc('month', CURRENT_DATE))::date;

-- Index for fast month filtering
CREATE INDEX idx_tasks_display_month ON public.tasks (display_month);
