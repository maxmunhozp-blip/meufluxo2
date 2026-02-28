
CREATE OR REPLACE FUNCTION public.generate_monthly_report(
  p_project_id UUID,
  p_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id UUID;
  v_sections JSONB := '[]'::JSONB;
  v_section RECORD;
  v_total_completed INTEGER := 0;
  v_total_tasks INTEGER := 0;
  v_project_name TEXT;
  v_whatsapp TEXT := '';
BEGIN
  SELECT name INTO v_project_name FROM projects WHERE id = p_project_id;

  FOR v_section IN
    SELECT
      s.name as section_name,
      COUNT(*) FILTER (WHERE t.status = 'done') as completed,
      COUNT(*) as total,
      ARRAY_AGG(t.title ORDER BY t.position) FILTER (WHERE t.status = 'done') as completed_items
    FROM tasks t
    JOIN sections s ON s.id = t.section_id
    WHERE t.project_id = p_project_id
      AND t.parent_task_id IS NULL
      AND t.created_at >= p_month
      AND t.created_at < p_month + INTERVAL '1 month'
    GROUP BY s.name, s.position
    ORDER BY s.position
  LOOP
    v_sections := v_sections || jsonb_build_object(
      'name', v_section.section_name,
      'tasks_completed', v_section.completed,
      'tasks_total', v_section.total,
      'items', COALESCE(to_jsonb(v_section.completed_items), '[]'::jsonb)
    );
    v_total_completed := v_total_completed + v_section.completed;
    v_total_tasks := v_total_tasks + v_section.total;

    v_whatsapp := v_whatsapp || E'\n*' || v_section.section_name || '* ✅' || E'\n';
    IF v_section.completed_items IS NOT NULL THEN
      FOR i IN 1..array_length(v_section.completed_items, 1) LOOP
        v_whatsapp := v_whatsapp || '• ' || v_section.completed_items[i] || E'\n';
      END LOOP;
    END IF;
  END LOOP;

  v_whatsapp := '📊 *Relatório Mensal — ' || v_project_name || '*' || E'\n'
    || '📅 ' || to_char(p_month, 'TMMonth YYYY') || E'\n'
    || v_whatsapp || E'\n'
    || '📈 *Resumo do mês*' || E'\n'
    || 'Total de entregas: ' || v_total_completed || E'\n'
    || 'Taxa de conclusão: ' || ROUND(v_total_completed::NUMERIC / NULLIF(v_total_tasks, 0) * 100) || '%' || E'\n'
    || E'\n_Relatório gerado por MeuFluxo_';

  INSERT INTO monthly_reports (
    project_id, workspace_id, month, title, sections,
    summary, whatsapp_text, generated_at
  )
  SELECT
    p_project_id,
    p.workspace_id,
    p_month,
    'Relatório Mensal — ' || v_project_name,
    v_sections,
    jsonb_build_object(
      'total_entregas', v_total_completed,
      'total_tarefas', v_total_tasks,
      'taxa_conclusao', ROUND(v_total_completed::NUMERIC / NULLIF(v_total_tasks, 0) * 100)
    ),
    v_whatsapp,
    now()
  FROM projects p WHERE p.id = p_project_id
  ON CONFLICT (project_id, month) DO UPDATE SET
    sections = EXCLUDED.sections,
    summary = EXCLUDED.summary,
    whatsapp_text = EXCLUDED.whatsapp_text,
    updated_at = now()
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;
