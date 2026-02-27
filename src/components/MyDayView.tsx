import { useMemo, useState, useCallback } from 'react';
import { format, isToday, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragStartEvent, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Target, ArrowRight } from 'lucide-react';
import { Task, TaskStatus, Project, Section, DayPeriod } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';

interface MyDayViewProps {
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  userName: string;
  onUpdateTask: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  onNavigateToWeek: () => void;
}

const PERIODS: { key: DayPeriod; label: string; emoji: string }[] = [
  { key: 'morning', label: 'Manhã', emoji: '☀️' },
  { key: 'afternoon', label: 'Tarde', emoji: '🌤️' },
  { key: 'evening', label: 'Noite', emoji: '🌙' },
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

/* ── Sortable task card ────────────────── */
function DayTaskCard({
  task,
  projectColor,
  projectName,
  isSelected,
  onSelect,
  onStatusChange,
}: {
  task: Task;
  projectColor: string;
  projectName: string;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (id: string, s: TaskStatus) => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id, data: { type: 'day-task', task } });

  const [completing, setCompleting] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms ease',
    opacity: isDragging ? 0.5 : completing ? 0 : 1,
  };

  const handleStatus = (s: TaskStatus) => {
    if (s === 'done') {
      setCompleting(true);
      setTimeout(() => {
        onStatusChange(task.id, s);
        setCompleting(false);
      }, 300);
    } else {
      onStatusChange(task.id, s);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] cursor-pointer transition-all duration-300 group ${
        isSelected
          ? 'bg-accent/15 ring-1 ring-accent/30'
          : 'hover:bg-muted/50'
      } ${completing ? 'scale-95' : ''}`}
      onClick={onSelect}
    >
      {/* Project color bar */}
      <div className="w-[3px] h-8 rounded-full flex-shrink-0 self-stretch" style={{ background: projectColor }} />

      {/* Drag handle + checkbox */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusCheckbox
          status={task.status}
          onChange={handleStatus}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={`text-[13px] leading-tight block truncate ${
          task.status === 'done' ? 'text-muted-foreground line-through opacity-60' : 'text-foreground'
        }`}>
          {task.name}
        </span>
      </div>

      {/* Project badge */}
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0 max-w-[100px] truncate">
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
  isActive,
  selectedTaskId,
  onSelectTask,
  onStatusChange,
}: {
  period: typeof PERIODS[number];
  tasks: Task[];
  projects: Project[];
  isActive: boolean;
  selectedTaskId?: string;
  onSelectTask: (t: Task) => void;
  onStatusChange: (id: string, s: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `period-${period.key}`,
    data: { type: 'period-drop', period: period.key },
  });

  const pendingCount = tasks.filter(t => t.status !== 'done').length;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl transition-all duration-300 ${
        isOver ? 'ring-1 ring-primary/40' : ''
      } ${isActive ? 'opacity-100' : 'opacity-70'}`}
      style={{
        background: isActive ? 'hsl(var(--bg-surface))' : 'hsl(var(--bg-app))',
        borderLeft: isActive ? '2px solid hsl(var(--accent))' : '2px solid transparent',
      }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[14px] font-semibold text-foreground">
          {period.emoji} {period.label}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {pendingCount} {pendingCount === 1 ? 'tarefa' : 'tarefas'}
        </span>
      </div>

      {/* Task list */}
      <div className="px-2 pb-3 space-y-1 min-h-[60px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            return (
              <DayTaskCard
                key={task.id}
                task={task}
                projectColor={project?.color || '#4A90D9'}
                projectName={project?.name || ''}
                isSelected={selectedTaskId === task.id}
                onSelect={() => onSelectTask(task)}
                onStatusChange={onStatusChange}
              />
            );
          })}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-[48px]">
            <span className="text-[12px] text-muted-foreground">Arraste tarefas aqui</span>
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
  userName,
  onUpdateTask,
  onStatusChange,
  onSelectTask,
  selectedTaskId,
  onNavigateToWeek,
}: MyDayViewProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Tasks for today grouped by period
  const todayTasks = useMemo(() => {
    return tasks.filter(t => !t.parentTaskId && t.dueDate === todayStr);
  }, [tasks, todayStr]);

  const tasksByPeriod = useMemo(() => {
    const map: Record<DayPeriod, Task[]> = { morning: [], afternoon: [], evening: [] };
    todayTasks.forEach(t => {
      const p = t.dayPeriod || 'morning';
      map[p].push(t);
    });
    return map;
  }, [todayTasks]);

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

    // Dropped onto a period section
    if (activeData?.type === 'day-task' && overData?.type === 'period-drop') {
      const task = activeData.task as Task;
      const targetPeriod = overData.period as DayPeriod;
      if (task.dayPeriod !== targetPeriod) {
        onUpdateTask({ ...task, dayPeriod: targetPeriod });
      }
      return;
    }

    // Dropped onto another task (move to that task's period)
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0" style={{ background: 'hsl(var(--bg-app))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-foreground">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-3.5 h-8 rounded-lg text-[12px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            onClick={() => {/* TODO: focus mode */}}
          >
            <Target className="w-3.5 h-3.5" />
            Focar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {todayTasks.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-[14px] text-muted-foreground">Nenhuma tarefa para hoje.</p>
            <button
              onClick={onNavigateToWeek}
              className="flex items-center gap-1.5 text-[13px] text-primary hover:underline"
            >
              Planeje na Minha Semana
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6 max-w-[640px] mx-auto">
              {PERIODS.map(period => (
                <PeriodSection
                  key={period.key}
                  period={period}
                  tasks={tasksByPeriod[period.key]}
                  projects={projects}
                  isActive={currentPeriod === period.key}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={onSelectTask}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
              {activeDragTask ? (
                <div
                  className="h-[40px] flex items-center gap-2 px-3 rounded-[10px] shadow-lg border border-primary/30"
                  style={{ background: 'hsl(var(--bg-surface))', opacity: 0.95 }}
                >
                  <div
                    className="w-[3px] h-6 rounded-full"
                    style={{ background: projects.find(p => p.id === activeDragTask.projectId)?.color || '#4A90D9' }}
                  />
                  <span className="text-[13px] text-foreground truncate">{activeDragTask.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
