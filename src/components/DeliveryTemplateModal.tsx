import { useState, useEffect, useCallback } from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';
import { X, Plus, GripVertical, Trash2, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ServiceTag } from '@/types/task';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

/* ── Sortable Task Row ── */
function SortableTemplateTask({
  task,
  sectionIndex,
  taskIndex,
  serviceTags,
  onUpdate,
  onDelete,
}: {
  task: TemplateTask;
  sectionIndex: number;
  taskIndex: number;
  serviceTags: ServiceTag[];
  onUpdate: (sIdx: number, tIdx: number, field: keyof TemplateTask, value: any) => void;
  onDelete: (sIdx: number, tIdx: number) => void;
}) {
  const id = `task-${sectionIndex}-${taskIndex}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingLeft: 8,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      <button {...attributes} {...listeners} className="w-5 h-5 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="w-3 h-3" style={{ color: 'var(--text-placeholder)' }} />
      </button>
      <input
        value={task.title}
        onChange={e => onUpdate(sectionIndex, taskIndex, 'title', e.target.value)}
        placeholder="Título da tarefa"
        className="flex-1 bg-transparent text-[13px] outline-none"
        style={{ color: 'var(--text-primary)', height: 32 }}
      />
      <select
        value={task.tipo_trabalho}
        onChange={e => onUpdate(sectionIndex, taskIndex, 'tipo_trabalho', e.target.value)}
        className="text-[12px] rounded px-2 py-1 outline-none max-w-[140px]"
        style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <option value="">Tipo de trabalho</option>
        {serviceTags.map(tag => (
          <option key={tag.id} value={tag.id}>{tag.name}</option>
        ))}
      </select>
      <button
        onClick={() => onDelete(sectionIndex, taskIndex)}
        className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100"
        style={{ color: 'var(--text-secondary)', transition: 'opacity 150ms ease-out' }}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ── Sortable Section ── */
function SortableTemplateSection({
  section,
  sIdx,
  expanded,
  serviceTags,
  onToggle,
  onUpdateSection,
  onDeleteSection,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onReorderTasks,
}: {
  section: TemplateSection;
  sIdx: number;
  expanded: boolean;
  serviceTags: ServiceTag[];
  onToggle: (i: number) => void;
  onUpdateSection: (i: number, field: keyof TemplateSection, value: any) => void;
  onDeleteSection: (i: number) => void;
  onUpdateTask: (sIdx: number, tIdx: number, field: keyof TemplateTask, value: any) => void;
  onDeleteTask: (sIdx: number, tIdx: number) => void;
  onAddTask: (sIdx: number) => void;
  onReorderTasks: (sIdx: number, oldIndex: number, newIndex: number) => void;
}) {
  const id = `section-${sIdx}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const taskSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const taskIds = section.tasks_template.map((_, i) => `task-${sIdx}-${i}`);

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = taskIds.indexOf(active.id as string);
    const newIndex = taskIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderTasks(sIdx, oldIndex, newIndex);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      className="rounded-lg overflow-hidden"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3 h-11" style={{ borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none' }}>
        <button {...attributes} {...listeners} className="w-5 h-5 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--text-placeholder)' }} />
        </button>
        <button onClick={() => onToggle(sIdx)} className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
            : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          }
        </button>
        <input
          value={section.name}
          onChange={e => onUpdateSection(sIdx, 'name', e.target.value)}
          placeholder="Nome da seção (ex: Redes Sociais)"
          className="flex-1 bg-transparent text-[14px] font-medium outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <select
          value={section.recurrence}
          onChange={e => onUpdateSection(sIdx, 'recurrence', e.target.value)}
          className="text-[12px] rounded px-2 py-1 outline-none"
          style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          <option value="monthly">Mensal</option>
          <option value="biweekly">Quinzenal</option>
          <option value="weekly">Semanal</option>
        </select>
        <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-placeholder)' }}>
          {section.tasks_template.length}
        </span>
        <button
          onClick={() => onDeleteSection(sIdx)}
          className="w-7 h-7 flex items-center justify-center rounded"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Section Tasks */}
      {expanded && (
        <div className="px-3 py-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <DndContext sensors={taskSensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {section.tasks_template.map((task, tIdx) => (
                <SortableTemplateTask
                  key={`task-${sIdx}-${tIdx}`}
                  task={task}
                  sectionIndex={sIdx}
                  taskIndex={tIdx}
                  serviceTags={serviceTags}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            onClick={() => onAddTask(sIdx)}
            className="flex items-center gap-1.5 text-[12px] px-2 py-1.5 rounded"
            style={{ color: 'var(--accent-blue)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-blue-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Plus className="w-3 h-3" />
            Adicionar tarefa
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Modal ── */
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

  const sectionSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const sectionIds = templates.map((_, i) => `section-${i}`);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('client_delivery_templates')
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
        tasks_template: [...t.tasks_template, { title: '', tipo_trabalho: '', position: t.tasks_template.length }],
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
      return { ...t, tasks_template: t.tasks_template.filter((_, j) => j !== taskIndex) };
    }));
  };

  const reorderTasks = (sectionIndex: number, oldIndex: number, newIndex: number) => {
    setTemplates(prev => prev.map((t, i) => {
      if (i !== sectionIndex) return t;
      return { ...t, tasks_template: arrayMove(t.tasks_template, oldIndex, newIndex) };
    }));
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sectionIds.indexOf(active.id as string);
    const newIndex = sectionIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      setTemplates(prev => arrayMove(prev, oldIndex, newIndex));
      // Remap expanded state
      setExpandedSections(prev => {
        const keys = Object.keys(prev).map(Number);
        const reordered = arrayMove(keys.map(k => prev[k]), oldIndex, newIndex);
        const next: Record<number, boolean> = {};
        reordered.forEach((v, i) => { next[i] = v; });
        return next;
      });
    }
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await supabase
        .from('client_delivery_templates')
        .delete()
        .eq('project_id', projectId);

      if (templates.length > 0) {
        const rows = templates.map((t, i) => ({
          project_id: projectId,
          workspace_id: workspaceId,
          name: t.name || `Seção ${i + 1}`,
          position: i,
          recurrence: t.recurrence,
          is_active: t.is_active,
          tasks_template: t.tasks_template.map((task, j) => ({ ...task, position: j })),
        }));

        const { error } = await supabase
          .from('client_delivery_templates')
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
      <div className="absolute inset-0" style={{ background: 'var(--overlay-bg)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-2xl flex flex-col rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          maxHeight: 'min(90vh, 100dvh - 32px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Template de Entregas — {projectName}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-4"
          style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingLogo size={32} />
            </div>
          ) : (
            <>
              <DndContext sensors={sectionSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
                <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                  {templates.map((section, sIdx) => (
                    <SortableTemplateSection
                      key={`section-${sIdx}`}
                      section={section}
                      sIdx={sIdx}
                      expanded={!!expandedSections[sIdx]}
                      serviceTags={serviceTags}
                      onToggle={toggleSection}
                      onUpdateSection={updateSection}
                      onDeleteSection={deleteSection}
                      onUpdateTask={updateTask}
                      onDeleteTask={deleteTask}
                      onAddTask={addTask}
                      onReorderTasks={reorderTasks}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              <button
                onClick={addSection}
                className="flex items-center gap-2 text-[13px] px-3 py-2.5 rounded-lg w-full justify-center"
                style={{ color: 'var(--text-secondary)', border: '1px dashed var(--border-subtle)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar seção
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 h-14 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={onClose} className="px-4 py-2 text-[13px] rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] rounded-lg font-medium"
            style={{
              background: 'var(--btn-primary)',
              color: 'var(--btn-text)',
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
