import { useMemo, useState, useCallback } from 'react';
import {
  startOfWeek, addDays, format, isToday, isBefore, startOfDay, parseISO, subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Task, TaskStatus, Project, Section } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';

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
      className={`flex flex-col min-w-[160px] flex-1 border-r border-nd-border last:border-r-0 transition-colors ${
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
            return (
              <div key={task.id} className="relative">
                {isRollover && (
                  <span className="absolute -top-0.5 right-1 text-[9px] text-nd-text-muted bg-nd-hover rounded px-1 z-10">
                    ← ontem
                  </span>
                )}
                <SortableWeekTaskCard
                  task={task}
                  projectColor={project?.color || '#4A90D9'}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => onSelectTask(task)}
                  onStatusChange={onStatusChange}
                />
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

// -- Project sidebar for dragging tasks from --
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

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Only show pending tasks (not done)
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);

  if (collapsed) {
    return (
      <div className="w-8 flex-shrink-0 border-r border-nd-border flex flex-col items-center pt-3">
        <button onClick={onToggle} className="w-6 h-6 flex items-center justify-center rounded hover:bg-nd-hover text-nd-text-muted">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[220px] flex-shrink-0 border-r border-nd-border flex flex-col" style={{ background: 'hsl(var(--bg-sidebar))' }}>
      <div className="h-12 px-3 flex items-center justify-between border-b border-nd-border">
        <span className="text-[13px] font-semibold text-nd-text">Tarefas Pendentes</span>
        <button onClick={onToggle} className="w-6 h-6 flex items-center justify-center rounded hover:bg-nd-hover text-nd-text-muted">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {projects.map(project => {
          const projectTasks = pendingTasks.filter(t => t.projectId === project.id);
          if (projectTasks.length === 0) return null;
          const expanded = expandedProjects[project.id] !== false;

          return (
            <div key={project.id}>
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full h-8 px-3 flex items-center gap-2 hover:bg-nd-hover transition-colors"
              >
                <Play className={`w-2.5 h-2.5 text-nd-text-muted fill-nd-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
                <span className="text-[12px] font-medium text-nd-text truncate">{project.name}</span>
                <span className="text-[10px] text-nd-text-muted ml-auto">{projectTasks.length}</span>
              </button>
              {expanded && (
                <div className="ml-2">
                  {projectTasks.map(task => (
                    <SourceTaskItem key={task.id} task={task} projectColor={project.color} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {pendingTasks.length === 0 && (
          <div className="px-3 py-6 text-center">
            <span className="text-[12px] text-nd-text-muted">Nenhuma tarefa pendente</span>
          </div>
        )}
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-1.5 h-[32px] px-2 mx-1 rounded cursor-grab active:cursor-grabbing hover:bg-nd-hover transition-colors"
    >
      <div className="w-[3px] h-4 rounded-full flex-shrink-0" style={{ background: projectColor }} />
      <span className="text-[11px] text-nd-text truncate">{task.name}</span>
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

  // Track which tasks are rollovers for the badge
  const rolloverTaskIds = useMemo(() => {
    const ids = new Set<string>();
    const todayStart = startOfDay(new Date());
    const todayKey = format(todayStart, 'yyyy-MM-dd');

    tasks.forEach(t => {
      if (!t.dueDate || t.parentTaskId || t.status === 'done') return;
      const dueDate = parseISO(t.dueDate);
      if (isBefore(startOfDay(dueDate), todayStart)) {
        // This task's due date is before today — it's a rollover if shown in today's column
        const todayTasks = tasksByDay[todayKey] || [];
        if (todayTasks.some(tt => tt.id === t.id)) {
          ids.add(t.id);
        }
      }
    });

    return ids;
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
      {/* Header with week navigation */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-nd-border flex-shrink-0" style={{ background: 'hsl(var(--bg-app))' }}>
        <h1 className="text-[18px] font-bold text-nd-text">Minha Semana</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(prev => prev - 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nd-hover text-nd-text-muted hover:text-nd-text transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-3 h-7 text-[12px] font-medium rounded transition-colors ${
              weekOffset === 0
                ? 'bg-primary/10 text-primary'
                : 'text-nd-text-secondary hover:bg-nd-hover hover:text-nd-text'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setWeekOffset(prev => prev + 1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nd-hover text-nd-text-muted hover:text-nd-text transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-[12px] text-nd-text-secondary ml-2">
            {format(weekDates[0], "dd MMM", { locale: ptBR })} – {format(weekDates[6], "dd MMM yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Main content: sidebar + columns */}
      <div className="flex-1 flex overflow-hidden">
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

          {/* Day columns */}
          <div className="flex-1 flex overflow-x-auto">
            {weekDates.map((dayDate, i) => {
              const dateKey = format(dayDate, 'yyyy-MM-dd');
              const dayTasks = tasksByDay[dateKey] || [];

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
                <span className="text-[12px] text-nd-text truncate">{activeDragTask.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
