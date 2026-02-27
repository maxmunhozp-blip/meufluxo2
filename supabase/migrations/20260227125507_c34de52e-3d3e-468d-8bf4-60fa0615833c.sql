-- Add rollover tracking columns to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS rollover_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_due_date date;

-- Enable extensions needed for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;