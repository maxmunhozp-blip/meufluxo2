import { useMemo, useState, useEffect } from 'react';
import {
  addDays, format, isToday, isBefore, startOfDay, parseISO, subDays, differenceInCalendarDays,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, pointerWithin, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight, Play, BarChart3, Repeat, ChevronDown, List, X } from 'lucide-react';
import { Task, TaskStatus, Project, Section, Subtask } from '@/types/task';
import { WeekTimelineView } from './WeekTimelineView';
import { ProBadge } from '@/components/ProBadge';

interface MyWeekViewProps {
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  onUpdateTask: (task: Task) => void;
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

// ── Task card in day column — colored, no checkbox ──
function WeekTaskCard({
  task,
  projectColor,
  isSelected,
  onSelect,
  truncate,
  isRolledOverOrigin,
}: {
  task: Task;
  projectColor: string;
  isSelected: boolean;
  onSelect: () => void;
  truncate?: boolean;
  isRolledOverOrigin?: boolean;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id, data: { type: 'week-task', task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  const isDone = task.status === 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group cursor-pointer"
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div
        className={`rounded-md px-2 py-1.5 flex items-center gap-1.5 transition-colors ${isSelected ? 'ring-1 ring-white/10' : ''}`}
        style={{
          background: '#2A2A42',
          borderLeft: `3px solid ${projectColor}`,
          borderRadius: 6,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#333350'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#2A2A42'; }}
      >
        <span
          className={`text-[12px] leading-[1.4] block ${isDone || isRolledOverOrigin ? 'line-through opacity-40' : ''} ${truncate ? 'truncate' : 'line-clamp-2'}`}
          style={{ color: '#E8E8F0', fontWeight: 400 }}
        >
          {task.name}
        </span>
      </div>
    </div>
  );
}

// ── Droppable day column ──
function DayColumn({
  dayDate,
  tasks,
  projects,
  isCurrentDay,
  isDragOver,
  onSelectTask,
  selectedTaskId,
  truncateText,
}: {
  dayDate: Date;
  tasks: Task[];
  projects: Project[];
  isCurrentDay: boolean;
  isDragOver: boolean;
  onSelectTask: (t: Task) => void;
  selectedTaskId?: string;
  truncateText?: boolean;
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
        background: isCurrentDay ? '#1A1A28' : 'transparent',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        ...(highlight ? {
          border: '1px dashed #6C9CFC',
          background: 'rgba(108,156,252,0.04)',
        } : {}),
      }}
    >
      {/* Column header */}
      <div className="flex flex-col items-center justify-center py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: isCurrentDay ? '#6C9CFC' : '#8888A0',
          textTransform: 'uppercase' as const,
          letterSpacing: 0.5,
        }}>
          {isCurrentDay ? 'HOJE' : dayLabel}
        </span>
        <span style={{
          fontSize: 18,
          fontWeight: 600,
          color: isCurrentDay ? '#E8E8F0' : '#8888A0',
        }}>
          {dayNumber}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-1.5 space-y-1 overflow-y-auto min-h-[80px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            // Check if this task is shown on a past day but was rolled over to today
            const taskDate = task.scheduledDate || task.dueDate;
            const isRolledOverOrigin = !isCurrentDay && task.status !== 'done' && !!taskDate && taskDate === dateStr && isBefore(dayDate, startOfDay(new Date()));
            return (
              <WeekTaskCard
                key={task.id}
                task={task}
                projectColor={project?.color || '#6C9CFC'}
                isSelected={selectedTaskId === task.id}
                onSelect={() => onSelectTask(task)}
                truncate={truncateText}
                isRolledOverOrigin={isRolledOverOrigin}
              />
            );
          })}
        </SortableContext>
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
      const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
      const sectionGroups = sections
        .filter(s => s.projectId === project.id)
        .map(s => ({
          section: s,
          tasks: projectTasks.filter(t => t.section === s.id),
        }))
        .filter(g => g.tasks.length > 0);
      return { project, totalCount: projectTasks.length, sectionGroups };
    }).filter(g => g.totalCount > 0);
  }, [projects, filteredTasks, sections]);

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
      <div className="hidden md:flex w-10 flex-shrink-0 flex-col items-center pt-3 gap-2" style={{ background: 'hsl(var(--bg-sidebar))', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center rounded transition-colors" style={{ color: '#8888A0' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {totalPending > 0 && (
          <span className="text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center" style={{ color: '#6C9CFC', background: 'rgba(108,156,252,0.1)' }}>
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
        background: isMasterListOver ? 'rgba(108,156,252,0.04)' : 'hsl(var(--bg-sidebar))',
        borderRight: isMasterListOver ? '1px solid rgba(108,156,252,0.4)' : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E8F0' }}>Master List</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: '#6C9CFC', background: 'rgba(108,156,252,0.1)', borderRadius: 10, padding: '1px 7px' }}>
              {totalPending}
            </span>
          </div>
          <button onClick={onToggle} className="w-6 h-6 flex items-center justify-center rounded transition-colors" style={{ color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar tarefa..."
          className="w-full h-7 px-2.5 text-[12px] bg-transparent rounded-md border focus:outline-none placeholder:text-[#555570] transition-colors"
          style={{ color: '#E8E8F0', borderColor: 'rgba(255,255,255,0.06)' }}
        />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto py-1">
        {groupedData.map(({ project, totalCount, sectionGroups }) => {
          const expanded = expandedProjects[project.id] !== false;
          return (
            <div key={project.id} className="mb-1">
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full h-8 px-3 flex items-center gap-2 transition-colors"
                style={{ color: project.color }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Play className={`w-2.5 h-2.5 fill-current transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: 0.3 }} className="truncate flex-1 text-left">
                  {project.name}
                </span>
                <span style={{ fontSize: 10, color: '#555570' }}>{totalCount}</span>
              </button>
              {expanded && (
                <div>
                  {sectionGroups.map(({ section, tasks: sectionTasks }) => (
                    <div key={section.id}>
                      {sectionGroups.length > 1 && (
                        <div className="px-5 py-1">
                          <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5, color: '#555570', fontWeight: 500 }}>
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
            <span style={{ fontSize: 12, color: '#555570' }}>
              {searchQuery ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa pendente'}
            </span>
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!hintDismissed && totalPending > 0 && (
        <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 11, color: '#555570' }}>
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
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        className="fixed left-0 top-0 bottom-0 z-50 w-[300px] flex flex-col animate-slide-in-left"
        style={{ background: '#1A1A28', boxShadow: '4px 0 16px rgba(0,0,0,0.3)' }}
      >
        <div className="h-12 px-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#E8E8F0' }}>Master List</span>
          <button onClick={onClose} style={{ color: '#8888A0' }}><X className="w-4 h-4" /></button>
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
                      <div key={t.id} className="h-8 flex items-center px-2" style={{ fontSize: 13, color: '#E8E8F0' }}>
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
    outline: isDragging ? '1px dashed #6C9CFC' : 'none',
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-1.5 h-[32px] px-4 mx-1 rounded-md cursor-grab active:cursor-grabbing transition-colors"
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {subtasks.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0"
            style={{ color: '#555570' }}
          >
            <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`} />
          </button>
        ) : (
          <div className="w-3.5 flex-shrink-0" />
        )}
        <span style={{ fontSize: 13, color: '#E8E8F0' }} className="truncate flex-1">{task.name}</span>
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
    outline: isDragging ? '1px dashed #6C9CFC' : 'none',
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex items-center gap-1.5 h-[28px] px-2.5 mx-1 rounded-md cursor-grab active:cursor-grabbing transition-colors"
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {nestedSubs.length > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(prev => !prev); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-3 h-3 flex items-center justify-center flex-shrink-0"
            style={{ color: '#555570' }}
          >
            <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-150 ${expanded ? '' : '-rotate-90'}`} />
          </button>
        ) : (
          <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: `${projectColor}80` }} />
        )}
        <span style={{ fontSize: 11, color: '#8888A0' }} className="truncate flex-1">{subtask.name}</span>
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
  const [mobileOverlay, setMobileOverlay] = useState(false);

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

  // Full week dates for timeline
  const weekDatesForTimeline = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(addDays(today, (effectiveView === 'week' ? dayOffset : 0) * 7), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [dayOffset, effectiveView]);

  // Date range label
  const dateRangeLabel = useMemo(() => {
    const first = visibleDates[0];
    const last = visibleDates[visibleDates.length - 1];
    const fStr = format(first, 'dd MMM', { locale: ptBR });
    const lStr = format(last, "dd MMM yyyy", { locale: ptBR });
    return `${fStr} — ${lStr}`;
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
        for (const sub of subs) {
          const dateKey = sub.scheduledDate || sub.dueDate;
          if (dateKey && map[dateKey] !== undefined) {
            const pseudo: Task = {
              id: sub.id, name: sub.name, status: sub.status,
              priority: sub.priority || 'low', description: sub.description,
              dueDate: sub.dueDate, scheduledDate: sub.scheduledDate,
              section: sub.section, projectId: sub.projectId || parent.projectId,
              parentTaskId: sub.parentTaskId, members: sub.members, subtasks: sub.subtasks,
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

    return map;
  }, [tasks, visibleDates]);

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
    const { over } = event;
    if (over?.data.current?.type === 'day-drop') {
      setDragOverDay(over.data.current.date);
    } else {
      setDragOverDay(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragOverDay(null);
    setActiveDragId(null);
    setActiveDragSubtask(null);
    const { active, over } = event;
    if (!over) return;

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

  const activeDragTask = activeDragId ? tasks.find(t => t.id === activeDragId) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'hsl(var(--bg-app))' }}>
      {/* Header */}
      <div className="h-12 px-3 md:px-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#E8E8F0' }} className="whitespace-nowrap md:text-[18px]">
          Minha Semana
        </h1>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Nav arrows */}
          <button onClick={navigateBack} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Hoje button */}
          <button
            onClick={goToToday}
            className="h-7 px-3 text-[12px] rounded-md transition-colors"
            style={{
              border: '1px solid #333350',
              borderRadius: 6,
              color: todayVisible ? '#E8E8F0' : '#8888A0',
              background: todayVisible ? '#2A2A42' : 'transparent',
            }}
            onMouseEnter={e => {
              if (!todayVisible) { e.currentTarget.style.borderColor = '#6C9CFC'; e.currentTarget.style.color = '#E8E8F0'; }
            }}
            onMouseLeave={e => {
              if (!todayVisible) { e.currentTarget.style.borderColor = '#333350'; e.currentTarget.style.color = '#8888A0'; }
            }}
          >
            Hoje
          </button>

          <button onClick={navigateForward} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Date range */}
          <span className="hidden md:inline text-[13px] ml-1" style={{ color: '#8888A0' }}>
            {dateRangeLabel}
          </span>

          {/* View toggle */}
          <div className="ml-1 md:ml-3 flex items-center rounded-md overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => toggleViewMode('3days')}
              className="px-2 md:px-2.5 h-7 text-[11px] font-medium transition-colors"
              style={{
                background: effectiveView === '3days' ? '#6C9CFC' : 'transparent',
                color: effectiveView === '3days' ? '#0F0F17' : '#8888A0',
              }}
            >
              3 dias
            </button>
            {windowWidth >= 1200 && (
              <button
                onClick={() => toggleViewMode('week')}
                className="px-2 md:px-2.5 h-7 text-[11px] font-medium transition-colors"
                style={{
                  background: effectiveView === 'week' ? '#6C9CFC' : 'transparent',
                  color: effectiveView === 'week' ? '#0F0F17' : '#8888A0',
                }}
              >
                Semana
              </button>
            )}
            <button
              onClick={() => toggleViewMode('timeline')}
              className="flex items-center gap-1 px-2 md:px-2.5 h-7 text-[11px] font-medium transition-colors"
              style={{
                background: effectiveView === 'timeline' ? '#6C9CFC' : 'transparent',
                color: effectiveView === 'timeline' ? '#0F0F17' : '#8888A0',
              }}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Timeline</span>
              {!isPro && <ProBadge className="ml-1" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Columns view (3days or week) */}
        <div
          className={`absolute inset-0 flex transition-opacity duration-200 ${
            effectiveView !== 'timeline' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
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

            <div className="flex-1 flex overflow-x-auto md:overflow-hidden">
              {visibleDates.map((dayDate) => {
                const dateKey = format(dayDate, 'yyyy-MM-dd');
                const dayTasks = tasksByDay[dateKey] || [];
                return (
                  <DayColumn
                    key={dateKey}
                    dayDate={dayDate}
                    tasks={dayTasks}
                    projects={projects}
                    isCurrentDay={isToday(dayDate)}
                    isDragOver={dragOverDay === dateKey}
                    onSelectTask={onSelectTask}
                    selectedTaskId={selectedTaskId}
                    truncateText={effectiveView === 'week'}
                  />
                );
              })}
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
              {activeDragTask ? (
                <div
                  className="h-[36px] flex items-center gap-1.5 px-2 rounded-md shadow-lg"
                  style={{
                    background: 'hsl(var(--bg-surface))',
                    borderLeft: `2px solid ${projects.find(p => p.id === activeDragTask.projectId)?.color || '#6C9CFC'}`,
                    opacity: 0.95,
                  }}
                >
                  <span className="text-[12px] truncate" style={{ color: '#E8E8F0' }}>{activeDragTask.name}</span>
                </div>
              ) : activeDragSubtask ? (
                <div
                  className="h-[30px] flex items-center gap-1.5 px-2 rounded-md shadow-lg"
                  style={{
                    background: 'hsl(var(--bg-surface))',
                    borderLeft: `2px solid ${activeDragSubtask.projectColor}`,
                    opacity: 0.95,
                  }}
                >
                  <span className="text-[11px] truncate" style={{ color: '#E8E8F0' }}>{activeDragSubtask.subtask.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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

      {/* Mobile FAB for Master List */}
      {windowWidth < 768 && pendingCount > 0 && effectiveView !== 'timeline' && (
        <button
          onClick={() => setMobileOverlay(true)}
          className="fixed bottom-20 left-4 z-30 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: '#2A2A42', border: '1px solid #333350' }}
        >
          <List className="w-5 h-5" style={{ color: '#8888A0' }} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#6C9CFC', color: '#0F0F17' }}>
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
