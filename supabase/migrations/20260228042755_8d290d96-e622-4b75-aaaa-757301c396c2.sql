
-- Add template tracking columns to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES client_delivery_templates(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS monthly_instance_id UUID REFERENCES monthly_instances(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tasks_template ON tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_monthly_instance ON tasks(monthly_instance_id);
