import { useMemo, useState, useCallback } from 'react';
import {
  startOfWeek, addDays, format, isToday, isBefore, startOfDay, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragStartEvent, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus, Project, Section } from '@/types/task';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

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

/* ── Draggable task bar ────────────────────────── */
function TaskBar({
  task,
  color,
  dayIndex,
  totalDays,
  onSelectTask,
  sections,
  projectName,
}: {
  task: Task;
  color: string;
  dayIndex: number;
  totalDays: number;
  onSelectTask: (t: Task) => void;
  sections: Section[];
  projectName: string;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({
    id: `timeline-${task.id}`,
    data: { type: 'timeline-task', task },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.4 : 1,
    left: `${(dayIndex / totalDays) * 100}%`,
    width: `${(1 / totalDays) * 100}%`,
  };

  const section = sections.find(s => s.id === task.section);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className="absolute h-[28px] rounded-[6px] px-2 flex items-center cursor-grab active:cursor-grabbing select-none overflow-hidden"
          onClick={(e) => { e.stopPropagation(); onSelectTask(task); }}
        >
          <div
            className="absolute inset-0 rounded-[6px]"
            style={{ background: color, opacity: 0.7 }}
          />
          <span className="relative z-10 text-[11px] font-medium truncate text-primary-foreground drop-shadow-sm">
            {task.name}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-56 p-3 space-y-1.5">
        <p className="text-[13px] font-semibold text-foreground">{task.name}</p>
        <p className="text-[11px] text-muted-foreground">Cliente: {projectName}</p>
        {section && (
          <p className="text-[11px] text-muted-foreground">Seção: {section.title}</p>
        )}
        {task.dueDate && (
          <p className="text-[11px] text-muted-foreground">
            Data: {format(parseISO(task.dueDate), "dd/MM/yyyy")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ── Drop cell for a specific client+day ─────── */
function DayDropCell({ clientId, dateStr, children }: { clientId: string; dateStr: string; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${clientId}-${dateStr}`,
    data: { type: 'timeline-day', date: dateStr, clientId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 border-r border-border last:border-r-0 min-h-[28px] transition-colors ${
        isOver ? 'bg-accent/10' : ''
      }`}
    >
      {children}
    </div>
  );
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
  const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // Tasks in this week (non-subtask, with dueDate in range)
  const weekDateStrs = useMemo(() => weekDates.map(d => format(d, 'yyyy-MM-dd')), [weekDates]);

  const weekTasks = useMemo(() => {
    return tasks.filter(t => !t.parentTaskId && t.dueDate && weekDateStrs.includes(t.dueDate));
  }, [tasks, weekDateStrs]);

  // Also include rollover tasks (overdue from before this week that aren't done)
  const allRelevantTasks = useMemo(() => {
    const overdue = tasks.filter(t => {
      if (t.parentTaskId || !t.dueDate || t.status === 'done') return false;
      const due = parseISO(t.dueDate);
      return isBefore(startOfDay(due), todayStart) && !weekDateStrs.includes(t.dueDate);
    });
    // Place overdue tasks on today
    const todayStr = format(todayStart, 'yyyy-MM-dd');
    const mapped = overdue.map(t => ({ ...t, dueDate: todayStr }));
    return [...weekTasks, ...mapped];
  }, [weekTasks, tasks, todayStart, weekDateStrs]);

  // Group by project (client)
  const clientRows = useMemo(() => {
    const map = new Map<string, { project: Project; tasks: Task[] }>();
    for (const t of allRelevantTasks) {
      const p = projects.find(pr => pr.id === t.projectId);
      if (!p) continue;
      if (!map.has(p.id)) map.set(p.id, { project: p, tasks: [] });
      map.get(p.id)!.tasks.push(t);
    }
    return Array.from(map.values());
  }, [allRelevantTasks, projects]);

  // Overload indicator: days with 3+ different clients
  const overloadDays = useMemo(() => {
    const dayClients: Record<string, Set<string>> = {};
    weekDateStrs.forEach(d => { dayClients[d] = new Set(); });
    for (const t of allRelevantTasks) {
      if (t.dueDate && dayClients[t.dueDate]) {
        dayClients[t.dueDate].add(t.projectId);
      }
    }
    const result: Record<string, number> = {};
    for (const [day, clients] of Object.entries(dayClients)) {
      if (clients.size >= 3) result[day] = clients.size;
    }
    return result;
  }, [allRelevantTasks, weekDateStrs]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'timeline-task') {
      setActiveDragTask(data.task as Task);
    }
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
      if (task.dueDate !== targetDate) {
        onUpdateTask({ ...task, dueDate: targetDate });
      }
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile landscape hint */}
        <div className="md:hidden flex items-center justify-center h-8 text-[10px] text-nd-text-muted border-b border-nd-border" style={{ background: 'hsl(var(--bg-surface))' }}>
          📱 Rotacione para paisagem para melhor visualização
        </div>

        {/* Sticky header row with day labels */}
        <div className="flex border-b border-border flex-shrink-0 sticky top-0 z-20" style={{ background: 'hsl(var(--bg-app))' }}>
          {/* Client name column spacer */}
          <div className="w-[100px] md:w-[160px] flex-shrink-0 border-r border-border sticky left-0 z-30" style={{ background: 'hsl(var(--bg-app))' }} />
          {/* Day headers */}
          {weekDates.map((d, i) => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const overload = overloadDays[dateStr];
            const current = isToday(d);
            return (
              <div
                key={dateStr}
                className={`flex-1 min-w-[80px] md:min-w-[100px] flex flex-col items-center justify-center h-12 border-r border-border last:border-r-0 relative ${
                  current ? 'border-t-2 border-t-primary' : ''
                }`}
                style={overload ? { background: 'hsla(42, 60%, 55%, 0.08)' } : undefined}
              >
                <span className={`text-[11px] uppercase tracking-wider ${current ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {DAY_LABELS[i]}
                </span>
                <span className={`text-[13px] font-semibold ${current ? 'text-primary' : 'text-foreground'}`}>
                  {format(d, 'dd')}
                </span>
                {overload && (
                  <span className="absolute bottom-0.5 text-[9px] text-muted-foreground">{overload} clientes</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Client rows */}
        <div className="flex-1 overflow-auto">
          {clientRows.length === 0 && (
            <div className="flex items-center justify-center h-40">
              <span className="text-[13px] text-muted-foreground">Nenhuma tarefa agendada esta semana</span>
            </div>
          )}
          {clientRows.map((row, rowIdx) => {
            // Group tasks by day for this client
            const tasksByDay: Record<string, Task[]> = {};
            weekDateStrs.forEach(d => { tasksByDay[d] = []; });
            row.tasks.forEach(t => {
              if (t.dueDate && tasksByDay[t.dueDate]) tasksByDay[t.dueDate].push(t);
            });

            // Calculate row height based on max tasks in a single day
            const maxTasks = Math.max(1, ...Object.values(tasksByDay).map(arr => arr.length));
            const rowHeight = Math.max(60, maxTasks * 32 + 8);

            return (
              <div
                key={row.project.id}
                className="flex border-b border-border"
                style={{
                  minHeight: `${rowHeight}px`,
                  background: rowIdx % 2 === 0
                    ? '#1A1A28'
                    : '#1E1E30',
                }}
              >
                {/* Client label (sticky left) */}
                <div className="w-[100px] md:w-[160px] flex-shrink-0 border-r border-border flex items-center gap-2 px-2 md:px-3 sticky left-0 z-10"
                  style={{
                    background: rowIdx % 2 === 0
                      ? '#1A1A28'
                      : '#1E1E30',
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.project.color }} />
                  <span className="text-[12px] font-medium text-foreground truncate">{row.project.name}</span>
                </div>

                {/* Day cells */}
                {weekDates.map((d, dayIdx) => {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const dayTasks = tasksByDay[dateStr];
                  const overload = overloadDays[dateStr];

                  return (
                    <DayDropCell key={dateStr} clientId={row.project.id} dateStr={dateStr}>
                      <div
                        className="relative h-full p-1 space-y-1"
                        style={overload ? { background: 'hsla(42, 60%, 55%, 0.04)' } : undefined}
                      >
                        {dayTasks.map(task => (
                          <div key={task.id} className="relative h-[28px]">
                            <div
                              className="h-[28px] rounded-[6px] px-2 flex items-center cursor-pointer select-none overflow-hidden"
                              style={{ background: `${row.project.color}B3` }}
                              onClick={() => onSelectTask(task)}
                            >
                              <span className="text-[11px] font-medium truncate text-primary-foreground drop-shadow-sm">
                                {task.name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
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
            className="h-[28px] rounded-[6px] px-2 flex items-center shadow-lg border border-primary/30"
            style={{
              background: projects.find(p => p.id === activeDragTask.projectId)?.color || '#4A90D9',
              opacity: 0.85,
              minWidth: 120,
            }}
          >
            <span className="text-[11px] font-medium text-primary-foreground truncate">{activeDragTask.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
