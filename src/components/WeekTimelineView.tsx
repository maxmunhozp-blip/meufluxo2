import { useMemo, useState } from 'react';
import {
  format, isToday, isBefore, startOfDay, parseISO,
} from 'date-fns';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragStartEvent, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus, Project, Section } from '@/types/task';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface WeekTimelineViewProps {
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  weekDates: Date[];
  onUpdateTask: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
}

/* ── Sortable task card ── */
function TimelineTaskCard({
  task, project, section, parentTask, isSelected, onSelect,
}: {
  task: Task; project?: Project; section?: Section; parentTask?: Task;
  isSelected: boolean; onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'timeline-task', task },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.3 : 1,
  };

  const isDone = task.status === 'done';

  // Context parts
  const contextParts: string[] = [];
  if (project) contextParts.push(project.name);
  if (section) contextParts.push(section.title);
  if (parentTask) contextParts.push(parentTask.name);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-pointer"
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div
        className={`rounded-md px-2 py-1.5 flex flex-col gap-0.5 ${isSelected ? 'ring-1' : ''}`}
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: isSelected
            ? '0 0 0 1px var(--border-interactive), 0 1px 2px rgba(0,0,0,0.04)'
            : '0 0.5px 1px rgba(0,0,0,0.04)',
          transition: 'all 150ms ease-out',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--bg-hover)';
          e.currentTarget.style.boxShadow = isSelected
            ? '0 0 0 1px var(--border-interactive), 0 1px 3px rgba(0,0,0,0.08)'
            : '0 1px 3px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--bg-elevated)';
          e.currentTarget.style.boxShadow = isSelected
            ? '0 0 0 1px var(--border-interactive), 0 1px 2px rgba(0,0,0,0.04)'
            : '0 0.5px 1px rgba(0,0,0,0.04)';
        }}
      >
        {/* Line 1: Task name */}
        <span
          className={`text-[11px] leading-[1.4] truncate ${isDone ? 'line-through opacity-40' : ''}`}
          style={{ color: 'var(--text-primary)', fontWeight: 400 }}
        >
          {task.name}
        </span>

        {/* Line 2: Context (project · section) */}
        {contextParts.length > 0 && (
          <span
            className="truncate flex items-center gap-1"
            style={{ fontSize: 9, color: 'var(--text-placeholder)', fontWeight: 400, lineHeight: 1.3, opacity: isDone ? 0.4 : 0.7 }}
          >
            <span
              className="flex-shrink-0 rounded-full"
              style={{ width: 5, height: 5, background: project?.color || 'var(--accent-blue)', opacity: 0.75 }}
            />
            <span className="truncate">{contextParts.join(' · ')}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Droppable day column ── */
function TimelineDayColumn({
  dayDate, tasks, allTasks, projects, sections, selectedTaskId, onSelectTask, overloadCount,
}: {
  dayDate: Date; tasks: Task[]; allTasks: Task[]; projects: Project[]; sections: Section[];
  selectedTaskId?: string; onSelectTask: (t: Task) => void; overloadCount?: number;
}) {
  const dateStr = format(dayDate, 'yyyy-MM-dd');
  const current = isToday(dayDate);
  const dayOfWeek = (dayDate.getDay() + 6) % 7;
  const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

  const { setNodeRef, isOver } = useDroppable({
    id: `timeline-day-${dateStr}`,
    data: { type: 'timeline-day', date: dateStr },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col flex-1 min-w-0"
      style={{
        borderRight: '1px solid var(--border-subtle)',
        background: isOver ? 'var(--accent-subtle)' : current ? 'var(--accent-subtle)' : undefined,
        transition: 'background 120ms ease-out',
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col items-center justify-center py-2 flex-shrink-0 relative"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: current ? 'var(--accent-blue)' : 'var(--text-tertiary)',
          textTransform: 'uppercase' as const, letterSpacing: 0.5,
        }}>
          {DAY_LABELS[dayOfWeek]}
        </span>
        <span style={{
          fontSize: 16, fontWeight: current ? 700 : 500,
          color: current ? 'var(--accent-blue)' : 'var(--text-secondary)',
        }}>
          {format(dayDate, 'dd')}
        </span>
        {overloadCount && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{overloadCount} clientes neste dia</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 p-1 space-y-1 overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const section = sections.find(s => s.id === task.section);
            const parentTask = task.parentTaskId ? allTasks.find(t => t.id === task.parentTaskId) : undefined;
            return (
              <TimelineTaskCard
                key={task.id}
                task={task}
                project={project}
                section={section}
                parentTask={parentTask}
                isSelected={selectedTaskId === task.id}
                onSelect={() => onSelectTask(task)}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}

/* ── Main Timeline View ── */
export function WeekTimelineView({
  tasks, projects, sections, weekDates,
  onUpdateTask, onStatusChange, onSelectTask, selectedTaskId,
}: WeekTimelineViewProps) {
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const weekDateStrs = useMemo(() => weekDates.map(d => format(d, 'yyyy-MM-dd')), [weekDates]);

  // Flat task list per day
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    weekDateStrs.forEach(d => { map[d] = []; });

    // Top-level tasks
    tasks.forEach(t => {
      if (t.parentTaskId) return;
      const dateKey = t.scheduledDate || t.dueDate;
      if (dateKey && map[dateKey] !== undefined) {
        map[dateKey].push(t);
      }
    });

    // Subtasks
    tasks.forEach(t => {
      if (t.parentTaskId) return;
      const collectSubs = (subs: typeof t.subtasks) => {
        if (!subs) return;
        for (const sub of subs) {
          const subDate = sub.scheduledDate || sub.dueDate;
          if (subDate && map[subDate] !== undefined) {
            if (!map[subDate].some(r => r.id === sub.id)) {
              map[subDate].push({
                id: sub.id, name: sub.name, status: sub.status,
                priority: sub.priority || 'low', description: sub.description,
                dueDate: sub.dueDate, scheduledDate: sub.scheduledDate,
                section: sub.section, projectId: sub.projectId || t.projectId,
                parentTaskId: sub.parentTaskId, members: sub.members,
                subtasks: sub.subtasks,
              });
            }
          }
          if (sub.subtasks) collectSubs(sub.subtasks);
        }
      };
      collectSubs(t.subtasks);
    });

    // Rollover overdue to today
    const todayStr = format(todayStart, 'yyyy-MM-dd');
    if (map[todayStr] !== undefined) {
      tasks.forEach(t => {
        if (t.parentTaskId || t.status === 'done') return;
        const dateKey = t.scheduledDate || t.dueDate;
        if (!dateKey) return;
        const due = parseISO(dateKey);
        if (isBefore(startOfDay(due), todayStart) && !weekDateStrs.includes(dateKey)) {
          if (!map[todayStr].some(r => r.id === t.id)) {
            map[todayStr].push({ ...t, dueDate: todayStr });
          }
        }
      });
    }

    return map;
  }, [tasks, weekDateStrs, todayStart]);

  // Overload detection
  const overloadDays = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [day, dayTasks] of Object.entries(tasksByDay)) {
      const uniqueProjects = new Set(dayTasks.map(t => t.projectId));
      if (uniqueProjects.size >= 3) result[day] = uniqueProjects.size;
    }
    return result;
  }, [tasksByDay]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'timeline-task') setActiveDragTask(data.task as Task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    if (activeData?.type === 'timeline-task' && overData?.type === 'timeline-day') {
      const task = activeData.task as Task;
      const targetDate = overData.date as string;
      if ((task.scheduledDate || task.dueDate) !== targetDate) {
        onUpdateTask({ ...task, scheduledDate: targetDate, dueDate: targetDate });
      }
    }
  };

  return (
    <TooltipProvider>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          {weekDates.map(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            return (
              <TimelineDayColumn
                key={dateStr}
                dayDate={d}
                tasks={tasksByDay[dateStr] || []}
                allTasks={tasks}
                projects={projects}
                sections={sections}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                overloadCount={overloadDays[dateStr]}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeDragTask ? (() => {
            const dragProject = projects.find(p => p.id === activeDragTask.projectId);
            const dragSection = sections.find(s => s.id === activeDragTask.section);
            return (
              <div
                className="flex flex-col gap-0.5 px-2 py-1.5 rounded-md"
                style={{
                  background: 'var(--bg-elevated)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)',
                  transform: 'scale(1.02)',
                  minWidth: 100,
                  maxWidth: 180,
                }}
              >
                <span className="text-[11px] leading-[1.4] truncate" style={{ color: 'var(--text-primary)' }}>
                  {activeDragTask.name}
                </span>
                <span className="truncate flex items-center gap-1" style={{ fontSize: 9, color: 'var(--text-placeholder)', lineHeight: 1.3 }}>
                  <span className="flex-shrink-0 rounded-full" style={{ width: 5, height: 5, background: dragProject?.color || 'var(--accent-blue)', opacity: 0.75 }} />
                  {dragProject && <span>{dragProject.name}</span>}
                  {dragProject && dragSection && <span>·</span>}
                  {dragSection && <span className="truncate">{dragSection.title}</span>}
                </span>
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}
