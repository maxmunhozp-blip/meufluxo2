import { useMemo, useState, useCallback } from 'react';
import { format, isToday, parseISO, startOfDay, isBefore, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragStartEvent, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Target, ArrowRight, Repeat, Sunrise, Sun, Moon } from 'lucide-react';
import { Task, TaskStatus, Project, Section, DayPeriod, ServiceTag } from '@/types/task';
import { getTagIcon } from './ServiceTagsManager';
import { StatusCheckbox } from './StatusCheckbox';
import { FocusMode } from './FocusMode';

interface MyDayViewProps {
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  serviceTags?: ServiceTag[];
  userName: string;
  onUpdateTask: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  onNavigateToWeek: () => void;
}

type GroupMode = 'period' | 'service';

const PERIODS: { key: DayPeriod; label: string; icon: typeof Sunrise }[] = [
  { key: 'morning', label: 'Manhã', icon: Sunrise },
  { key: 'afternoon', label: 'Tarde', icon: Sun },
  { key: 'evening', label: 'Noite', icon: Moon },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getCurrentPeriod(): DayPeriod {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function getPeriodOrder(period: DayPeriod): number {
  if (period === 'morning') return 0;
  if (period === 'afternoon') return 1;
  return 2;
}

/* ── Sortable task card ────────────────── */
function DayTaskCard({
  task,
  projectColor,
  projectName,
  isSelected,
  onSelect,
  onStatusChange,
  rolloverDays,
  serviceTagName,
  subtaskCount,
}: {
  task: Task;
  projectColor: string;
  projectName: string;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (id: string, s: TaskStatus) => void;
  rolloverDays?: number;
  serviceTagName?: string;
  subtaskCount?: { done: number; total: number };
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id, data: { type: 'day-task', task } });

  const [completing, setCompleting] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || `transform 150ms cubic-bezier(0.22,1,0.36,1)`,
    opacity: isDragging ? 0.9 : 1,
    scale: isDragging ? '1.02' : completing ? '0.98' : '1',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.4)' : 'none',
    borderLeft: `3px solid ${projectColor}`,
  };

  const handleStatus = (s: TaskStatus) => {
    if (s === 'done') {
      setCompleting(true);
      setTimeout(() => {
        onStatusChange(task.id, s);
        setCompleting(false);
      }, 400);
    } else {
      onStatusChange(task.id, s);
    }
  };

  const isDone = task.status === 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 rounded-lg cursor-pointer group transition-all ${
        completing ? 'opacity-50 animate-card-collapse' : ''
      } ${isSelected ? 'ring-1 ring-accent/30' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      {/* Drag handle + checkbox */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusCheckbox status={task.status} onChange={handleStatus} size={20} />
      </div>

      {/* Title */}
      <span className={`flex-1 min-w-0 text-sm leading-tight truncate transition-all duration-200 ${
        isDone ? 'line-through opacity-50' : ''
      }`} style={{ color: isDone ? '#555570' : '#E8E8F0' }}>
        {task.name}
      </span>

      {/* Subtask count */}
      {subtaskCount && subtaskCount.total > 0 && (
        <span className="text-[11px] flex-shrink-0" style={{ color: '#8888A0' }}>
          {subtaskCount.done}/{subtaskCount.total}
        </span>
      )}

      {/* Rollover badge */}
      {rolloverDays != null && rolloverDays > 0 && (
        <span className="text-[10px] font-medium rounded px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap"
          style={{ background: 'hsl(30 100% 71% / 0.15)', color: '#FFB86C' }}
        >
          ← {rolloverDays === 1 ? 'ontem' : `${rolloverDays} dias`}
        </span>
      )}

      {/* Recurrence icon */}
      {task.recurrenceType && <Repeat className="w-3 h-3 flex-shrink-0" style={{ color: '#6C9CFC50' }} />}

      {/* Service tag badge */}
      {serviceTagName && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 max-w-[80px] truncate" style={{ color: '#8888A0' }}>
          {serviceTagName}
        </span>
      )}

      {/* Client badge */}
      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 max-w-[100px] truncate"
        style={{ background: `${projectColor}26`, color: projectColor }}
      >
        {projectName}
      </span>
    </div>
  );
}

