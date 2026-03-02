import { useMemo, useState, useCallback } from 'react';
import { format, parseISO, startOfDay, isBefore, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragStartEvent, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Target, ArrowRight, Repeat, Sunrise, Sun, Moon, ChevronDown } from 'lucide-react';
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
  isPro?: boolean;
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

/* ── Task card ── */
function DayTaskCard({
  task, projectColor, isSelected, onSelect, onStatusChange, showProjectBadge, projectName, rolloverDays, sectionName,
}: {
  task: Task; projectColor: string; isSelected: boolean; onSelect: () => void;
  onStatusChange: (id: string, s: TaskStatus) => void; showProjectBadge?: boolean; projectName?: string; rolloverDays?: number; sectionName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'day-task', task } });
  const [completing, setCompleting] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.22,1,0.36,1)',
    opacity: isDragging ? 0.9 : 1,
  };

  const handleStatus = (s: TaskStatus) => {
    if (s === 'done') { setCompleting(true); setTimeout(() => { onStatusChange(task.id, s); setCompleting(false); }, 400); }
    else { onStatusChange(task.id, s); }
  };

  const isDone = task.status === 'done';

  return (
    <div ref={setNodeRef} style={style} className="flex items-center h-[44px] cursor-pointer group" onClick={onSelect} role="button" tabIndex={0}
      onMouseEnter={e => { if (!isDone) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      <div className="w-4 flex-shrink-0 flex items-center justify-center">
        <span className="flex-shrink-0 rounded-full" style={{ width: 6, height: 6, background: projectColor }} />
      </div>
      <div className="w-1 flex-shrink-0" />
      <div {...attributes} {...listeners} className="flex-shrink-0 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
        <StatusCheckbox status={task.status} onChange={handleStatus} size={20} />
      </div>
      <div className="w-3 flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        {projectName && <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{projectName}</span>}
        {projectName && sectionName && <span style={{ color: 'var(--text-placeholder)', fontSize: 9 }}>·</span>}
        {sectionName && <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--text-placeholder)', fontWeight: 400 }}>{sectionName}</span>}
        {(projectName || sectionName) && <span style={{ color: 'var(--text-placeholder)', fontSize: 9 }}>·</span>}
        <span className={`min-w-0 text-[14px] leading-tight truncate transition-all duration-200 ${isDone ? 'line-through' : ''}`}
          style={{ color: 'var(--text-primary)', opacity: isDone || completing ? 0.4 : 1, fontWeight: 400 }}>{task.name}</span>
      </div>
      {rolloverDays && rolloverDays > 0 && (
        <span className="flex-shrink-0 ml-2 whitespace-nowrap px-1.5 py-0.5 rounded"
          style={{ fontSize: 10, color: 'var(--warning)', fontWeight: 400, background: 'var(--warning-bg)' }}>
          ← {rolloverDays === 1 ? 'ontem' : `${rolloverDays} dias`}
        </span>
      )}
      {showProjectBadge && projectName && (
        <span className="flex-shrink-0 ml-1 px-1.5 py-0.5 rounded" style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>{projectName}</span>
      )}
      {task.recurrenceType && <Repeat className="w-3 h-3 flex-shrink-0 ml-2" style={{ color: 'var(--text-tertiary)' }} />}
    </div>
  );
}

/* ── Period section ── */
function PeriodSection({
  period, tasks, projects, sections, periodState, selectedTaskId, onSelectTask, onStatusChange, showProjectBadge, rolloverMap,
}: {
  period: typeof PERIODS[number]; tasks: Task[]; projects: Project[]; sections: Section[]; periodState: 'past' | 'current' | 'future';
  selectedTaskId?: string; onSelectTask: (t: Task) => void; onStatusChange: (id: string, s: TaskStatus) => void;
  showProjectBadge?: boolean; rolloverMap: Map<string, number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `period-${period.key}`, data: { type: 'period-drop', period: period.key } });
  const PeriodIcon = period.icon;
  const headerOpacity = periodState === 'past' ? 0.4 : periodState === 'current' ? 1 : 0.7;
  const headerColor = periodState === 'current' ? 'var(--text-secondary)' : 'var(--text-tertiary)';

  return (
    <div ref={setNodeRef} className={`transition-all duration-200 ${isOver ? 'ring-1 ring-primary/30 rounded-lg' : ''}`} style={{ marginBottom: 24 }}>
      <div className="flex items-center gap-1.5 mb-2" style={{ opacity: headerOpacity, height: 20 }}>
        <PeriodIcon className="flex-shrink-0" style={{ width: 14, height: 14, color: headerColor }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: headerColor, letterSpacing: 0.5 }}>{period.label}</span>
      </div>
      {tasks.length > 0 && (
        <div className="space-y-0.5">
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              const isDone = task.status === 'done';
              const taskOpacity = periodState === 'past' && isDone ? 0.3 : 1;
              return (
                <div key={task.id} style={{ opacity: taskOpacity }}>
                  <DayTaskCard task={task} projectColor={project?.color || 'var(--accent-blue)'} isSelected={selectedTaskId === task.id}
                    onSelect={() => onSelectTask(task)} onStatusChange={onStatusChange} showProjectBadge={showProjectBadge}
                    projectName={project?.name} rolloverDays={rolloverMap.get(task.id)}
                    sectionName={sections.find(s => s.id === task.section)?.title} />
                </div>
              );
            })}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

