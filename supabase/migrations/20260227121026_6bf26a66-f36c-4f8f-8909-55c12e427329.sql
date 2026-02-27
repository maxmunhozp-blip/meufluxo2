-- Add recurrence fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN recurrence_type text DEFAULT NULL
CHECK (recurrence_type IS NULL OR recurrence_type IN ('daily', 'weekly', 'monthly_day', 'monthly_weekday', 'custom'));

ALTER TABLE public.tasks
ADD COLUMN recurrence_config jsonb DEFAULT NULL;