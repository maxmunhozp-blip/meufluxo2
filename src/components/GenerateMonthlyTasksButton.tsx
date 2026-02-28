import { useState, useCallback } from 'react';
import { CalendarPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateMonthlyTasksButtonProps {
  projectId: string;
  workspaceId: string;
  onTasksGenerated?: () => void;
}

export function GenerateMonthlyTasksButton({
  projectId,
  workspaceId,
  onTasksGenerated,
}: GenerateMonthlyTasksButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const monthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthName = monthNames[now.getMonth()];

      // Check existing instances
      const { data: existingInstances } = await (supabase.from('monthly_instances' as any) as any)
        .select('id, template_id')
        .eq('project_id', projectId)
        .eq('month', monthDate);

      // Load templates
      const { data: templates, error: tErr } = await (supabase.from('client_delivery_templates' as any) as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('position');

      if (tErr) throw tErr;
      if (!templates || templates.length === 0) {
        toast.error('Nenhum template ativo encontrado. Configure os templates primeiro.');
        setGenerating(false);
        return;
      }

      // Check if already generated
      if (existingInstances && existingInstances.length > 0) {
        const confirmed = window.confirm(`${monthName} já foi gerado. Gerar novamente? (As tarefas anteriores não serão removidas)`);
        if (!confirmed) {
          setGenerating(false);
          return;
        }
        // Delete old instances
        await (supabase.from('monthly_instances' as any) as any)
          .delete()
          .eq('project_id', projectId)
          .eq('month', monthDate);
      }

      // Load sections for the project
      const { data: sections } = await supabase
        .from('sections')
        .select('id, name')
        .eq('project_id', projectId)
        .order('position');

      let totalTasks = 0;

      for (const template of templates) {
        // Find matching section or use first one
        let sectionId = sections?.[0]?.id;
        const matchingSection = sections?.find(s =>
          s.name.toLowerCase().includes(template.name.toLowerCase())
        );
        if (matchingSection) sectionId = matchingSection.id;

        if (!sectionId) {
          // Create a section for this template
          const { data: newSection } = await supabase
            .from('sections')
            .insert({
              name: `${template.name} — ${monthName} ${now.getFullYear()}`,
              project_id: projectId,
              workspace_id: workspaceId,
              position: 0,
            })
            .select('id')
            .single();
          sectionId = newSection?.id;
        }

        if (!sectionId) continue;

        // Create monthly instance
        const { data: instance, error: instErr } = await (supabase.from('monthly_instances' as any) as any)
          .insert({
            template_id: template.id,
            project_id: projectId,
            workspace_id: workspaceId,
            month: monthDate,
            status: 'active',
            tasks_generated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (instErr) {
          console.error('Erro ao criar instância:', instErr);
          continue;
        }

        // Generate tasks from template
        const tasksToInsert = (template.tasks_template || []).map((t: any, idx: number) => ({
          title: t.title || 'Tarefa sem título',
          project_id: projectId,
          workspace_id: workspaceId,
          section_id: sectionId,
          position: idx,
          status: 'pending',
          priority: 'low',
          template_id: template.id,
          monthly_instance_id: instance.id,
          service_tag_id: t.tipo_trabalho || null,
        }));

        if (tasksToInsert.length > 0) {
          const { error: taskErr } = await supabase
            .from('tasks')
            .insert(tasksToInsert);

          if (taskErr) {
            console.error('Erro ao criar tarefas:', taskErr);
          } else {
            totalTasks += tasksToInsert.length;
          }
        }
      }

      toast.success(`${totalTasks} tarefas geradas para ${monthName}`);
      onTasksGenerated?.();
    } catch (err) {
      console.error('Erro ao gerar tarefas:', err);
      toast.error('Erro ao gerar tarefas do mês');
    } finally {
      setGenerating(false);
    }
  }, [projectId, workspaceId, onTasksGenerated]);

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
      style={{
        color: 'var(--accent-blue)',
        background: 'var(--accent-subtle)',
        opacity: generating ? 0.6 : 1,
        transition: 'all 150ms ease-out',
      }}
      onMouseEnter={e => { if (!generating) e.currentTarget.style.background = 'rgba(108,156,252,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(108,156,252,0.08)'; }}
    >
      <CalendarPlus className="w-3.5 h-3.5" />
      {generating ? 'Gerando...' : 'Gerar Mês'}
    </button>
  );
}