/* ── Main MyDayView ── */
export function MyDayView({
  tasks, projects, sections, serviceTags = [], userName, isPro = false, onUpdateTask, onStatusChange, onSelectTask, selectedTaskId, onNavigateToWeek,
}: MyDayViewProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>('period');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const currentPeriodOrder = getPeriodOrder(currentPeriod);
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const { todayTasks, rolloverMap } = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const scheduled: Task[] = [];
    const scheduledIds = new Set<string>();

    const promoteSubtask = (sub: any, parent: Task): Task => ({
      ...sub,
      id: sub.id,
      name: sub.name,
      projectId: sub.projectId || parent.projectId,
      section: sub.section || parent.section,
      status: sub.status,
      parentTaskId: sub.parentTaskId,
      dayPeriod: sub.dayPeriod || parent.dayPeriod || 'morning',
    });

    tasks.forEach(t => {
      if (t.parentTaskId) return;
      let isScheduled = false;
      if (t.scheduledDate === todayStr) isScheduled = true;
      else if (t.dueDate === todayStr && !t.scheduledDate) isScheduled = true;
      if (isScheduled) { scheduled.push(t); scheduledIds.add(t.id); }

      // Check subtasks scheduled for today
      const findScheduledSubtasks = (subs: any[], parent: Task) => {
        subs.forEach(sub => {
          if (sub.scheduledDate === todayStr && sub.status !== 'done') {
            const promoted = promoteSubtask(sub, parent);
            scheduled.push(promoted);
            scheduledIds.add(sub.id);
          }
          if (sub.subtasks) findScheduledSubtasks(sub.subtasks, parent);
        });
      };
      if (t.subtasks) findScheduledSubtasks(t.subtasks, t);
    });

    const overdue: Task[] = [];
    const rMap = new Map<string, number>();
    if (isPro) {
      // Check top-level tasks for overdue
      tasks.forEach(t => {
        if (t.parentTaskId || t.status === 'done') return;
        if (scheduledIds.has(t.id)) return;
        if (t.scheduledDate && t.scheduledDate < todayStr) {
          const days = differenceInCalendarDays(todayStart, parseISO(t.scheduledDate));
          if (days > 0) { rMap.set(t.id, days); overdue.push(t); }
          return;
        }
        if (!t.scheduledDate && t.dueDate) {
          const dueDate = parseISO(t.dueDate);
          if (isBefore(startOfDay(dueDate), todayStart)) {
            const days = t.rolloverCount && t.rolloverCount > 0 ? t.rolloverCount : differenceInCalendarDays(todayStart, dueDate);
            rMap.set(t.id, days); overdue.push(t);
          }
        }

        // Check subtasks for overdue
        const findOverdueSubtasks = (subs: any[], parent: Task) => {
          subs.forEach(sub => {
            if (sub.status === 'done' || scheduledIds.has(sub.id)) return;
            if (sub.scheduledDate && sub.scheduledDate < todayStr) {
              const days = differenceInCalendarDays(todayStart, parseISO(sub.scheduledDate));
              if (days > 0) {
                const promoted = promoteSubtask(sub, parent);
                rMap.set(sub.id, days);
                overdue.push(promoted);
              }
            }
            if (sub.subtasks) findOverdueSubtasks(sub.subtasks, parent);
          });
        };
        if (t.subtasks) findOverdueSubtasks(t.subtasks, t);
      });
    }
    return { todayTasks: [...overdue, ...scheduled], rolloverMap: rMap };
  }, [tasks, todayStr]);

  const tasksByPeriod = useMemo(() => {
    const map: Record<DayPeriod, Task[]> = { morning: [], afternoon: [], evening: [] };
    todayTasks.forEach(t => { const p = rolloverMap.has(t.id) ? 'morning' : (t.dayPeriod || 'morning'); map[p].push(t); });
    Object.keys(map).forEach(key => {
      const period = key as DayPeriod;
      map[period].sort((a, b) => {
        const aRoll = rolloverMap.get(a.id) || 0; const bRoll = rolloverMap.get(b.id) || 0;
        if (aRoll > 0 && bRoll === 0) return -1; if (aRoll === 0 && bRoll > 0) return 1;
        if (aRoll > 0 && bRoll > 0) return bRoll - aRoll; return 0;
      });
    });
    return map;
  }, [todayTasks, rolloverMap]);

  const allDone = useMemo(() => todayTasks.length > 0 && todayTasks.every(t => t.status === 'done'), [todayTasks]);

  const handleDragStart = (event: DragStartEvent) => { const data = event.active.data.current; if (data?.type === 'day-task') setActiveDragId(data.task.id); };
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null); const { active, over } = event; if (!over) return;
    const activeData = active.data.current; const overData = over.data.current;
    if (activeData?.type === 'day-task' && overData?.type === 'period-drop') {
      const task = activeData.task as Task; const targetPeriod = overData.period as DayPeriod;
      if (task.dayPeriod !== targetPeriod) onUpdateTask({ ...task, dayPeriod: targetPeriod }); return;
    }
    if (activeData?.type === 'day-task' && overData?.type === 'day-task') {
      const draggedTask = activeData.task as Task; const targetTask = overData.task as Task;
      if (draggedTask.dayPeriod !== targetTask.dayPeriod) onUpdateTask({ ...draggedTask, dayPeriod: targetTask.dayPeriod });
    }
  };

  const activeDragTask = activeDragId ? tasks.find(t => t.id === activeDragId) : null;
  const firstName = userName?.split(' ')[0] || 'Usuário';
  const allEmpty = todayTasks.length === 0;

  const tasksByService = useMemo(() => {
    const map: Record<string, Task[]> = {};
    todayTasks.forEach(t => { const key = t.serviceTagId || '__none__'; if (!map[key]) map[key] = []; map[key].push(t); });
    return map;
  }, [todayTasks]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'hsl(var(--bg-app))' }}>
      {/* Header */}
      <div className="px-6 pt-6 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{getGreeting()}, {firstName}</h1>
            <p style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)', marginTop: 4 }}>
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {serviceTags.length > 0 && (
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-1 h-8 px-2 transition-colors"
                  style={{ color: 'var(--text-tertiary)', fontSize: 12 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
                  {groupMode === 'period' ? 'Por seção' : 'Por tipo de trabalho'}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 top-9 z-50 w-32 rounded-lg border overflow-hidden py-1"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}>
                      <button onClick={() => { setGroupMode('period'); setDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-[12px] transition-colors hover:bg-nd-hover"
                        style={{ color: groupMode === 'period' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Por seção</button>
                      <button onClick={() => { setGroupMode('service'); setDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-[12px] transition-colors hover:bg-nd-hover"
                        style={{ color: groupMode === 'service' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Por tipo de trabalho</button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button className="flex items-center gap-2 px-3.5 h-8 rounded-lg text-[13px] transition-colors"
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: 8 }}
              onClick={() => setFocusModeOpen(true)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
              <Target className="w-3.5 h-3.5" /> Focar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8" style={{ paddingTop: 32 }}>
        {groupMode === 'service' ? (
          <div className="max-w-[640px] mx-auto">
            {Object.entries(tasksByService).map(([tagId, tagTasks]) => {
              const tag = serviceTags.find(t => t.id === tagId);
              const TagIcon = tag ? getTagIcon(tag.icon) : null;
              const label = tag?.name || 'Sem tipo';
              return (
                <div key={tagId} style={{ marginBottom: 24 }}>
                  <div className="flex items-center gap-1.5 mb-2" style={{ height: 20, opacity: 0.7 }}>
                    {TagIcon && <TagIcon style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }} />}
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: 0.5 }}>{label}</span>
                  </div>
                  <div className="space-y-0.5">
                    {tagTasks.map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <DayTaskCard key={task.id} task={task} projectColor={project?.color || 'var(--accent-blue)'} isSelected={selectedTaskId === task.id}
                          onSelect={() => onSelectTask(task)} onStatusChange={onStatusChange} showProjectBadge projectName={project?.name}
                          rolloverDays={rolloverMap.get(task.id)}
                          sectionName={sections.find(s => s.id === task.section)?.title} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {allEmpty && <EmptyState onNavigateToWeek={onNavigateToWeek} />}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="max-w-[640px] mx-auto">
              {PERIODS.map(period => {
                const periodTasks = tasksByPeriod[period.key];
                const periodOrder = getPeriodOrder(period.key);
                const periodState: 'past' | 'current' | 'future' =
                  periodOrder < currentPeriodOrder ? 'past' : periodOrder === currentPeriodOrder ? 'current' : 'future';
                return (
                  <PeriodSection key={period.key} period={period} tasks={periodTasks} projects={projects} sections={sections} periodState={periodState}
                    selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} onStatusChange={onStatusChange} rolloverMap={rolloverMap} />
                );
              })}
              {allEmpty && <EmptyState onNavigateToWeek={onNavigateToWeek} />}
              {allDone && (
                <div className="flex items-center justify-center pt-4">
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--success)', opacity: 0.6 }}>Tudo feito por hoje ✓</span>
                </div>
              )}
            </div>
            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
              {activeDragTask ? (
                <div className="h-[44px] flex items-center gap-2 px-3 rounded-lg shadow-lg"
                  style={{ background: 'var(--bg-surface)', borderLeft: `3px solid ${projects.find(p => p.id === activeDragTask.projectId)?.color || 'var(--accent-blue)'}`, opacity: 0.95 }}>
                  <span className="text-[14px] truncate" style={{ color: 'var(--text-primary)' }}>{activeDragTask.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {focusModeOpen && (
        <FocusMode tasks={todayTasks} projects={projects} onStatusChange={onStatusChange} onUpdateTask={onUpdateTask} onClose={() => setFocusModeOpen(false)} />
      )}
    </div>
  );
}

function EmptyState({ onNavigateToWeek }: { onNavigateToWeek: () => void }) {
  return (
    <div className="flex items-center justify-center pt-8">
      <button onClick={onNavigateToWeek} className="text-[13px] transition-colors hover:underline" style={{ color: 'var(--accent-blue)' }}>
        Planeje na Minha Semana →
      </button>
    </div>
  );
}
