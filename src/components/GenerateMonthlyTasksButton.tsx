import { useState, useCallback } from 'react';
import { useConfirmAction } from './ConfirmAction';
import { CalendarPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateMonthlyTasksButtonProps {
  projectId: string;
  workspaceId: string;
  activeMonth?: Date;
  onTasksGenerated?: () => void;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function GenerateMonthlyTasksButton({
  projectId,
  workspaceId,
  activeMonth,
  onTasksGenerated,
}: GenerateMonthlyTasksButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [confirmDialog, confirm] = useConfirmAction();

  const handleGenerate = useCallback(async () => {
    if (!projectId || !workspaceId) {
      toast.error('Selecione um projeto primeiro.');
      return;
    }

    setGenerating(true);
    try {
      const target = activeMonth || new Date();
      const monthDate = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-01`;
      const monthName = MONTH_NAMES[target.getMonth()];
      const yearStr = target.getFullYear();

      // Check existing instances
      const { data: existingInstances } = await supabase
        .from('monthly_instances')
        .select('id, template_id')
        .eq('project_id', projectId)
        .eq('month', monthDate);

      // Load templates
      const { data: templates, error: tErr } = await supabase
        .from('client_delivery_templates')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('position');

      if (tErr) throw tErr;
      if (!templates || templates.length === 0) {
        toast.error('Nenhum template ativo encontrado. Configure os templates primeiro (⚙️).');
        return;
      }

      // Check if already generated
      if (existingInstances && existingInstances.length > 0) {
        const confirmed = await confirm(
          'Gerar novamente?',
          `${monthName} ${yearStr} já foi gerado. As tarefas anteriores não serão removidas.`
        );
        if (!confirmed) return;
        // Delete old instances
        await supabase
          .from('monthly_instances')
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
        // Try to find a matching existing section, otherwise create one
        let sectionId: string | undefined;
        const matchingSection = sections?.find(s =>
          s.name.toLowerCase().includes(template.name.toLowerCase()) ||
          template.name.toLowerCase().includes(s.name.toLowerCase())
        );

        if (matchingSection) {
          sectionId = matchingSection.id;
        } else {
          // Create a new section for this template
          const { data: newSection, error: secErr } = await supabase
            .from('sections')
            .insert({
              name: template.name || `Seção ${template.position + 1}`,
              project_id: projectId,
              workspace_id: workspaceId,
              position: (sections?.length || 0) + template.position,
            })
            .select('id')
            .single();

          if (secErr) {
            console.error('Erro ao criar seção:', secErr);
            continue;
          }
          sectionId = newSection?.id;
          // Add to local list so next template can find it
          sections?.push({ id: sectionId!, name: template.name });
        }

        if (!sectionId) continue;

        // Create monthly instance
        const { data: instance, error: instErr } = await supabase
          .from('monthly_instances')
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
        const tasksTemplate = Array.isArray(template.tasks_template) ? template.tasks_template : [];
        const tasksToInsert = tasksTemplate.map((t: any, idx: number) => ({
          title: t.title || 'Tarefa sem título',
          project_id: projectId,
          workspace_id: workspaceId,
          section_id: sectionId,
          position: idx,
          status: 'pending' as const,
          priority: 'low' as const,
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

      if (totalTasks > 0) {
        toast.success(`✓ ${totalTasks} tarefas de ${monthName} geradas com sucesso`);
      } else {
        toast.warning('Nenhuma tarefa foi gerada. Verifique se o template possui tarefas.');
      }
      onTasksGenerated?.();
    } catch (err) {
      console.error('Erro ao gerar tarefas:', err);
      toast.error('✗ Erro ao gerar tarefas. Verifique o template.');
    } finally {
      setGenerating(false);
    }
  }, [projectId, workspaceId, activeMonth, onTasksGenerated]);

  return (
    <>
      {confirmDialog}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2"
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid var(--accent-blue)',
          color: 'var(--accent-blue)',
          background: 'transparent',
          fontSize: 14,
          fontWeight: 500,
          opacity: generating ? 0.6 : 1,
          transition: 'all 150ms ease-out',
        }}
        onMouseEnter={e => { if (!generating) e.currentTarget.style.background = 'var(--accent-subtle)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <CalendarPlus className="w-4 h-4" />
        {generating ? 'Gerando...' : 'Gerar Mês'}
      </button>
    </>
  );
}
