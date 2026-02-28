
-- Templates de entregas recorrentes
CREATE TABLE public.client_delivery_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  recurrence TEXT DEFAULT 'monthly',
  tasks_template JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_project ON client_delivery_templates(project_id);

ALTER TABLE public.client_delivery_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates readable by workspace members" ON public.client_delivery_templates
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Templates insertable by workspace members" ON public.client_delivery_templates
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Templates updatable by workspace members" ON public.client_delivery_templates
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Templates deletable by workspace members" ON public.client_delivery_templates
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_client_delivery_templates_updated_at
  BEFORE UPDATE ON public.client_delivery_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Instâncias mensais
CREATE TABLE public.monthly_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES client_delivery_templates(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  status TEXT DEFAULT 'active',
  tasks_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_id, month)
);

CREATE INDEX idx_instances_project_month ON monthly_instances(project_id, month);

ALTER TABLE public.monthly_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instances readable by workspace members" ON public.monthly_instances
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Instances insertable by workspace members" ON public.monthly_instances
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Instances updatable by workspace members" ON public.monthly_instances
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Instances deletable by workspace members" ON public.monthly_instances
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

-- Relatórios mensais
CREATE TABLE public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  title TEXT,
  sections JSONB NOT NULL DEFAULT '[]',
  summary JSONB,
  whatsapp_text TEXT,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, month)
);

CREATE INDEX idx_reports_project ON monthly_reports(project_id);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports readable by workspace members" ON public.monthly_reports
  FOR SELECT USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Reports insertable by workspace members" ON public.monthly_reports
  FOR INSERT WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Reports updatable by workspace members" ON public.monthly_reports
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Reports deletable by workspace members" ON public.monthly_reports
  FOR DELETE USING (is_workspace_member(auth.uid(), workspace_id) OR is_super_admin(auth.uid()));

CREATE TRIGGER update_monthly_reports_updated_at
  BEFORE UPDATE ON public.monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