/* ── Period drop zone ──────────────────── */
function PeriodSection({
  period,
  tasks,
  projects,
  isCurrentPeriod,
  isPast,
  selectedTaskId,
  onSelectTask,
  onStatusChange,
  rolloverMap,
  serviceTagMap,
}: {
  period: typeof PERIODS[number];
  tasks: Task[];
  projects: Project[];
  isCurrentPeriod: boolean;
  isPast: boolean;
  selectedTaskId?: string;
  onSelectTask: (t: Task) => void;
  onStatusChange: (id: string, s: TaskStatus) => void;
  rolloverMap: Map<string, number>;
  serviceTagMap: Map<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `period-${period.key}`,
    data: { type: 'period-drop', period: period.key },
  });

  const PeriodIcon = period.icon;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl transition-all duration-200 ${
        isOver ? 'ring-1 ring-primary/40' : ''
      }`}
      style={{
        opacity: isPast ? 0.5 : 1,
        background: isCurrentPeriod ? '#1A1A28' : 'transparent',
        borderLeft: isCurrentPeriod ? '2px solid #6C9CFC' : '2px solid transparent',
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <PeriodIcon className="w-4 h-4 flex-shrink-0" style={{ color: isCurrentPeriod ? '#E8E8F0' : '#8888A0' }} />
        <span className="text-[13px] font-semibold" style={{ color: isCurrentPeriod ? '#E8E8F0' : '#8888A0' }}>
          {period.label}
        </span>
      </div>

      {/* Task list */}
      <div className="px-2 pb-3 space-y-0.5 min-h-[48px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const subtasks = task.subtasks || [];
            const subtaskCount = subtasks.length > 0
              ? { done: subtasks.filter(s => s.status === 'done').length, total: subtasks.length }
              : undefined;
            return (
              <DayTaskCard
                key={task.id}
                task={task}
                projectColor={project?.color || '#6C9CFC'}
                projectName={project?.name || ''}
                isSelected={selectedTaskId === task.id}
                onSelect={() => onSelectTask(task)}
                onStatusChange={onStatusChange}
                rolloverDays={rolloverMap.get(task.id)}
                serviceTagName={task.serviceTagId ? serviceTagMap.get(task.serviceTagId) : undefined}
                subtaskCount={subtaskCount}
              />
            );
          })}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center h-[40px] px-4">
            <span className="text-[12px] italic" style={{ color: '#555570' }}>Sem tarefas</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main MyDayView ────────────────────── */
export function MyDayView({
  tasks,
  projects,
  sections,
  serviceTags = [],
  userName,
  onUpdateTask,
  onStatusChange,
  onSelectTask,
  selectedTaskId,
  onNavigateToWeek,
}: MyDayViewProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>('period');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const currentPeriodOrder = getPeriodOrder(currentPeriod);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Tasks for today + overdue rollover tasks
  const { todayTasks, rolloverMap } = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const scheduled = tasks.filter(t => !t.parentTaskId && t.dueDate === todayStr);
    const overdue: Task[] = [];
    const rMap = new Map<string, number>();

    tasks.forEach(t => {
      if (t.parentTaskId || t.status === 'done' || !t.dueDate || t.dueDate === todayStr) return;
      const dueDate = parseISO(t.dueDate);
      if (isBefore(startOfDay(dueDate), todayStart)) {
        const days = t.rolloverCount && t.rolloverCount > 0
          ? t.rolloverCount
          : differenceInCalendarDays(todayStart, dueDate);
        rMap.set(t.id, days);
        overdue.push(t);
      }
    });

    return { todayTasks: [...overdue, ...scheduled], rolloverMap: rMap };
  }, [tasks, todayStr]);

  const tasksByPeriod = useMemo(() => {
    const map: Record<DayPeriod, Task[]> = { morning: [], afternoon: [], evening: [] };
    todayTasks.forEach(t => {
      const p = rolloverMap.has(t.id) ? 'morning' : (t.dayPeriod || 'morning');
      map[p].push(t);
    });
    return map;
  }, [todayTasks, rolloverMap]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'day-task') {
      setActiveDragId(data.task.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'day-task' && overData?.type === 'period-drop') {
      const task = activeData.task as Task;
      const targetPeriod = overData.period as DayPeriod;
      if (task.dayPeriod !== targetPeriod) {
        onUpdateTask({ ...task, dayPeriod: targetPeriod });
      }
      return;
    }

    if (activeData?.type === 'day-task' && overData?.type === 'day-task') {
      const draggedTask = activeData.task as Task;
      const targetTask = overData.task as Task;
      if (draggedTask.dayPeriod !== targetTask.dayPeriod) {
        onUpdateTask({ ...draggedTask, dayPeriod: targetTask.dayPeriod });
      }
    }
  };

  const activeDragTask = activeDragId ? tasks.find(t => t.id === activeDragId) : null;
  const firstName = userName?.split(' ')[0] || 'Usuário';

  const serviceTagMap = useMemo(() => {
    const map = new Map<string, string>();
    serviceTags.forEach(t => map.set(t.id, t.name));
    return map;
  }, [serviceTags]);

  const tasksByService = useMemo(() => {
    const map: Record<string, Task[]> = {};
    todayTasks.forEach(t => {
      const key = t.serviceTagId || '__none__';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [todayTasks]);

  const allEmpty = todayTasks.length === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0" style={{ background: '#0F0F17' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: '#E8E8F0' }}>
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: '#8888A0' }}>
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {serviceTags.length > 0 && (
              <select
                value={groupMode}
                onChange={e => setGroupMode(e.target.value as GroupMode)}
                className="h-8 px-2 text-[11px] bg-transparent border rounded-lg focus:outline-none cursor-pointer [color-scheme:dark]"
                style={{ color: '#8888A0', borderColor: '#2A2A42' }}
              >
                <option value="period">Por seção</option>
                <option value="service">Por serviço</option>
              </select>
            )}
            <button
              className="flex items-center gap-2 px-3.5 h-8 rounded-lg text-[12px] font-medium transition-colors"
              style={{ background: '#6C9CFC1A', color: '#6C9CFC' }}
              onClick={() => setFocusModeOpen(true)}
            >
              <Target className="w-3.5 h-3.5" />
              Focar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {groupMode === 'service' ? (
          <div className="space-y-6 max-w-[640px] mx-auto">
            {Object.entries(tasksByService).map(([tagId, tagTasks]) => {
              const tag = serviceTags.find(t => t.id === tagId);
              const TagIcon = tag ? getTagIcon(tag.icon) : null;
              const label = tag?.name || 'Sem serviço';
              return (
                <div key={tagId} className="rounded-xl" style={{ background: '#1A1A28' }}>
                  <div className="flex items-center gap-2 px-4 py-3">
                    {TagIcon && <TagIcon className="w-4 h-4" style={{ color: '#8888A0' }} />}
                    <span className="text-[13px] font-semibold" style={{ color: '#E8E8F0' }}>{label}</span>
                    <span className="text-[11px] ml-auto" style={{ color: '#8888A0' }}>
                      {tagTasks.filter(t => t.status !== 'done').length} {tagTasks.filter(t => t.status !== 'done').length === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>
                  <div className="px-2 pb-3 space-y-0.5">
                    {tagTasks.map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <DayTaskCard
                          key={task.id}
                          task={task}
                          projectColor={project?.color || '#6C9CFC'}
                          projectName={project?.name || ''}
                          isSelected={selectedTaskId === task.id}
                          onSelect={() => onSelectTask(task)}
                          onStatusChange={onStatusChange}
                          rolloverDays={rolloverMap.get(task.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {allEmpty && (
              <div className="flex flex-col items-center justify-center h-full gap-3 pt-12">
                <p className="text-[14px]" style={{ color: '#8888A0' }}>Nenhuma tarefa para hoje.</p>
                <button onClick={onNavigateToWeek} className="flex items-center gap-1.5 text-[13px] hover:underline" style={{ color: '#6C9CFC' }}>
                  Planeje na Minha Semana <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4 max-w-[640px] mx-auto">
              {PERIODS.map(period => {
                const periodOrder = getPeriodOrder(period.key);
                const isPast = periodOrder < currentPeriodOrder;
                return (
                  <PeriodSection
                    key={period.key}
                    period={period}
                    tasks={tasksByPeriod[period.key]}
                    projects={projects}
                    isCurrentPeriod={currentPeriod === period.key}
                    isPast={isPast}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={onSelectTask}
                    onStatusChange={onStatusChange}
                    rolloverMap={rolloverMap}
                    serviceTagMap={serviceTagMap}
                  />
                );
              })}

              {/* "Planeje" link only if ALL sections empty */}
              {allEmpty && (
                <div className="flex flex-col items-center gap-3 pt-4">
                  <button onClick={onNavigateToWeek} className="flex items-center gap-1.5 text-[13px] hover:underline" style={{ color: '#6C9CFC' }}>
                    Planeje na Minha Semana <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
              {activeDragTask ? (
                <div
                  className="h-[40px] flex items-center gap-2 px-3 rounded-lg shadow-lg"
                  style={{ background: '#1A1A28', borderLeft: `3px solid ${projects.find(p => p.id === activeDragTask.projectId)?.color || '#6C9CFC'}`, opacity: 0.95 }}
                >
                  <span className="text-[13px] truncate" style={{ color: '#E8E8F0' }}>{activeDragTask.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Focus Mode */}
      {focusModeOpen && (
        <FocusMode
          tasks={tasks}
          projects={projects}
          onStatusChange={onStatusChange}
          onClose={() => setFocusModeOpen(false)}
        />
      )}
    </div>
  );
}
