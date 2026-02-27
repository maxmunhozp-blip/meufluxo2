import { useMemo, useState, useCallback } from 'react';
import {
  startOfWeek, addDays, format, isToday, isBefore, startOfDay, parseISO, subDays, differenceInCalendarDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronLeft, ChevronRight, Play, LayoutGrid, BarChart3, Repeat } from 'lucide-react';
import { Task, TaskStatus, Project, Section } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';
import { WeekTimelineView } from './WeekTimelineView';

interface MyWeekViewProps {
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  onUpdateTask: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// -- Sortable task card inside a day column --
function SortableWeekTaskCard({
  task,
  projectColor,
  isSelected,
  onSelect,
  onStatusChange,
  isDragOverlay,
}: {
  task: Task;
  projectColor: string;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (id: string, s: TaskStatus) => void;
  isDragOverlay?: boolean;
  rolloverBadge?: boolean;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id, data: { type: 'week-task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={`flex items-center gap-1.5 h-[36px] px-2 rounded-md cursor-pointer transition-colors group border border-transparent ${
        isSelected ? 'bg-nd-active border-nd-border' : 'hover:bg-nd-hover'
      } ${isDragOverlay ? 'shadow-lg border-primary/30' : ''}`}
      onClick={onSelect}
    >
      {/* Project color bar */}
      <div className="w-[3px] h-5 rounded-full flex-shrink-0" style={{ background: projectColor }} />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3 text-nd-text-muted" />
      </div>

      <StatusCheckbox
        status={task.status}
        onChange={(s) => { onStatusChange(task.id, s); }}
      />

      <span className={`flex-1 text-[12px] truncate leading-tight ${
        task.status === 'done' ? 'text-nd-text-completed line-through opacity-60' : 'text-nd-text'
      }`}>
        {task.name}
      </span>
      {task.recurrenceType && <Repeat className="w-2.5 h-2.5 text-primary/50 flex-shrink-0" />}
    </div>
  );
}

// -- Droppable day column --
function DayColumn({
  dayDate,
  dayLabel,
  dayNumber,
  tasks,
  projects,
  isCurrentDay,
  isDragOver,
  onSelectTask,
  selectedTaskId,
  onStatusChange,
  rolloverTaskIds,
  rolloverDaysMap,
  isGhostDay,
}: {
  dayDate: Date;
  dayLabel: string;
  dayNumber: string;
  tasks: Task[];
  projects: Project[];
  isCurrentDay: boolean;
  isDragOver: boolean;
  onSelectTask: (t: Task) => void;
  selectedTaskId?: string;
  onStatusChange: (id: string, s: TaskStatus) => void;
  rolloverTaskIds: Set<string>;
  rolloverDaysMap: Map<string, number>;
  isGhostDay?: boolean;
}) {
  const dateStr = format(dayDate, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { type: 'day-drop', date: dateStr },
  });

  const highlight = isDragOver || isOver;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-shrink-0 w-[85vw] md:w-auto md:min-w-[120px] md:flex-1 snap-center border-r border-nd-border last:border-r-0 transition-colors ${
        highlight ? 'bg-nd-hover/50' : ''
      }`}
    >
      {/* Day header */}
      <div className={`h-12 flex flex-col items-center justify-center border-b flex-shrink-0 ${
        isCurrentDay
          ? 'border-b-2 border-b-primary bg-primary/5'
          : 'border-nd-border'
      }`}>
        <span className={`text-[11px] uppercase tracking-wider ${
          isCurrentDay ? 'text-primary font-bold' : 'text-nd-text-muted'
        }`}>
          {dayLabel}
        </span>
        <span className={`text-[14px] font-semibold ${
          isCurrentDay ? 'text-primary' : 'text-nd-text'
        }`}>
          {dayNumber}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-1.5 space-y-1 overflow-y-auto min-h-[120px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const isRollover = rolloverTaskIds.has(task.id);
            const rolloverDays = rolloverDaysMap.get(task.id);
            const isGhost = isGhostDay && isRollover;
            return (
              <div key={task.id} className={`relative ${isGhost ? 'opacity-40' : ''}`}>
                {isRollover && !isGhostDay && rolloverDays != null && (
                  <span className={`absolute -top-0.5 right-1 text-[9px] font-medium rounded px-1 z-10 ${
                    rolloverDays > 2
                      ? 'bg-orange-500/15 text-orange-400'
                      : 'bg-yellow-500/15 text-yellow-400'
                  }`}>
                    ← {rolloverDays === 1 ? 'ontem' : `${rolloverDays} dias`}
                  </span>
                )}
                {isGhost ? (
                  <div className="flex items-center gap-1.5 h-[36px] px-2 rounded-md">
                    <div className="w-[3px] h-5 rounded-full flex-shrink-0" style={{ background: project?.color || '#4A90D9' }} />
                    <span className="flex-1 text-[12px] truncate leading-tight text-nd-text-muted line-through">
                      {task.name}
                    </span>
                  </div>
                ) : (
                  <SortableWeekTaskCard
                    task={task}
                    projectColor={project?.color || '#4A90D9'}
                    isSelected={selectedTaskId === task.id}
                    onSelect={() => onSelectTask(task)}
                    onStatusChange={onStatusChange}
                  />
                )}
              </div>
            );
          })}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[80px]">
            <span className="text-[11px] text-nd-text-muted">Arraste tarefas aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Master List sidebar for dragging tasks from --
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
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Only show non-subtask pending tasks
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done' && !t.parentTaskId), [tasks]);

  // Filter by search
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return pendingTasks;
    const q = searchQuery.toLowerCase();
    return pendingTasks.filter(t => t.name.toLowerCase().includes(q));
  }, [pendingTasks, searchQuery]);

  // Group by project, then by section
  const groupedData = useMemo(() => {
    return projects.map(project => {
      const projectTasks = filteredTasks.filter(t => t.projectId === project.id);
      // Group by section
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

  if (collapsed) {
    return (
      <div className="hidden md:flex w-10 flex-shrink-0 border-r border-nd-border flex-col items-center pt-3 gap-2" style={{ background: 'hsl(var(--bg-sidebar))' }}>
        <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center rounded hover:bg-nd-hover text-nd-text-muted">
          <ChevronRight className="w-4 h-4" />
        </button>
        {totalPending > 0 && (
          <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center">
            {totalPending}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="hidden md:flex w-[260px] flex-shrink-0 border-r border-nd-border flex-col" style={{ background: 'hsl(var(--bg-sidebar))' }}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-nd-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-nd-text">Master List</span>
            <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
              {totalPending}
            </span>
          </div>
          <button onClick={onToggle} className="w-6 h-6 flex items-center justify-center rounded hover:bg-nd-hover text-nd-text-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar tarefa..."
          className="w-full h-7 px-2.5 text-[12px] text-nd-text bg-nd-input rounded-md border border-nd-border focus:outline-none focus:border-primary/50 placeholder:text-nd-text-muted transition-colors"
        />
      </div>

      {/* Task list grouped by project > section */}
      <div className="flex-1 overflow-y-auto py-1">
        {groupedData.map(({ project, totalCount, sectionGroups }) => {
          const expanded = expandedProjects[project.id] !== false;

          return (
            <div key={project.id} className="mb-1">
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full h-9 px-3 flex items-center gap-2 hover:bg-nd-hover transition-colors"
              >
                <Play className={`w-2.5 h-2.5 text-nd-text-muted fill-nd-text-muted transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: project.color }} />
                <span className="text-[12px] font-semibold text-nd-text truncate flex-1 text-left">{project.name}</span>
                <span className="text-[10px] font-medium text-nd-text-muted bg-nd-hover rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {totalCount}
                </span>
              </button>
              {expanded && (
                <div className="ml-1">
                  {sectionGroups.map(({ section, tasks: sectionTasks }) => (
                    <div key={section.id}>
                      {/* Section label (only show if more than one section) */}
                      {sectionGroups.length > 1 && (
                        <div className="px-4 py-1">
                          <span className="text-[10px] uppercase tracking-wider text-nd-text-muted font-medium">
                            {section.title}
                          </span>
                        </div>
                      )}
                      {sectionTasks.map(task => (
                        <SourceTaskItem key={task.id} task={task} projectColor={project.color} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {groupedData.length === 0 && (
          <div className="px-3 py-8 text-center">
            <span className="text-[12px] text-nd-text-muted">
              {searchQuery ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa pendente'}
            </span>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-nd-border">
        <span className="text-[10px] text-nd-text-muted">Arraste tarefas para agendar na semana</span>
      </div>
    </div>
  );
}

// Draggable source task item
function SourceTaskItem({ task, projectColor }: { task: Task; projectColor: string }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: `source-${task.id}`,
    data: { type: 'source-task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.4 : 1,
  };

  const hasDueDate = !!task.dueDate;
  const isOverdue = hasDueDate && isBefore(parseISO(task.dueDate!), startOfDay(new Date())) && task.status !== 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-1.5 h-[34px] px-2.5 mx-1 rounded-md cursor-grab active:cursor-grabbing hover:bg-nd-hover transition-colors group ${
        isDragging ? 'ring-1 ring-primary/30' : ''
      }`}
    >
      <div className="w-[3px] h-4 rounded-full flex-shrink-0" style={{ background: projectColor }} />
      <span className="text-[11px] text-nd-text truncate flex-1">{task.name}</span>
      {hasDueDate && (
        <span className={`text-[9px] flex-shrink-0 px-1 py-0.5 rounded ${
          isOverdue ? 'text-orange-400 bg-orange-500/10' : 'text-nd-text-muted'
        }`}>
          {format(parseISO(task.dueDate!), 'dd/MM')}
        </span>
      )}
    </div>
  );
}

export function MyWeekView({
  tasks,
  projects,
  sections,
  onUpdateTask,
  onStatusChange,
  onSelectTask,
  selectedTaskId,
}: MyWeekViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'columns' | 'timeline'>(() => {
    try { return (localStorage.getItem('meufluxo_week_view') as 'columns' | 'timeline') || 'columns'; }
    catch { return 'columns'; }
  });

  const toggleViewMode = (mode: 'columns' | 'timeline') => {
    setViewMode(mode);
    localStorage.setItem('meufluxo_week_view', mode);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Calculate week dates (Mon–Sun)
  const weekDates = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekOffset]);

  // Get yesterday for rollover detection
  const yesterday = useMemo(() => subDays(startOfDay(new Date()), 1), []);

  // Tasks grouped by day
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    const todayStart = startOfDay(new Date());

    weekDates.forEach(d => {
      const key = format(d, 'yyyy-MM-dd');
      map[key] = [];
    });

    // Only non-parent tasks with due dates in this week
    tasks.forEach(t => {
      if (!t.dueDate || t.parentTaskId) return;
      const dueKey = t.dueDate;
      if (map[dueKey] !== undefined) {
        map[dueKey].push(t);
      }
    });

    // Auto-rollover: tasks from yesterday (or earlier in the week) that aren't done
    // should appear at the top of today's column
    const todayKey = format(todayStart, 'yyyy-MM-dd');
    if (map[todayKey] !== undefined) {
      // Find overdue tasks from earlier in the week
      const rolloverTasks: Task[] = [];
      weekDates.forEach(d => {
        const key = format(d, 'yyyy-MM-dd');
        if (isBefore(d, todayStart)) {
          const overdueTasks = (map[key] || []).filter(t => t.status !== 'done');
          overdueTasks.forEach(t => {
            if (!map[todayKey].some(existing => existing.id === t.id)) {
              rolloverTasks.push(t);
            }
          });
        }
      });
      // Prepend rollover tasks to today
      map[todayKey] = [...rolloverTasks, ...map[todayKey]];
    }

    return map;
  }, [tasks, weekDates]);

  // Track which tasks are rollovers + how many days
  const { rolloverTaskIds, rolloverDaysMap } = useMemo(() => {
    const ids = new Set<string>();
    const daysMap = new Map<string, number>();
    const todayStart = startOfDay(new Date());
    const todayKey = format(todayStart, 'yyyy-MM-dd');

    tasks.forEach(t => {
      if (!t.dueDate || t.parentTaskId || t.status === 'done') return;
      const dueDate = parseISO(t.dueDate);
      if (isBefore(startOfDay(dueDate), todayStart)) {
        const todayTasks = tasksByDay[todayKey] || [];
        if (todayTasks.some(tt => tt.id === t.id)) {
          ids.add(t.id);
          daysMap.set(t.id, differenceInCalendarDays(todayStart, dueDate));
        }
      }
    });

    return { rolloverTaskIds: ids, rolloverDaysMap: daysMap };
  }, [tasks, tasksByDay]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'week-task' || data?.type === 'source-task') {
      setActiveDragId(data.task.id);
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
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Source task dropped onto a day column
    if (activeData?.type === 'source-task' && overData?.type === 'day-drop') {
      const task = activeData.task as Task;
      const targetDate = overData.date as string;
      onUpdateTask({ ...task, dueDate: targetDate });
      return;
    }

    // Week task dropped onto a different day column
    if (activeData?.type === 'week-task' && overData?.type === 'day-drop') {
      const task = activeData.task as Task;
      const targetDate = overData.date as string;
      if (task.dueDate !== targetDate) {
        onUpdateTask({ ...task, dueDate: targetDate });
      }
      return;
    }

    // Reorder within same day
    if (activeData?.type === 'week-task' && overData?.type === 'week-task') {
      // Same-day reorder (visual only, order follows array)
      return;
    }
  };

  const activeDragTask = activeDragId ? tasks.find(t => t.id === activeDragId) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with week navigation + view toggle */}
      <div className="h-12 px-3 md:px-4 flex items-center justify-between border-b border-border flex-shrink-0" style={{ background: 'hsl(var(--bg-app))' }}>
        <h1 className="text-[16px] md:text-[18px] font-bold text-foreground whitespace-nowrap">Minha Semana</h1>
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-2 md:px-3 h-7 text-[11px] md:text-[12px] font-medium rounded transition-colors ${
              weekOffset === 0
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="hidden md:inline text-[12px] text-muted-foreground ml-2">
            {format(weekDates[0], "dd MMM", { locale: ptBR })} – {format(weekDates[6], "dd MMM yyyy", { locale: ptBR })}
          </span>

          {/* View toggle */}
          <div className="ml-1 md:ml-3 flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => toggleViewMode('columns')}
              className={`flex items-center gap-1 px-2 md:px-2.5 h-7 text-[11px] font-medium transition-colors ${
                viewMode === 'columns'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Colunas</span>
            </button>
            <button
              onClick={() => toggleViewMode('timeline')}
              className={`flex items-center gap-1 px-2 md:px-2.5 h-7 text-[11px] font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Timeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Views with crossfade */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Columns view */}
        <div
          className={`absolute inset-0 flex transition-opacity duration-200 ${
            viewMode === 'columns' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <WeekSourceSidebar
              projects={projects}
              sections={sections}
              tasks={tasks}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(prev => !prev)}
            />

            <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory md:snap-none">
              {weekDates.map((dayDate, i) => {
                const dateKey = format(dayDate, 'yyyy-MM-dd');
                const dayTasks = tasksByDay[dateKey] || [];
                const todayStart = startOfDay(new Date());
                const isPastDay = isBefore(dayDate, todayStart);
                return (
                  <DayColumn
                    key={dateKey}
                    dayDate={dayDate}
                    dayLabel={DAY_LABELS[i]}
                    dayNumber={format(dayDate, 'dd')}
                    tasks={dayTasks}
                    projects={projects}
                    isCurrentDay={isToday(dayDate)}
                    isDragOver={dragOverDay === dateKey}
                    onSelectTask={onSelectTask}
                    selectedTaskId={selectedTaskId}
                    onStatusChange={onStatusChange}
                    rolloverTaskIds={rolloverTaskIds}
                    rolloverDaysMap={rolloverDaysMap}
                    isGhostDay={isPastDay}
                  />
                );
              })}
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
              {activeDragTask ? (
                <div
                  className="h-[36px] flex items-center gap-1.5 px-2 rounded-md shadow-lg border border-primary/30"
                  style={{ background: 'hsl(var(--bg-surface))', opacity: 0.95 }}
                >
                  <div
                    className="w-[3px] h-5 rounded-full"
                    style={{ background: projects.find(p => p.id === activeDragTask.projectId)?.color || '#4A90D9' }}
                  />
                  <span className="text-[12px] text-foreground truncate">{activeDragTask.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Timeline view */}
        <div
          className={`absolute inset-0 transition-opacity duration-200 ${
            viewMode === 'timeline' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <WeekTimelineView
            tasks={tasks}
            projects={projects}
            sections={sections}
            weekDates={weekDates}
            onUpdateTask={onUpdateTask}
            onStatusChange={onStatusChange}
            onSelectTask={onSelectTask}
            selectedTaskId={selectedTaskId}
          />
        </div>
      </div>
    </div>
  );
}
