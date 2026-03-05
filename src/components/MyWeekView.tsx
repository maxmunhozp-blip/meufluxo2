import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  addDays, addMonths, format, isToday, isBefore, startOfDay, parseISO, subDays, differenceInCalendarDays,
  startOfWeek, startOfMonth, setMonth, setYear, getMonth, getYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, pointerWithin, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, Play, BarChart3, Repeat, ChevronDown, List, X } from 'lucide-react';
import { Task, TaskStatus, Project, Section, Subtask } from '@/types/task';
import { WeekTimelineView } from './WeekTimelineView';
import { ProBadge } from '@/components/ProBadge';
import { DropIndicatorLine } from '@/components/DropIndicatorLine';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

interface MyWeekViewProps {
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  onUpdateTask: (task: Task) => void;
  onBatchUpdatePositions?: (updates: { id: string; position: number }[]) => Promise<void>;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onScheduleSubtask?: (subtaskId: string, scheduledDate: string | null) => Promise<void>;
  selectedTaskId?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
  onViewModeChange?: (mode: 'columns' | 'timeline') => void;
}

type ViewMode = '3days' | 'week' | 'timeline';

const DAY_LABELS_UPPER = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

// ── Task card in day column — 2-line anatomy: context + title ──
function WeekTaskCard({
  task,
  projectColor,
  projectName,
  isSelected,
  onSelect,
  truncate,
  isRolledOverOrigin,
  sectionName,
  parentTaskName,
  dropIndicator,
  justDropped,
}: {
  task: Task;
  projectColor: string;
  projectName?: string;
  isSelected: boolean;
  onSelect: () => void;
  truncate?: boolean;
  isRolledOverOrigin?: boolean;
  sectionName?: string;
  parentTaskName?: string;
  dropIndicator?: 'top' | 'bottom' | null;
  justDropped?: boolean;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id, data: { type: 'week-task', task } });

  const isDone = task.status === 'done' || sectionName?.toLowerCase().includes('conclu');

  // Build context line: ● ProjectName · SectionName (or · ParentTaskName)
  const contextParts: string[] = [];
  if (sectionName) contextParts.push(sectionName);
  if (parentTaskName) contextParts.push(parentTaskName);
  const contextSuffix = contextParts.join(' · ');

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition || 'transform 150ms ease',
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : undefined,
        position: 'relative',
        animation: justDropped ? 'drop-pulse 400ms cubic-bezier(0.22,1,0.36,1)' : undefined,
      }}
      layout
      layoutId={`week-card-${task.id}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.3 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
      className="group cursor-pointer"
      data-sortable-id={task.id}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      {dropIndicator === 'top' && <DropIndicatorLine position="top" />}
      {dropIndicator === 'bottom' && <DropIndicatorLine position="bottom" />}
      <motion.div
        className={`rounded-md px-2.5 py-2 flex flex-col gap-0.5 ${isSelected ? 'ring-1' : ''}`}
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: isSelected
            ? '0 0 0 1px var(--border-interactive), 0 1px 3px rgba(0,0,0,0.08)'
            : '0 1px 2px rgba(0,0,0,0.06)',
        }}
        whileHover={{
          y: -1,
          boxShadow: isSelected
            ? '0 0 0 1px var(--border-interactive), 0 4px 12px rgba(0,0,0,0.12)'
            : '0 4px 12px rgba(0,0,0,0.1)',
          transition: { duration: 0.15 },
        }}
        whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
      >
        {/* Line 1: Context — ● Project · Section (hidden for done tasks) */}
        {!isDone && (
          <span className="truncate flex items-center gap-1" style={{ fontSize: 10, color: 'var(--text-placeholder)', fontWeight: 400, lineHeight: 1.3 }}>
            <span
              className="flex-shrink-0 rounded-full"
              style={{ width: 6, height: 6, background: projectColor, opacity: 0.4 }}
            />
            {projectName && <span>{projectName}</span>}
            {projectName && contextSuffix && <span>·</span>}
            {contextSuffix && <span className="truncate">{contextSuffix}</span>}
          </span>
        )}

        {/* Line 2: Task title */}
        <span
          className={`text-[12px] leading-[1.4] block ${isDone || isRolledOverOrigin ? 'opacity-40' : ''} ${truncate ? 'truncate' : 'line-clamp-2'}`}
          style={{ color: 'var(--text-primary)', fontWeight: 400 }}
        >
          {task.name}
        </span>
      </motion.div>
    </motion.div>
  );
}

// ── Droppable day column ──
function DayColumn({
  dayDate,
  tasks,
  allTasks,
  projects,
  sections,
  isCurrentDay,
  isDragOver,
  onSelectTask,
  selectedTaskId,
  truncateText,
  overItemId,
  dropLinePosition,
  justDroppedId,
}: {
  dayDate: Date;
  tasks: Task[];
  allTasks: Task[];
  projects: Project[];
  sections: Section[];
  isCurrentDay: boolean;
  isDragOver: boolean;
  onSelectTask: (t: Task) => void;
  selectedTaskId?: string;
  truncateText?: boolean;
  overItemId?: string | null;
  dropLinePosition?: 'top' | 'bottom' | null;
  justDroppedId?: string | null;
}) {
  const dateStr = format(dayDate, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'day-drop', date: dateStr },
  });

  const highlight = isDragOver || isOver;
  const dayOfWeek = (dayDate.getDay() + 6) % 7; // Mon=0
  const dayLabel = DAY_LABELS_UPPER[dayOfWeek];
  const dayNumber = format(dayDate, 'd');

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col flex-1 min-w-0 transition-colors"
      style={{
        background: highlight ? 'var(--accent-subtle)' : 'transparent',
        borderTop: highlight ? '1px dashed var(--accent-blue)' : undefined,
        borderBottom: highlight ? '1px dashed var(--accent-blue)' : undefined,
        borderLeft: highlight ? '1px dashed var(--accent-blue)' : undefined,
        borderRight: highlight ? '1px dashed var(--accent-blue)' : '1px solid var(--border-subtle)',
      }}
    >
      {/* Column header */}
      <div className="flex flex-col items-center justify-center py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: isCurrentDay ? 'var(--accent-blue)' : 'var(--text-secondary)',
          textTransform: 'uppercase' as const,
          letterSpacing: 0.5,
        }}>
          {isCurrentDay ? 'HOJE' : dayLabel}
        </span>
        <span style={{
          fontSize: 18,
          fontWeight: 600,
          color: isCurrentDay ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}>
          {dayNumber}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-1.5 space-y-1 overflow-y-auto min-h-[80px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <LayoutGroup id={`day-${dateStr}`}>
            <AnimatePresence mode="popLayout">
              {tasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                // Check if this task is shown on a past day but was rolled over to today
                const taskDate = task.scheduledDate || task.dueDate;
                const isRolledOverOrigin = !isCurrentDay && task.status !== 'done' && !!taskDate && taskDate === dateStr && isBefore(dayDate, startOfDay(new Date()));
                return (
                  <WeekTaskCard
                    key={task.id}
                    task={task}
                    projectColor={project?.color || 'var(--accent-blue)'}
                    projectName={project?.name}
                    isSelected={selectedTaskId === task.id}
                    onSelect={() => onSelectTask(task)}
                    truncate={truncateText}
                    isRolledOverOrigin={isRolledOverOrigin}
                    sectionName={sections.find(s => s.id === task.section)?.title}
                    parentTaskName={task.parentTaskId ? allTasks.find(t => t.id === task.parentTaskId)?.name : undefined}
                    dropIndicator={overItemId === task.id ? dropLinePosition : null}
                    justDropped={justDroppedId === task.id}
                  />
                );
              })}
            </AnimatePresence>
          </LayoutGroup>
        </SortableContext>

        {/* Drop zone hint when empty and dragging */}
        {tasks.length === 0 && highlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-16 rounded-md border border-dashed"
            style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', fontSize: 11 }}
          >
            Solte aqui
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Master List sidebar ──
function WeekSourceSidebar({
  projects,
  sections,
  tasks,
  collapsed,
  onToggle,
}: {
  projects: Project[];
  sections: Section[];
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('meufluxo_masterlist_projects');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Per-project month offsets (0 = current month)
  const [projectMonthOffsets, setProjectMonthOffsets] = useState<Record<string, number>>({});

  const getProjectMonth = (projectId: string) => {
    const offset = projectMonthOffsets[projectId] || 0;
    return format(startOfMonth(addMonths(new Date(), offset)), 'yyyy-MM-01');
  };

  const changeProjectMonth = (projectId: string, delta: number) => {
    setProjectMonthOffsets(prev => ({ ...prev, [projectId]: (prev[projectId] || 0) + delta }));
  };

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('meufluxo_masterlist_projects', JSON.stringify(next));
      return next;
    });
  };

  const [searchQuery, setSearchQuery] = useState('');

  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done' && !t.parentTaskId && !t.scheduledDate), [tasks]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return pendingTasks;
    const q = searchQuery.toLowerCase();
    return pendingTasks.filter(t => t.name.toLowerCase().includes(q));
  }, [pendingTasks, searchQuery]);

  const groupedData = useMemo(() => {
    return projects.map(project => {
      const projectMonth = getProjectMonth(project.id);
      const projectTasks = filteredTasks.filter(t => {
        if (t.projectId !== project.id) return false;
        // Filter by display_month if the task has one
        if (t.displayMonth && t.displayMonth !== projectMonth) return false;
        return true;
      });
      const projectSections = sections.filter(s => {
        if (s.projectId !== project.id) return false;
        if (s.displayMonth && s.displayMonth !== projectMonth) return false;
        return true;
      });
      const sectionGroups = projectSections
        .map(s => ({
          section: s,
          tasks: projectTasks.filter(t => t.section === s.id),
        }))
        .filter(g => g.tasks.length > 0);
      return { project, totalCount: projectTasks.length, sectionGroups, month: projectMonth };
    });
  }, [projects, filteredTasks, sections, projectMonthOffsets]);

  const totalPending = filteredTasks.length;

  const { setNodeRef: masterListDropRef, isOver: isMasterListOver } = useDroppable({
    id: 'master-list-drop',
    data: { type: 'master-list-drop' },
  });

  // Hint persistence
  const [hintDismissed, setHintDismissed] = useState(() => {
    try { return localStorage.getItem('meufluxo_drag_hint_seen') === 'true'; } catch { return false; }
  });

  if (collapsed) {
    return (
      <div className="hidden md:flex w-10 flex-shrink-0 flex-col items-center pt-3 gap-2" style={{ background: 'var(--accent-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
        <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {totalPending > 0 && (
          <span className="text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center" style={{ color: 'var(--accent-blue)', background: 'var(--accent-subtle)' }}>
            {totalPending}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={masterListDropRef}
      className="hidden md:flex w-[280px] flex-shrink-0 flex-col transition-colors duration-200"
      style={{
        background: isMasterListOver ? 'var(--accent-subtle)' : 'var(--bg-surface)',
        borderRight: isMasterListOver ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Master List</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--accent-blue)', background: 'var(--accent-subtle)', borderRadius: 10, padding: '1px 7px' }}>
              {totalPending}
            </span>
          </div>
          <button onClick={onToggle} className="w-6 h-6 flex items-center justify-center rounded transition-colors" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar tarefa..."
          className="w-full h-7 px-2.5 text-[12px] bg-transparent rounded-md border focus:outline-none transition-colors"
          style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}
        />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto py-1">
        {groupedData.map(({ project, totalCount, sectionGroups, month }) => {
          const expanded = expandedProjects[project.id] !== false;
          const monthOffset = projectMonthOffsets[project.id] || 0;
          const monthLabel = format(parseISO(month), 'MMM yyyy', { locale: ptBR });
          const isCurrentMonth = monthOffset === 0;

          return (
            <div key={project.id} className="mb-1">
              {/* Project header — neutral text + small color dot */}
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full h-8 px-3 flex items-center gap-2 transition-colors"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: project.color }} />
                <Play className={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }} className="truncate flex-1 text-left">
                  {project.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{totalCount}</span>
              </button>

              {/* Month navigator — discrete, below project name */}
              {expanded && (
                <div className="flex items-center justify-center gap-1 px-3 pb-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); changeProjectMonth(project.id, -1); }}
                    className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                    style={{ color: 'var(--text-placeholder)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)'; }}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <span style={{
                    fontSize: 10,
                    color: isCurrentMonth ? 'var(--text-tertiary)' : 'var(--accent-blue)',
                    fontWeight: isCurrentMonth ? 400 : 500,
                    minWidth: 60,
                    textAlign: 'center' as const,
                    textTransform: 'capitalize' as const,
                  }}>
                    {monthLabel}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); changeProjectMonth(project.id, 1); }}
                    className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                    style={{ color: 'var(--text-placeholder)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)'; }}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {expanded && (
                <div>
                  {sectionGroups.length === 0 && (
                    <div className="px-5 py-3 text-center">
                      <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>
                        Nenhuma tarefa pendente neste mês
                      </span>
                    </div>
                  )}
                  {sectionGroups.map(({ section, tasks: sectionTasks }) => (
                    <div key={section.id}>
                      {sectionGroups.length > 1 && (
                        <div className="px-5 py-1">
                          <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                            {section.title}
                          </span>
                        </div>
                      )}
                      {sectionTasks.map(task => {
                        const subtasks = (task.subtasks || []).filter(st => st.status !== 'done' && !st.scheduledDate);
                        return (
                          <SourceTaskItem key={task.id} task={task} projectColor={project.color} subtasks={subtasks} />
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {groupedData.length === 0 && (
          <div className="px-3 py-8 text-center">
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {searchQuery ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa pendente'}
            </span>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!hintDismissed && totalPending > 0 && (
        <div className="px-3 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {isMasterListOver ? '← Solte para desagendar' : 'Arraste tarefas para agendar na semana'}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Master List mobile overlay ──
function MasterListOverlay({
  projects, sections, tasks, onClose,
}: {
  projects: Project[];
  sections: Section[];
  tasks: Task[];
  onClose: () => void;
}) {
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done' && !t.parentTaskId && !t.scheduledDate), [tasks]);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const toggleProject = (id: string) => setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));

  const groupedData = useMemo(() => {
    return projects.map(project => {
      const projectTasks = pendingTasks.filter(t => t.projectId === project.id);
      const sectionGroups = sections
        .filter(s => s.projectId === project.id)
        .map(s => ({ section: s, tasks: projectTasks.filter(t => t.section === s.id) }))
        .filter(g => g.tasks.length > 0);
      return { project, totalCount: projectTasks.length, sectionGroups };
    }).filter(g => g.totalCount > 0);
  }, [projects, pendingTasks, sections]);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'var(--overlay-bg)' }} onClick={onClose} />
      <div
        className="fixed left-0 top-0 bottom-0 z-50 w-[300px] flex flex-col animate-slide-in-left"
        style={{ background: 'var(--bg-surface)', boxShadow: '4px 0 16px rgba(0,0,0,0.3)' }}
      >
        <div className="h-12 px-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Master List</span>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {groupedData.map(({ project, sectionGroups }) => {
            const expanded = expandedProjects[project.id] !== false;
            return (
              <div key={project.id} className="mb-1">
                <button onClick={() => toggleProject(project.id)} className="w-full h-8 px-4 flex items-center gap-2">
                  <Play className={`w-2.5 h-2.5 transition-transform ${expanded ? 'rotate-90' : ''}`} style={{ color: project.color, fill: project.color }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: project.color, letterSpacing: 0.3 }} className="truncate flex-1 text-left">{project.name}</span>
                </button>
                {expanded && sectionGroups.map(({ section, tasks: sTasks }) => (
                  <div key={section.id} className="pl-6">
                    {sTasks.map(t => (
                      <div key={t.id} className="h-8 flex items-center px-2" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                        {t.name}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Source task item (draggable, no checkbox) ──
function SourceTaskItem({ task, projectColor, subtasks = [] }: { task: Task; projectColor: string; subtasks?: Subtask[] }) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: `source-${task.id}`,
    data: { type: 'source-task', task },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    outline: isDragging ? '1px dashed var(--accent-blue)' : 'none',
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-1.5 h-[32px] px-4 mx-1 rounded-md cursor-grab active:cursor-grabbing transition-colors"
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {subtasks.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`} />
          </button>
        ) : (
          <div className="w-3.5 flex-shrink-0" />
        )}
        <span style={{ fontSize: 13, color: 'var(--text-primary)' }} className="truncate flex-1">{task.name}</span>
      </div>
      {expanded && subtasks.length > 0 && (
        <div className="ml-4">
          {subtasks.map(st => (
            <SourceSubtaskItem key={st.id} subtask={st} task={task} projectColor={projectColor} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Source subtask item ──
function SourceSubtaskItem({ subtask, task, projectColor }: { subtask: Subtask; task: Task; projectColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const nestedSubs = (subtask.subtasks || []).filter(s => s.status !== 'done');
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: `source-sub-${subtask.id}`,
    data: { type: 'source-subtask', subtask, parentTask: task, projectColor },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
    outline: isDragging ? '1px dashed var(--accent-blue)' : 'none',
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-1.5 h-[28px] px-2.5 mx-1 rounded-md cursor-grab active:cursor-grabbing transition-colors"
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {nestedSubs.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-3 h-3 flex items-center justify-center flex-shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`} />
          </button>
        ) : (
          <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: `${projectColor}80` }} />
        )}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }} className="truncate flex-1">{subtask.name}</span>
      </div>
      {expanded && nestedSubs.length > 0 && (
        <div className="ml-4">
          {nestedSubs.map(ss => (
            <SourceSubtaskItem key={ss.id} subtask={ss} task={task} projectColor={projectColor} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main MyWeekView ──
export function MyWeekView({
  tasks,
  projects,
  sections,
  onUpdateTask,
  onBatchUpdatePositions,
  onStatusChange,
  onSelectTask,
  onScheduleSubtask,
  selectedTaskId,
  isPro,
  onUpgrade,
  onViewModeChange,
}: MyWeekViewProps) {
  const [dayOffset, setDayOffset] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('meufluxo_masterlist_collapsed') === 'true'; } catch { return false; }
  });
  const toggleSidebar = () => setSidebarCollapsed(prev => {
    const next = !prev;
    localStorage.setItem('meufluxo_masterlist_collapsed', String(next));
    return next;
  });
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragSubtask, setActiveDragSubtask] = useState<{ subtask: Subtask; projectColor: string } | null>(null);
  const [overItemId, setOverItemId] = useState<string | null>(null);
  const [dropLinePosition, setDropLinePosition] = useState<'top' | 'bottom' | null>(null);
  const [mobileOverlay, setMobileOverlay] = useState(false);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const pointerYRef = useRef(0);
  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('meufluxo_week_view') as ViewMode;
      if (saved === 'timeline' || saved === 'week') return saved;
      return '3days';
    } catch { return '3days'; }
  });

  // Window width for responsive
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1400);
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Force 3days if narrow
  const effectiveView = windowWidth < 1200 && viewMode === 'week' ? '3days' : viewMode;

  const toggleViewMode = (mode: ViewMode) => {
    if (mode === 'timeline' && !isPro) {
      onUpgrade?.();
      return;
    }
    setViewMode(mode);
    localStorage.setItem('meufluxo_week_view', mode);
    onViewModeChange?.(mode === 'timeline' ? 'timeline' : 'columns');
  };

  // Notify parent on mount with initial mode
  useEffect(() => {
    onViewModeChange?.(effectiveView === 'timeline' ? 'timeline' : 'columns');
  }, [effectiveView]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Calculate visible dates
  const visibleDates = useMemo(() => {
    const today = startOfDay(new Date());
    if (effectiveView === '3days') {
      const base = addDays(today, dayOffset);
      return Array.from({ length: 3 }, (_, i) => addDays(base, i));
    } else {
      // Week view: Mon–Sun
      const weekStart = startOfWeek(addDays(today, dayOffset * 7), { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
  }, [dayOffset, effectiveView]);

  // Full week dates for timeline — always respects dayOffset
  const weekDatesForTimeline = useMemo(() => {
    const today = new Date();
    const multiplier = effectiveView === '3days' ? 1 : 7;
    const weekStart = startOfWeek(addDays(today, dayOffset * multiplier), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [dayOffset, effectiveView]);

  // Date range label
  const dateRangeLabel = useMemo(() => {
    const first = visibleDates[0];
    const monthName = format(first, 'MMMM', { locale: ptBR });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }, [visibleDates]);

  // Is "today" visible?
  const todayVisible = useMemo(() => {
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    return visibleDates.some(d => format(d, 'yyyy-MM-dd') === todayStr);
  }, [visibleDates]);

  // Tasks grouped by day
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const todayStart = startOfDay(new Date());

    visibleDates.forEach(d => {
      map[format(d, 'yyyy-MM-dd')] = [];
    });

    tasks.forEach(t => {
      if (t.parentTaskId) return;
      const dateKey = t.scheduledDate || t.dueDate;
      if (!dateKey) return;
      if (map[dateKey] !== undefined) {
        map[dateKey].push(t);
      }
    });

    // Scheduled subtasks
    tasks.forEach(t => {
      if (t.parentTaskId) return;
      const collectSubs = (subs: Subtask[], parent: Task) => {
        for (let i = 0; i < subs.length; i++) {
          const sub = subs[i];
          const dateKey = sub.scheduledDate || sub.dueDate;
          if (dateKey && map[dateKey] !== undefined) {
            const pseudo: Task = {
              id: sub.id, name: sub.name, status: sub.status,
              priority: sub.priority || 'low', description: sub.description,
              dueDate: sub.dueDate, scheduledDate: sub.scheduledDate,
              section: sub.section, projectId: sub.projectId || parent.projectId,
              parentTaskId: sub.parentTaskId, members: sub.members, subtasks: sub.subtasks,
              position: (sub as any).position != null ? (sub as any).position : (parent.position ?? 0) * 100 + i,
            };
            if (!map[dateKey].some(e => e.id === sub.id)) map[dateKey].push(pseudo);
          }
          if (sub.subtasks) collectSubs(sub.subtasks, parent);
        }
      };
      collectSubs(t.subtasks || [], t);
    });

    // Rollover overdue to today
    const todayKey = format(todayStart, 'yyyy-MM-dd');
    if (map[todayKey] !== undefined) {
      const rollover: Task[] = [];
      visibleDates.forEach(d => {
        const key = format(d, 'yyyy-MM-dd');
        if (isBefore(d, todayStart)) {
          (map[key] || []).filter(t => t.status !== 'done').forEach(t => {
            if (!map[todayKey].some(e => e.id === t.id)) rollover.push(t);
          });
        }
      });
      map[todayKey] = [...rollover, ...map[todayKey]];
    }

    // Sort each day by position for persistent ordering
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });

    return map;
  }, [tasks, visibleDates]);

  // Helper: get the effective display date of a task (considering rollover to today)
  const getEffectiveDate = useCallback((task: Task): string | undefined => {
    const dateKey = task.scheduledDate || task.dueDate;
    if (!dateKey) return undefined;
    const todayKey = format(startOfDay(new Date()), 'yyyy-MM-dd');
    // If the task appears in today's column (rollover), treat it as today
    if (tasksByDay[todayKey]?.some(t => t.id === task.id)) return todayKey;
    return dateKey;
  }, [tasksByDay]);

  // Pending count for mobile FAB
  const pendingCount = useMemo(() => tasks.filter(t => t.status !== 'done' && !t.parentTaskId && !t.scheduledDate).length, [tasks]);

  // Navigation handlers
  const navigateBack = () => {
    if (effectiveView === '3days') setDayOffset(p => p - 3);
    else setDayOffset(p => p - 1);
  };
  const navigateForward = () => {
    if (effectiveView === '3days') setDayOffset(p => p + 3);
    else setDayOffset(p => p + 1);
  };
  const goToToday = () => setDayOffset(0);

  const navigateToMonth = (monthIndex: number) => {
    const today = new Date();
    const target = startOfMonth(setMonth(today, monthIndex));
    const diff = differenceInCalendarDays(target, startOfDay(today));
    setDayOffset(diff);
    setMonthPopoverOpen(false);
  };

  const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => {
    const name = format(setMonth(new Date(), i), 'MMMM', { locale: ptBR });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'week-task' || data?.type === 'source-task') {
      setActiveDragId(data.task.id);
      setActiveDragSubtask(null);
      // Mark hint as seen
      localStorage.setItem('meufluxo_drag_hint_seen', 'true');
    } else if (data?.type === 'source-subtask') {
      setActiveDragId(null);
      setActiveDragSubtask({ subtask: data.subtask as Subtask, projectColor: data.projectColor as string });
      localStorage.setItem('meufluxo_drag_hint_seen', 'true');
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (over?.data.current?.type === 'day-drop') {
      setDragOverDay(over.data.current.date);
      setOverItemId(null);
      setDropLinePosition(null);
    } else if (over?.data.current?.type === 'week-task') {
      const overTask = over.data.current.task as Task;
      const effectiveOverDate = getEffectiveDate(overTask);
      
      // Determine top/bottom based on pointer Y vs element midpoint
      const getDropSide = (): 'top' | 'bottom' => {
        const el = document.querySelector(`[data-sortable-id="${over.id}"]`) as HTMLElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          return pointerYRef.current < midY ? 'top' : 'bottom';
        }
        return 'bottom';
      };

      if (active.data.current?.type === 'week-task') {
        const activeTask = active.data.current.task as Task;
        const effectiveActiveDate = getEffectiveDate(activeTask);
        const dayTasks = effectiveOverDate ? (tasksByDay[effectiveOverDate] || []) : [];
        const activeIdx = dayTasks.findIndex(t => t.id === activeTask.id);
        const overIdx = dayTasks.findIndex(t => t.id === overTask.id);
        
        setOverItemId(over.id as string);
        if (effectiveActiveDate !== effectiveOverDate || activeIdx === -1) {
          // Cross-day: use pointer position to determine top/bottom
          setDropLinePosition(getDropSide());
        } else {
          setDropLinePosition(activeIdx < overIdx ? 'bottom' : 'top');
        }
      } else {
        setOverItemId(over.id as string);
        setDropLinePosition(getDropSide());
      }
      setDragOverDay(effectiveOverDate || null);
    } else {
      setDragOverDay(null);
      setOverItemId(null);
      setDropLinePosition(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const droppedId = activeDragId;
    const lastDropLine = dropLinePosition; // capture before clearing
    setDragOverDay(null);
    setActiveDragId(null);
    setActiveDragSubtask(null);
    setOverItemId(null);
    setDropLinePosition(null);
    const { active, over } = event;
    if (!over) return;
    if (droppedId) { setJustDroppedId(droppedId); setTimeout(() => setJustDroppedId(null), 450); }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'source-subtask' && overData?.type === 'day-drop') {
      const subtask = activeData.subtask as Subtask;
      onScheduleSubtask?.(subtask.id, overData.date as string);
      return;
    }
    if (activeData?.type === 'source-task' && overData?.type === 'day-drop') {
      const task = activeData.task as Task;
      onUpdateTask({ ...task, scheduledDate: overData.date as string });
      return;
    }
    if (activeData?.type === 'week-task' && overData?.type === 'day-drop') {
      const task = activeData.task as Task;
      const targetDate = overData.date as string;
      if (task.scheduledDate !== targetDate) {
        if (task.parentTaskId) {
          onScheduleSubtask?.(task.id, targetDate);
        } else {
          onUpdateTask({ ...task, scheduledDate: targetDate });
        }
      }
      return;
    }
    // Dropping a week-task on another week-task — same day = reorder, different day = move
    if (activeData?.type === 'week-task' && overData?.type === 'week-task') {
      const draggedTask = activeData.task as Task;
      const targetTask = overData.task as Task;
      const effectiveDraggedDate = getEffectiveDate(draggedTask);
      const effectiveTargetDate = getEffectiveDate(targetTask);

      // Same display column → reorder with position persistence
      if (effectiveDraggedDate && effectiveTargetDate && effectiveDraggedDate === effectiveTargetDate) {
        const dayTasks = [...(tasksByDay[effectiveTargetDate] || [])];
        const oldIdx = dayTasks.findIndex(t => t.id === draggedTask.id);
        const newIdx = dayTasks.findIndex(t => t.id === targetTask.id);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const reordered = arrayMove(dayTasks, oldIdx, newIdx);
          const updates = reordered.map((t, i) => ({ id: t.id, position: i }));
          // Also update the scheduledDate for rolled-over tasks so they stick to today
          const todayKey = format(startOfDay(new Date()), 'yyyy-MM-dd');
          if (effectiveTargetDate === todayKey) {
            reordered.forEach((t, i) => {
              const taskDate = t.scheduledDate || t.dueDate;
              if (taskDate && taskDate !== todayKey && t.status !== 'done') {
                onUpdateTask({ ...t, scheduledDate: todayKey, position: i });
              }
            });
          }
          if (onBatchUpdatePositions) {
            onBatchUpdatePositions(updates);
          } else {
            reordered.forEach((t, i) => onUpdateTask({ ...t, position: i }));
          }
        }
        return;
      }

      // Different day → move to target day at the specific position
      if (effectiveTargetDate) {
        const targetDayTasks = tasksByDay[effectiveTargetDate] || [];
        const targetIdx = targetDayTasks.findIndex(t => t.id === targetTask.id);
        // Use lastDropLine to determine insert before or after the target
        const insertPosition = targetIdx !== -1
          ? (lastDropLine === 'top' ? targetIdx : targetIdx + 1)
          : targetDayTasks.length;
        
        // Shift positions of existing tasks to make room
        const updates: { id: string; position: number }[] = [];
        targetDayTasks.forEach((t, i) => {
          const newPos = i >= insertPosition ? i + 1 : i;
          if (newPos !== i) updates.push({ id: t.id, position: newPos });
        });
        updates.push({ id: draggedTask.id, position: insertPosition });
        
        if (draggedTask.parentTaskId) {
          onScheduleSubtask?.(draggedTask.id, effectiveTargetDate);
        } else {
          onUpdateTask({ ...draggedTask, scheduledDate: effectiveTargetDate, position: insertPosition });
        }
        if (onBatchUpdatePositions && updates.length > 1) {
          onBatchUpdatePositions(updates);
        }
      }
      return;
    }
    // Dropping a source-task on a week-task — schedule to that task's day
    if (activeData?.type === 'source-task' && overData?.type === 'week-task') {
      const task = activeData.task as Task;
      const targetTask = overData.task as Task;
      const targetDate = targetTask.scheduledDate || targetTask.dueDate;
      if (targetDate) {
        onUpdateTask({ ...task, scheduledDate: targetDate });
      }
      return;
    }
    if (activeData?.type === 'week-task' && overData?.type === 'master-list-drop') {
      const task = activeData.task as Task;
      if (task.parentTaskId) {
        onScheduleSubtask?.(task.id, null);
      } else {
        onUpdateTask({ ...task, scheduledDate: undefined });
      }
      return;
    }
  };

  // Find drag task — search top-level tasks first, then subtask pseudo-tasks in day columns
  const activeDragTask = useMemo(() => {
    if (!activeDragId) return null;
    const topLevel = tasks.find(t => t.id === activeDragId);
    if (topLevel) return topLevel;
    // Search in tasksByDay (subtask pseudo-tasks)
    for (const dayTasks of Object.values(tasksByDay)) {
      const found = dayTasks.find(t => t.id === activeDragId);
      if (found) return found;
    }
    return null;
  }, [activeDragId, tasks, tasksByDay]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'hsl(var(--bg-app))' }}>
      {/* Header */}
      <div className="px-3 md:px-4 flex items-center justify-between flex-shrink-0" style={{ paddingTop: 28, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)' }} className="whitespace-nowrap">
          Minha Semana
        </h1>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Hoje button */}
          <button
            onClick={goToToday}
            className="h-7 px-3 text-[12px] rounded-md transition-colors"
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              color: todayVisible ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: todayVisible ? 'var(--bg-elevated)' : 'transparent',
            }}
            onMouseEnter={e => {
              if (!todayVisible) { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--text-primary)'; }
            }}
            onMouseLeave={e => {
              if (!todayVisible) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }
            }}
          >
            Hoje
          </button>

          {/* Month nav: < Março > */}
          <button onClick={navigateBack} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <Popover open={monthPopoverOpen} onOpenChange={setMonthPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="hidden md:inline text-[13px] font-bold px-1 rounded transition-colors cursor-pointer min-w-[70px] text-center"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {dateRangeLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="center">
              <div className="grid grid-cols-3 gap-1">
                {MONTH_NAMES.map((name, i) => {
                  const currentMonth = getMonth(visibleDates[0]);
                  return (
                    <button
                      key={i}
                      onClick={() => navigateToMonth(i)}
                      className="px-2 py-1.5 text-[12px] rounded-md transition-colors text-center"
                      style={{
                        background: i === currentMonth ? 'var(--accent-blue)' : 'transparent',
                        color: i === currentMonth ? 'var(--bg-base)' : 'var(--text-secondary)',
                        fontWeight: i === currentMonth ? 600 : 400,
                      }}
                      onMouseEnter={e => { if (i !== currentMonth) { e.currentTarget.style.background = 'var(--bg-hover)'; } }}
                      onMouseLeave={e => { if (i !== currentMonth) { e.currentTarget.style.background = 'transparent'; } }}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <button onClick={navigateForward} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* View toggle */}
          <div className="ml-1 md:ml-3 flex items-center rounded-md overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => toggleViewMode('3days')}
              className="px-2 md:px-2.5 h-7 text-[11px] font-medium transition-colors"
              style={{
                background: effectiveView === '3days' ? 'var(--accent-blue)' : 'transparent',
                color: effectiveView === '3days' ? 'var(--bg-base)' : 'var(--text-secondary)',
              }}
            >
              3 Dias
            </button>
            {windowWidth >= 1200 && (
              <button
                onClick={() => toggleViewMode('week')}
                className="px-2 md:px-2.5 h-7 text-[11px] font-medium transition-colors"
                style={{
                  background: effectiveView === 'week' ? 'var(--accent-blue)' : 'transparent',
                  color: effectiveView === 'week' ? 'var(--bg-base)' : 'var(--text-secondary)',
                }}
              >
                Semana
              </button>
            )}
            <button
              onClick={() => toggleViewMode('timeline')}
              className="flex items-center gap-1 px-2 md:px-2.5 h-7 text-[11px] font-medium transition-colors"
              style={{
                background: effectiveView === 'timeline' ? 'var(--accent-blue)' : 'transparent',
                color: effectiveView === 'timeline' ? 'var(--bg-base)' : 'var(--text-secondary)',
              }}
            >
              <span>7 Dias</span>
              {!isPro && <ProBadge className="ml-1" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden" onPointerMove={(e) => { pointerYRef.current = e.clientY; }}>
        {/* Master List sidebar — shared across all views */}
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <WeekSourceSidebar
            projects={projects}
            sections={sections}
            tasks={tasks}
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
          />

          <div className="flex-1 relative overflow-hidden">
            {/* Columns view (3days or week) */}
            <div
              className={`absolute inset-0 flex transition-opacity duration-200 ${
                effectiveView !== 'timeline' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <div className="flex-1 flex overflow-x-auto md:overflow-hidden">
                {visibleDates.map((dayDate) => {
                  const dateKey = format(dayDate, 'yyyy-MM-dd');
                  const dayTasks = tasksByDay[dateKey] || [];
                  return (
                    <DayColumn
                      key={dateKey}
                      dayDate={dayDate}
                      tasks={dayTasks}
                      allTasks={tasks}
                      projects={projects}
                      sections={sections}
                      isCurrentDay={isToday(dayDate)}
                      isDragOver={dragOverDay === dateKey}
                      onSelectTask={onSelectTask}
                      selectedTaskId={selectedTaskId}
                      truncateText={effectiveView === 'week'}
                      overItemId={overItemId}
                      dropLinePosition={dropLinePosition}
                      justDroppedId={justDroppedId}
                    />
                  );
                })}
              </div>
            </div>

            {/* Timeline view */}
            <div
              className={`absolute inset-0 transition-opacity duration-200 ${
                effectiveView === 'timeline' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <WeekTimelineView
                tasks={tasks}
                projects={projects}
                sections={sections}
                weekDates={weekDatesForTimeline}
                onUpdateTask={onUpdateTask}
                onStatusChange={onStatusChange}
                onSelectTask={onSelectTask}
                selectedTaskId={selectedTaskId}
              />
            </div>
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }}>
            {activeDragTask ? (() => {
              const dragProject = projects.find(p => p.id === activeDragTask.projectId);
              const dragSection = sections.find(s => s.id === activeDragTask.section);
              return (
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ scale: 1.04, rotate: 0.5 }}
                  className="flex flex-col gap-0.5 px-2.5 py-2 rounded-md"
                  style={{
                    background: 'var(--bg-elevated)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)',
                    maxWidth: 260,
                    minWidth: 120,
                  }}
                >
                  <span className="text-[12px] leading-[1.4] line-clamp-2" style={{ color: 'var(--text-primary)' }}>{activeDragTask.name}</span>
                  <span className="truncate flex items-center gap-1" style={{ fontSize: 9, color: 'var(--text-placeholder)', fontWeight: 400, lineHeight: 1.3 }}>
                    <span className="flex-shrink-0 rounded-full" style={{ width: 6, height: 6, background: dragProject?.color || 'var(--accent-blue)', opacity: 0.4 }} />
                    {dragProject && <span>{dragProject.name}</span>}
                    {dragProject && dragSection && <span>·</span>}
                    {dragSection && <span className="truncate">{dragSection.title}</span>}
                  </span>
                </motion.div>
              );
            })() : activeDragSubtask ? (
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 1.04, rotate: 0.5 }}
                className="h-[30px] flex items-center gap-1.5 px-2 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  borderLeft: `2px solid ${activeDragSubtask.projectColor}`,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <span className="text-[11px] truncate" style={{ color: 'var(--text-primary)' }}>{activeDragSubtask.subtask.name}</span>
              </motion.div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Mobile FAB for Master List */}
      {windowWidth < 768 && pendingCount > 0 && effectiveView !== 'timeline' && (
        <button
          onClick={() => setMobileOverlay(true)}
          className="fixed bottom-20 left-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
        >
          <List className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--accent-blue)', color: 'var(--bg-base)' }}>
            {pendingCount > 99 ? '99' : pendingCount}
          </span>
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOverlay && (
        <MasterListOverlay
          projects={projects}
          sections={sections}
          tasks={tasks}
          onClose={() => setMobileOverlay(false)}
        />
      )}
    </div>
  );
}
