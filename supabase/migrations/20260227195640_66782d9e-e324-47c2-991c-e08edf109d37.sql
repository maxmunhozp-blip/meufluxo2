
-- Create plan enum
CREATE TYPE public.workspace_plan AS ENUM ('free', 'pro');

-- Add plan column to workspaces
ALTER TABLE public.workspaces
ADD COLUMN plan public.workspace_plan NOT NULL DEFAULT 'free';
