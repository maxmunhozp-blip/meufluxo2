import { useMemo, useState } from 'react';
import {
  format, isToday, isBefore, startOfDay, parseISO,
} from 'date-fns';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragStartEvent, DragOverlay, useDroppable,
} from '@dnd-kit/core';
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

/* ── Drop cell for a specific client row + day ─────── */
function DayDropCell({ clientKey, dateStr, isToday: isTodayCol, overloadCount, children }: {
  clientKey: string;
  dateStr: string;
  isToday: boolean;
  overloadCount?: number;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${clientKey}-${dateStr}`,
    data: { type: 'timeline-day', date: dateStr, clientKey },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[80px] md:min-w-[100px] p-1 space-y-1"
      style={{
        borderRight: '1px solid var(--border-subtle)',
        background: isOver
          ? 'var(--accent-subtle)'
          : isTodayCol
            ? 'var(--accent-subtle)'
            : overloadCount
              ? 'var(--warning-bg)'
              : undefined,
        transition: 'background 120ms ease-out',
      }}
    >
      {children}
    </div>
  );
}

/* ── Client row type ─────── */
interface ClientRow {
  key: string;
  displayName: string;
  projects: { project: Project; sectionId: string }[];
  tasks: Task[];
}

/* ── Main Timeline View ──────────────────────── */
export function WeekTimelineView({
  tasks,
  projects,
  sections,
  weekDates,
  onUpdateTask,
  onStatusChange,
  onSelectTask,
  selectedTaskId,
}: WeekTimelineViewProps) {
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const weekDateStrs = useMemo(() => weekDates.map(d => format(d, 'yyyy-MM-dd')), [weekDates]);

  const allRelevantTasks = useMemo(() => {
    const result: Task[] = [];
    tasks.forEach(t => {
      if (t.parentTaskId) return;
      const dateKey = t.scheduledDate || t.dueDate;
      if (dateKey && weekDateStrs.includes(dateKey)) {
        result.push({ ...t, dueDate: dateKey });
      }
      const collectSubs = (subs: typeof t.subtasks) => {
        if (!subs) return;
        for (const sub of subs) {
          const subDate = sub.scheduledDate || sub.dueDate;
          if (subDate && weekDateStrs.includes(subDate)) {
            if (!result.some(r => r.id === sub.id)) {
              result.push({
                id: sub.id, name: sub.name, status: sub.status,
                priority: sub.priority || 'low', description: sub.description,
                dueDate: subDate, scheduledDate: sub.scheduledDate,
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

    const todayStr = format(todayStart, 'yyyy-MM-dd');
    tasks.forEach(t => {
      if (t.parentTaskId || t.status === 'done') return;
      const dateKey = t.scheduledDate || t.dueDate;
      if (!dateKey) return;
      const due = parseISO(dateKey);
      if (isBefore(startOfDay(due), todayStart) && !weekDateStrs.includes(dateKey)) {
        if (!result.some(r => r.id === t.id)) {
          result.push({ ...t, dueDate: todayStr });
        }
      }
    });

    return result;
  }, [tasks, weekDateStrs, todayStart]);

  const clientRows = useMemo(() => {
    const map = new Map<string, ClientRow>();

    for (const t of allRelevantTasks) {
      const section = sections.find(s => s.id === t.section);
      const project = projects.find(p => p.id === t.projectId);
      if (!project) continue;

      const sectionName = section?.title || project.name;
      const key = sectionName.trim().toLowerCase();

      if (!map.has(key)) {
        map.set(key, { key, displayName: sectionName.trim(), projects: [], tasks: [] });
      }

      const row = map.get(key)!;
      row.tasks.push(t);
      if (!row.projects.some(p => p.project.id === project.id)) {
        row.projects.push({ project, sectionId: section?.id || '' });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allRelevantTasks, sections, projects]);

  const overloadDays = useMemo(() => {
    const dayClients: Record<string, Set<string>> = {};
    weekDateStrs.forEach(d => { dayClients[d] = new Set(); });
    for (const t of allRelevantTasks) {
      const dateKey = t.dueDate || t.scheduledDate;
      if (dateKey && dayClients[dateKey]) {
        const section = sections.find(s => s.id === t.section);
        const clientKey = (section?.title || '').trim().toLowerCase();
        dayClients[dateKey].add(clientKey);
      }
    }
    const result: Record<string, number> = {};
    for (const [day, clients] of Object.entries(dayClients)) {
      if (clients.size >= 3) result[day] = clients.size;
    }
    return result;
  }, [allRelevantTasks, weekDateStrs, sections]);

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

  const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

  return (
    <TooltipProvider>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sticky header row */}
          <div className="flex flex-shrink-0 sticky top-0 z-20" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
            {/* Client label column spacer */}
            <div className="w-[120px] md:w-[160px] flex-shrink-0 sticky left-0 z-30" style={{ background: 'var(--bg-base)', borderRight: '1px solid var(--border-subtle)' }} />
            {/* Day headers */}
            {weekDates.map((d) => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const overload = overloadDays[dateStr];
              const current = isToday(d);
              const dayOfWeek = (d.getDay() + 6) % 7;
              return (
                <div
                  key={dateStr}
                  className="flex-1 min-w-[80px] md:min-w-[100px] flex flex-col items-center justify-center h-12 relative"
                  style={{
                    borderRight: '1px solid var(--border-subtle)',
                    background: current ? 'var(--accent-subtle)' : undefined,
                  }}
                >
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: current ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: 0.5,
                  }}>
                    {DAY_LABELS[dayOfWeek]}
                  </span>
                  <span style={{
                    fontSize: 16,
                    fontWeight: current ? 700 : 500,
                    color: current ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  }}>
                    {format(d, 'dd')}
                  </span>
                  {overload && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">{overload} clientes neste dia — considere redistribuir</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>

          {/* Client rows */}
          <div className="flex-1 overflow-auto">
            {clientRows.length === 0 && (
              <div className="flex items-center justify-center h-40">
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Nenhuma tarefa agendada esta semana</span>
              </div>
            )}
            {clientRows.map((row) => {
              const tasksByDay: Record<string, Task[]> = {};
              weekDateStrs.forEach(d => { tasksByDay[d] = []; });
              row.tasks.forEach(t => {
                const dateKey = t.dueDate || t.scheduledDate;
                if (dateKey && tasksByDay[dateKey]) tasksByDay[dateKey].push(t);
              });

              const maxTasks = Math.max(1, ...Object.values(tasksByDay).map(arr => arr.length));
              const rowHeight = Math.max(48, maxTasks * 32 + 12);
              const projectNames = row.projects.map(p => p.project.name).join(', ');

              return (
                <div
                  key={row.key}
                  className="flex"
                  style={{
                    minHeight: `${rowHeight}px`,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Client label (sticky left) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="w-[120px] md:w-[160px] flex-shrink-0 flex items-center gap-1.5 px-2 md:px-3 sticky left-0 z-10 cursor-default"
                        style={{
                          background: 'var(--bg-base)',
                          borderRight: '1px solid var(--border-subtle)',
                        }}
                      >
                        {/* Project color dots */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {row.projects.map(p => (
                            <span
                              key={p.project.id}
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: p.project.color }}
                            />
                          ))}
                        </div>
                        <span className="truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                          {row.displayName}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs">{projectNames}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Day cells */}
                  {weekDates.map((d) => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const dayTasks = tasksByDay[dateStr];

                    return (
                      <DayDropCell
                        key={dateStr}
                        clientKey={row.key}
                        dateStr={dateStr}
                        isToday={isToday(d)}
                        overloadCount={overloadDays[dateStr]}
                      >
                        {dayTasks.map(task => {
                          const project = row.projects.find(p => p.project.id === task.projectId)?.project;
                          return (
                            <div
                              key={task.id}
                              className="px-2 py-1.5 flex flex-col gap-0.5 cursor-pointer select-none overflow-hidden"
                              style={{
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-elevated)',
                                transition: 'all 150ms ease-out',
                              }}
                              onClick={() => onSelectTask(task)}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                            >
                              {/* Line 1: Context */}
                              <span className="truncate flex items-center gap-1" style={{ fontSize: 9, color: 'var(--text-secondary)', opacity: 0.55, fontWeight: 400, lineHeight: 1.3 }}>
                                <span
                                  className="flex-shrink-0 rounded-full"
                                  style={{ width: 5, height: 5, background: project?.color || 'var(--accent-blue)', opacity: 0.85 }}
                                />
                                {(() => {
                                  const section = sections.find(s => s.id === task.section);
                                  const parent = task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId) : null;
                                  const parts: string[] = [];
                                  if (section) parts.push(section.title);
                                  if (parent) parts.push(parent.name);
                                  return parts.length > 0 ? <span className="truncate">{parts.join(' · ')}</span> : null;
                                })()}
                              </span>
                              {/* Line 2: Title */}
                              <span className="truncate" style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                {task.name}
                              </span>
                            </div>
                          );
                        })}
                      </DayDropCell>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeDragTask ? (
            <div
              className="px-2.5 py-1.5 flex flex-col gap-0.5 shadow-lg"
              style={{
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)',
                opacity: 0.9,
                minWidth: 120,
              }}
            >
              <span className="truncate" style={{ fontSize: 11, color: 'var(--text-primary)' }}>{activeDragTask.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}
