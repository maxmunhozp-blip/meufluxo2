import { useState, useEffect, useCallback } from 'react';
import { X, Plus, GripVertical, Trash2, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ServiceTag } from '@/types/task';
import { toast } from 'sonner';

interface TemplateTask {
  title: string;
  tipo_trabalho: string;
  position: number;
}

interface TemplateSection {
  id?: string;
  name: string;
  position: number;
  recurrence: string;
  is_active: boolean;
  tasks_template: TemplateTask[];
}

interface DeliveryTemplateModalProps {
  projectId: string;
  workspaceId: string;
  projectName: string;
  serviceTags: ServiceTag[];
  onClose: () => void;
}

export function DeliveryTemplateModal({
  projectId,
  workspaceId,
  projectName,
  serviceTags,
  onClose,
}: DeliveryTemplateModalProps) {
  const [templates, setTemplates] = useState<TemplateSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  // Load existing templates
  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase.from('client_delivery_templates' as any) as any)
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (error) {
        console.error('Erro ao carregar templates:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setTemplates(data.map((t: any) => ({
          id: t.id,
          name: t.name,
          position: t.position,
          recurrence: t.recurrence,
          is_active: t.is_active,
          tasks_template: t.tasks_template || [],
        })));
        // Expand all sections by default
        const expanded: Record<number, boolean> = {};
        data.forEach((_: any, i: number) => { expanded[i] = true; });
        setExpandedSections(expanded);
      }

      setLoading(false);
    };
    load();
  }, [projectId]);

  const addSection = () => {
    const newSection: TemplateSection = {
      name: '',
      position: templates.length,
      recurrence: 'monthly',
      is_active: true,
      tasks_template: [],
    };
    setTemplates(prev => [...prev, newSection]);
    setExpandedSections(prev => ({ ...prev, [templates.length]: true }));
  };

  const updateSection = (index: number, field: keyof TemplateSection, value: any) => {
    setTemplates(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const deleteSection = (index: number) => {
    setTemplates(prev => prev.filter((_, i) => i !== index));
  };

  const addTask = (sectionIndex: number) => {
    setTemplates(prev => prev.map((t, i) => {
      if (i !== sectionIndex) return t;
      return {
        ...t,
        tasks_template: [...t.tasks_template, {
          title: '',
          tipo_trabalho: '',
          position: t.tasks_template.length,
        }],
      };
    }));
  };

  const updateTask = (sectionIndex: number, taskIndex: number, field: keyof TemplateTask, value: any) => {
    setTemplates(prev => prev.map((t, i) => {
      if (i !== sectionIndex) return t;
      return {
        ...t,
        tasks_template: t.tasks_template.map((task, j) =>
          j === taskIndex ? { ...task, [field]: value } : task
        ),
      };
    }));
  };

  const deleteTask = (sectionIndex: number, taskIndex: number) => {
    setTemplates(prev => prev.map((t, i) => {
      if (i !== sectionIndex) return t;
      return {
        ...t,
        tasks_template: t.tasks_template.filter((_, j) => j !== taskIndex),
      };
    }));
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Delete existing templates for this project
      await (supabase.from('client_delivery_templates' as any) as any)
        .delete()
        .eq('project_id', projectId);

      // Insert new templates
      if (templates.length > 0) {
        const rows = templates.map((t, i) => ({
          project_id: projectId,
          workspace_id: workspaceId,
          name: t.name || `Seção ${i + 1}`,
          position: i,
          recurrence: t.recurrence,
          is_active: t.is_active,
          tasks_template: t.tasks_template.map((task, j) => ({
            ...task,
            position: j,
          })),
        }));

        const { error } = await (supabase.from('client_delivery_templates' as any) as any)
          .insert(rows);

        if (error) throw error;
      }

      toast.success('Template salvo com sucesso');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar template:', err);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  }, [templates, projectId, workspaceId, onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: '#0D0D0D', border: '1px solid #2A2A2A' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 flex-shrink-0" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: '#6C9CFC' }} />
            <h2 className="text-[16px] font-semibold" style={{ color: '#E5E5E5' }}>
              Template de Entregas — {projectName}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: '#8888A0' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p style={{ color: '#8888A0', fontSize: 14 }}>Carregando...</p>
            </div>
          ) : (
            <>
              {templates.map((section, sIdx) => (
                <div
                  key={sIdx}
                  className="rounded-lg overflow-hidden"
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}
                >
                  {/* Section Header */}
                  <div className="flex items-center gap-2 px-3 h-11" style={{ borderBottom: expandedSections[sIdx] ? '1px solid #2A2A2A' : 'none' }}>
                    <button
                      onClick={() => toggleSection(sIdx)}
                      className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                    >
                      {expandedSections[sIdx]
                        ? <ChevronDown className="w-3.5 h-3.5" style={{ color: '#8888A0' }} />
                        : <ChevronRight className="w-3.5 h-3.5" style={{ color: '#8888A0' }} />
                      }
                    </button>
                    <input
                      value={section.name}
                      onChange={e => updateSection(sIdx, 'name', e.target.value)}
                      placeholder="Nome da seção (ex: Redes Sociais)"
                      className="flex-1 bg-transparent text-[14px] font-medium outline-none"
                      style={{ color: '#E5E5E5' }}
                    />
                    <select
                      value={section.recurrence}
                      onChange={e => updateSection(sIdx, 'recurrence', e.target.value)}
                      className="text-[12px] rounded px-2 py-1 outline-none"
                      style={{ background: '#0D0D0D', color: '#8888A0', border: '1px solid #2A2A2A' }}
                    >
                      <option value="monthly">Mensal</option>
                      <option value="biweekly">Quinzenal</option>
                      <option value="weekly">Semanal</option>
                    </select>
                    <span className="text-[12px] tabular-nums" style={{ color: '#555570' }}>
                      {section.tasks_template.length}
                    </span>
                    <button
                      onClick={() => deleteSection(sIdx)}
                      className="w-7 h-7 flex items-center justify-center rounded"
                      style={{ color: '#8888A0' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#F59E0B'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Section Tasks */}
                  {expandedSections[sIdx] && (
                    <div className="px-3 py-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {section.tasks_template.map((task, tIdx) => (
                        <div
                          key={tIdx}
                          className="flex items-center gap-2 group"
                          style={{ paddingLeft: 8 }}
                        >
                          <GripVertical className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100" style={{ color: '#555570', transition: 'opacity 150ms ease-out' }} />
                          <input
                            value={task.title}
                            onChange={e => updateTask(sIdx, tIdx, 'title', e.target.value)}
                            placeholder="Título da tarefa"
                            className="flex-1 bg-transparent text-[13px] outline-none"
                            style={{ color: '#E5E5E5', height: 32 }}
                          />
                          <select
                            value={task.tipo_trabalho}
                            onChange={e => updateTask(sIdx, tIdx, 'tipo_trabalho', e.target.value)}
                            className="text-[12px] rounded px-2 py-1 outline-none max-w-[140px]"
                            style={{ background: '#0D0D0D', color: '#8888A0', border: '1px solid #2A2A2A' }}
                          >
                            <option value="">Tipo de trabalho</option>
                            {serviceTags.map(tag => (
                              <option key={tag.id} value={tag.id}>{tag.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => deleteTask(sIdx, tIdx)}
                            className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100"
                            style={{ color: '#8888A0', transition: 'opacity 150ms ease-out' }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addTask(sIdx)}
                        className="flex items-center gap-1.5 text-[12px] px-2 py-1.5 rounded"
                        style={{ color: '#6C9CFC' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(108,156,252,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar tarefa
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addSection}
                className="flex items-center gap-2 text-[13px] px-3 py-2.5 rounded-lg w-full justify-center"
                style={{ color: '#8888A0', border: '1px dashed #2A2A2A' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = '#E5E5E5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8888A0'; }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar seção
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 h-14 flex-shrink-0" style={{ borderTop: '1px solid #2A2A2A' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] rounded-lg"
            style={{ color: '#8888A0' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] rounded-lg font-medium"
            style={{
              background: '#3B82F6',
              color: '#fff',
              opacity: saving ? 0.6 : 1,
              transition: 'opacity 150ms ease-out',
            }}
          >
            {saving ? 'Salvando...' : 'Salvar Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
