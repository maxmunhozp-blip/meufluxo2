import { useState, useEffect, useCallback, useRef } from 'react';
import { LoadingLogo } from '@/components/LoadingLogo';
import {
  X, Plus, GripVertical, Trash2, ChevronDown, ChevronRight, Package,
  Inbox, Repeat, MapPin, CheckCircle, Folder,
  // Marketing & Project Management icons
  Megaphone, PenTool, Image, Video, FileText, Mail, MessageSquare,
  Share2, BarChart3, Target, Zap, Globe, Search, Palette,
  Layout, Type, Camera, Film, Mic, Radio, Newspaper,
  // Project Management
  ClipboardList, Calendar, Clock, Users, Settings, Flag,
  Star, Heart, Bookmark, Tag, Filter, Layers, Grid3X3,
  // Business & Strategy
  TrendingUp, PieChart, DollarSign, ShoppingCart, Briefcase,
  Award, Rocket, Lightbulb, Eye, ThumbsUp,
  // Content & Media
  Edit3, Hash, AtSign, Link, Paperclip, Upload, Download,
  Monitor, Smartphone, Printer, Send,
  // Communication
  Phone, Bell, Volume2, Music,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ServiceTag } from '@/types/task';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
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
  icon: string;
  position: number;
  is_active: boolean;
  is_fixed: boolean;
  tasks_template: TemplateTask[];
}

/* ── Icon Catalog ── */
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Inbox, Repeat, MapPin, CheckCircle, Folder,
  Megaphone, PenTool, Image, Video, FileText, Mail, MessageSquare,
  Share2, BarChart3, Target, Zap, Globe, Search, Palette,
  Layout, Type, Camera, Film, Mic, Radio, Newspaper,
  ClipboardList, Calendar, Clock, Users, Settings, Flag,
  Star, Heart, Bookmark, Tag, Filter, Layers, Grid3X3,
  TrendingUp, PieChart, DollarSign, ShoppingCart, Briefcase,
  Award, Rocket, Lightbulb, Eye, ThumbsUp,
  Edit3, Hash, AtSign, Link, Paperclip, Upload, Download,
  Monitor, Smartphone, Printer, Send,
  Phone, Bell, Volume2, Music, Package, Plus, X,
};

const ICON_CATEGORIES = [
  {
    label: 'Marketing',
    icon: 'Megaphone',
    icons: ['Megaphone', 'Target', 'TrendingUp', 'BarChart3', 'PieChart', 'Share2', 'Globe', 'Search', 'Eye', 'ThumbsUp', 'Zap', 'Rocket'],
  },
  {
    label: 'Criação',
    icon: 'PenTool',
    icons: ['PenTool', 'Palette', 'Image', 'Camera', 'Video', 'Film', 'Type', 'Layout', 'Edit3', 'Mic', 'Music', 'Newspaper'],
  },
  {
    label: 'Comunicação',
    icon: 'MessageSquare',
    icons: ['MessageSquare', 'Mail', 'Send', 'Phone', 'Bell', 'Volume2', 'Radio', 'AtSign', 'Hash', 'Link'],
  },
  {
    label: 'Gestão',
    icon: 'ClipboardList',
    icons: ['ClipboardList', 'Calendar', 'Clock', 'Users', 'Flag', 'Filter', 'Layers', 'Grid3X3', 'Settings', 'Briefcase'],
  },
  {
    label: 'Conteúdo',
    icon: 'FileText',
    icons: ['FileText', 'Paperclip', 'Upload', 'Download', 'Monitor', 'Smartphone', 'Printer', 'Tag', 'Bookmark'],
  },
  {
    label: 'Favoritos',
    icon: 'Star',
    icons: ['Star', 'Heart', 'Award', 'Lightbulb', 'DollarSign', 'ShoppingCart', 'Package', 'Folder', 'Inbox', 'Repeat', 'MapPin', 'CheckCircle'],
  },
];

const FIXED_SECTIONS: Omit<TemplateSection, 'id'>[] = [
  { name: 'Entrada', icon: 'Inbox', position: 0, is_active: true, is_fixed: true, tasks_template: [] },
  { name: 'Recorrente', icon: 'Repeat', position: 1, is_active: true, is_fixed: true, tasks_template: [] },
  { name: 'Pontual', icon: 'MapPin', position: 2, is_active: true, is_fixed: true, tasks_template: [] },
  { name: 'Concluído', icon: 'CheckCircle', position: 3, is_active: true, is_fixed: true, tasks_template: [] },
];

/* ── Icon Picker Popover ── */
function IconPickerPopover({
  currentIcon,
  onSelect,
  onClose,
}: {
  currentIcon: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeCategory, setActiveCategory] = useState(ICON_CATEGORIES[0].label);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const scrollToCategory = (label: string) => {
    setActiveCategory(label);
    categoryRefs.current[label]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      ref={ref}
      className="absolute z-[250] rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.15))',
        width: 280,
        top: '100%',
        left: 0,
        marginTop: 4,
      }}
    >
      {/* Category quick nav */}
      <div className="flex items-center gap-1 px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {ICON_CATEGORIES.map(cat => {
          const CatIcon = ICON_MAP[cat.icon] || Folder;
          return (
            <button
              key={cat.label}
              onClick={() => scrollToCategory(cat.label)}
              title={cat.label}
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{
                color: activeCategory === cat.label ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                background: activeCategory === cat.label ? 'var(--accent-subtle)' : 'transparent',
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={e => {
                if (activeCategory !== cat.label) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (activeCategory !== cat.label) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }
              }}
            >
              <CatIcon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Icon grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 260, padding: '8px 12px' }}>
        {ICON_CATEGORIES.map(cat => (
          <div
            key={cat.label}
            ref={el => { categoryRefs.current[cat.label] = el; }}
          >
            <p className="text-[11px] font-medium mb-2 mt-2" style={{ color: 'var(--text-tertiary)' }}>{cat.label}</p>
            <div className="grid grid-cols-6 gap-1 mb-2">
              {cat.icons.map(iconName => {
                const Icon = ICON_MAP[iconName] || Folder;
                const isSelected = currentIcon === iconName;
                return (
                  <button
                    key={iconName}
                    onClick={() => { onSelect(iconName); onClose(); }}
                    className="w-9 h-9 flex items-center justify-center rounded-lg"
                    style={{
                      color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      transition: 'all 100ms ease-out',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                    title={iconName}
                  >
                    <Icon className="w-4 h-4" style={{ opacity: 0.7 }} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sortable Task Row ── */
function SortableTemplateTask({
  task, sectionIndex, taskIndex, serviceTags, onUpdate, onDelete,
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
  section, sIdx, expanded, serviceTags,
  onToggle, onUpdateSection, onDeleteSection,
  onUpdateTask, onDeleteTask, onAddTask, onReorderTasks, onChangeIcon,
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
  onChangeIcon: (sIdx: number, icon: string) => void;
}) {
  const id = `section-${sIdx}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [showIconPicker, setShowIconPicker] = useState(false);

  const taskSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const taskIds = section.tasks_template.map((_, i) => `task-${sIdx}-${i}`);

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = taskIds.indexOf(active.id as string);
    const newIndex = taskIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) onReorderTasks(sIdx, oldIndex, newIndex);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const SectionIcon = ICON_MAP[section.icon] || Folder;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 8 }}
    >
      {/* Section Header — matching project layout */}
      <div className="flex items-center gap-2 px-3" style={{ height: 44 }}>
        <button {...attributes} {...listeners} className="w-5 h-5 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--text-placeholder)' }} />
        </button>

        {/* Icon — fixed sections show icon but no picker */}
        <div className="relative">
          {section.is_fixed ? (
            <div className="w-7 h-7 flex items-center justify-center rounded-md" style={{ color: 'var(--text-secondary)' }}>
              <SectionIcon className="w-4 h-4" style={{ opacity: 0.7 }} />
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-7 h-7 flex items-center justify-center rounded-md"
                style={{ color: 'var(--text-secondary)', transition: 'all 150ms ease-out' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                title="Trocar ícone"
              >
                <SectionIcon className="w-4 h-4" style={{ opacity: 0.7 }} />
              </button>
              {showIconPicker && (
                <IconPickerPopover
                  currentIcon={section.icon}
                  onSelect={(icon) => onChangeIcon(sIdx, icon)}
                  onClose={() => setShowIconPicker(false)}
                />
              )}
            </>
          )}
        </div>

        <button onClick={() => onToggle(sIdx)} className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
            : <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          }
        </button>

        {section.is_fixed ? (
          <span className="flex-1 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            {section.name}
          </span>
        ) : (
          <input
            value={section.name}
            onChange={e => onUpdateSection(sIdx, 'name', e.target.value)}
            placeholder="Nome da seção"
            className="flex-1 bg-transparent text-[14px] font-semibold outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        )}

        <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-placeholder)' }}>
          {section.tasks_template.length || ''}
        </span>

        {!section.is_fixed && (
          <button
            onClick={() => onDeleteSection(sIdx)}
            className="w-7 h-7 flex items-center justify-center rounded"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Section Tasks */}
      {expanded && (
        <div className="px-3 py-2" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)' }}>
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
  projectId, workspaceId, projectName, serviceTags, onClose,
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
        // Build loaded sections, enforcing correct icons for fixed ones
        const loaded: TemplateSection[] = data.map((t: any) => {
          const fixed = isFixedSection(t.name);
          return {
            id: t.id,
            name: t.name,
            icon: fixed ? getDefaultIcon(t.name) : (t.recurrence && t.recurrence !== 'monthly' ? t.recurrence : 'Folder'),
            position: t.position,
            is_active: t.is_active,
            is_fixed: fixed,
            tasks_template: t.tasks_template || [],
          };
        });

        // Ensure all 4 fixed sections exist (add missing ones)
        const existingFixedNames = new Set(loaded.filter(s => s.is_fixed).map(s => s.name.toLowerCase()));
        const missing = FIXED_SECTIONS.filter(fs => !existingFixedNames.has(fs.name.toLowerCase()));
        if (missing.length > 0) {
          // Insert missing fixed sections at the beginning
          const combined = [...missing.map(s => ({ ...s })), ...loaded];
          // Re-sort: fixed first by their standard order, then custom
          combined.sort((a, b) => {
            if (a.is_fixed && b.is_fixed) return getFixedOrder(a.name) - getFixedOrder(b.name);
            if (a.is_fixed) return -1;
            if (b.is_fixed) return 1;
            return a.position - b.position;
          });
          setTemplates(combined);
          const expanded: Record<number, boolean> = {};
          combined.forEach((_: any, i: number) => { expanded[i] = true; });
          setExpandedSections(expanded);
        } else {
          setTemplates(loaded);
          const expanded: Record<number, boolean> = {};
          loaded.forEach((_: any, i: number) => { expanded[i] = true; });
          setExpandedSections(expanded);
        }
      } else {
        // Pre-populate with 4 fixed sections
        setTemplates(FIXED_SECTIONS.map(s => ({ ...s })));
        const expanded: Record<number, boolean> = {};
        FIXED_SECTIONS.forEach((_, i) => { expanded[i] = true; });
        setExpandedSections(expanded);
      }

      setLoading(false);
    };
    load();
  }, [projectId]);

  const addSection = () => {
    const newSection: TemplateSection = {
      name: '',
      icon: 'Folder',
      position: templates.length,
      is_active: true,
      is_fixed: false,
      tasks_template: [],
    };
    setTemplates(prev => [...prev, newSection]);
    setExpandedSections(prev => ({ ...prev, [templates.length]: true }));
  };

  const updateSection = (index: number, field: keyof TemplateSection, value: any) => {
    // Prevent renaming a custom section to a fixed section name
    if (field === 'name' && typeof value === 'string' && isFixedSection(value)) {
      toast.error('Esse nome é reservado para seções fixas');
      return;
    }
    setTemplates(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const deleteSection = (index: number) => {
    setTemplates(prev => prev.filter((_, i) => i !== index));
  };

  const changeIcon = (index: number, icon: string) => {
    // Don't allow changing icons of fixed sections
    setTemplates(prev => prev.map((t, i) => {
      if (i !== index || t.is_fixed) return t;
      return { ...t, icon };
    }));
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
          recurrence: t.icon, // Store icon in recurrence field for now
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
              Templates {projectName}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-4"
          style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}
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
                      onChangeIcon={changeIcon}
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

/* ── Helpers ── */
const FIXED_ORDER: Record<string, number> = {
  entrada: 0, recorrente: 1, pontual: 2, 'concluído': 3, concluido: 3,
};

function getFixedOrder(name: string): number {
  return FIXED_ORDER[name.toLowerCase()] ?? 99;
}

function getDefaultIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('entrada') || lower.includes('inbox')) return 'Inbox';
  if (lower.includes('recorrente') || lower.includes('recurring')) return 'Repeat';
  if (lower.includes('pontual') || lower.includes('one_time')) return 'MapPin';
  if (lower.includes('conclu')) return 'CheckCircle';
  return 'Folder';
}

function isFixedSection(name: string): boolean {
  const lower = name.toLowerCase();
  return ['entrada', 'recorrente', 'pontual', 'concluído', 'concluido'].some(f => lower.includes(f));
}
