import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { format, parseISO, startOfDay, isBefore, differenceInCalendarDays, addDays, subDays, isToday, isTomorrow, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Target, ArrowRight, Repeat, Sunrise, Sun, Moon, ChevronDown, ChevronLeft, ChevronRight, GripVertical, Check, Clock, CalendarDays, CalendarPlus, CalendarCheck, XCircle } from 'lucide-react';
import { Task, TaskStatus, Project, Section, DayPeriod, ServiceTag } from '@/types/task';
import { getTagIcon } from './ServiceTagsManager';
import { StatusCheckbox } from './StatusCheckbox';
import { FocusMode } from './FocusMode';
import { DropIndicatorLine } from './DropIndicatorLine';
import { ContextMenu } from './ContextMenu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface MyDayViewProps {
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  serviceTags?: ServiceTag[];
  userName: string;
  isPro?: boolean;
  onUpdateTask: (task: Task) => void;
  onBatchUpdatePositions?: (updates: { id: string; position: number }[]) => Promise<void>;
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
  task, projectColor, isSelected, onSelect, onStatusChange, onUpdateTask, showProjectBadge, projectName, rolloverDays, sectionName, parentTaskName, dropIndicator, justDropped,
}: {
  task: Task; projectColor: string; isSelected: boolean; onSelect: () => void;
  onStatusChange: (id: string, s: TaskStatus) => void; onUpdateTask: (task: Task) => void; showProjectBadge?: boolean; projectName?: string; rolloverDays?: number; sectionName?: string; parentTaskName?: string;
  dropIndicator?: 'top' | 'bottom' | null; justDropped?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: task.id, data: { type: 'day-task', task } });
  const [completing, setCompleting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // No transform — items stay in place; only the blue drop indicator shows position
  const style: React.CSSProperties = {
    opacity: isDragging ? 0.25 : 1,
    transition: 'opacity 150ms ease-out',
    cursor: 'grab',
  };

  const handleStatus = (newStatus: TaskStatus) => {
    if (newStatus === 'done') { setCompleting(true); setTimeout(() => { onStatusChange(task.id, newStatus); setCompleting(false); }, 400); }
    else { onStatusChange(task.id, newStatus); }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const isDone = task.status === 'done';
  const currentPeriod = task.dayPeriod || 'morning';
  const periodOptions: { key: DayPeriod; label: string }[] = ([
    { key: 'morning' as DayPeriod, label: 'Manhã' },
    { key: 'afternoon' as DayPeriod, label: 'Tarde' },
    { key: 'evening' as DayPeriod, label: 'Noite' },
  ] as const).filter(p => p.key !== currentPeriod);

  return (
    <>
      <div ref={setNodeRef} style={{ ...style, position: 'relative', animation: justDropped ? 'drop-pulse 400ms cubic-bezier(0.22,1,0.36,1)' : undefined }}
        className="flex items-center h-[44px] group active:cursor-grabbing"
        onClick={onSelect} role="button" tabIndex={0}
        onContextMenu={handleContextMenu}
        onMouseEnter={e => { if (!isDone) e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        {...attributes} {...listeners}
      >
        {dropIndicator === 'top' && <DropIndicatorLine position="top" />}
        {dropIndicator === 'bottom' && <DropIndicatorLine position="bottom" />}
        {/* Drag handle — visual only, drag activates from whole row */}
        <div
          className="flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity duration-150"
          style={{ width: 20, height: '100%', marginRight: 8 }}
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <circle cx="2" cy="2" r="1.2" fill="var(--text-secondary)" />
            <circle cx="6" cy="2" r="1.2" fill="var(--text-secondary)" />
            <circle cx="2" cy="7" r="1.2" fill="var(--text-secondary)" />
            <circle cx="6" cy="7" r="1.2" fill="var(--text-secondary)" />
            <circle cx="2" cy="12" r="1.2" fill="var(--text-secondary)" />
            <circle cx="6" cy="12" r="1.2" fill="var(--text-secondary)" />
          </svg>
        </div>
        <div className="flex-shrink-0 flex items-center justify-center" style={{ marginRight: 8 }}>
          <span className="flex-shrink-0 rounded-full" style={{ width: 6, height: 6, background: projectColor, opacity: 0.4 }} />
        </div>
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <StatusCheckbox status={task.status} onChange={handleStatus} size={20} quickComplete />
        </div>
        <div className="w-3 flex-shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          {projectName && <span className="flex-shrink-0 text-[11px]" style={{ color: 'var(--text-secondary)', fontWeight: 400, opacity: isDone ? 0.25 : 1 }}>{projectName}</span>}
          {projectName && <span className="flex-shrink-0" style={{ color: 'var(--text-placeholder)', fontSize: 9 }}>›</span>}
          <span className="flex-shrink-0 max-w-[40%] text-[14px] leading-tight truncate transition-all duration-200"
            style={{ color: 'var(--text-primary)', opacity: isDone || completing ? 0.35 : 1, fontWeight: 400 }}>{task.name}</span>
          {(sectionName || parentTaskName) && <span className="flex-shrink-0" style={{ color: 'var(--text-placeholder)', fontSize: 9 }}>·</span>}
          {sectionName && <span className="truncate text-[11px] px-1 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400, flexShrink: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', opacity: isDone ? 0.25 : 1 }}>{sectionName}</span>}
          {sectionName && parentTaskName && <span className="flex-shrink-0" style={{ color: 'var(--text-placeholder)', fontSize: 9 }}>·</span>}
          {parentTaskName && <span className="truncate text-[11px] max-w-[120px] px-1 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400, fontStyle: 'italic', flexShrink: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', opacity: isDone ? 0.25 : 1 }}>{parentTaskName}</span>}
        </div>
        {rolloverDays && rolloverDays > 0 && (
          <span className="flex-shrink-0 ml-2 whitespace-nowrap px-1.5 py-0.5 rounded"
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 400, background: 'rgba(255,255,255,0.06)' }}>
            ← {rolloverDays === 1 ? 'ontem' : `${rolloverDays} dias`}
          </span>
        )}
        {showProjectBadge && projectName && (
          <span className="flex-shrink-0 ml-1 px-1.5 py-0.5 rounded" style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}>{projectName}</span>
        )}
        {task.recurrenceType && <Repeat className="w-3 h-3 flex-shrink-0 ml-2" style={{ color: 'var(--text-tertiary)' }} />}
      </div>
      {contextMenu && (() => {
        const tomorrow = addDays(new Date(), 1);
        const dayAfter = addDays(new Date(), 2);
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        const dayAfterStr = format(dayAfter, 'yyyy-MM-dd');
        const tomorrowLabel = `Agendar para Amanhã (${dayNames[tomorrow.getDay()]})`;
        const dayAfterLabel = `Agendar para ${dayNames[dayAfter.getDay()]}-feira`;

        return (
          <ContextMenu
            position={contextMenu}
            onClose={() => setContextMenu(null)}
            items={[
              {
                label: isDone ? 'Marcar como pendente' : 'Marcar como feito',
                icon: <Check style={{ width: 14, height: 14 }} />,
                onClick: () => onStatusChange(task.id, isDone ? 'pending' : 'done'),
              },
              {
                label: 'Mover para período',
                icon: <Clock style={{ width: 14, height: 14 }} />,
                children: periodOptions.map(p => ({
                  label: p.label,
                  onClick: () => onUpdateTask({ ...task, dayPeriod: p.key }),
                })),
              },
              {
                label: tomorrowLabel,
                icon: <CalendarPlus style={{ width: 14, height: 14 }} />,
                onClick: () => onUpdateTask({ ...task, scheduledDate: tomorrowStr }),
              },
              {
                label: dayAfterLabel,
                icon: <CalendarDays style={{ width: 14, height: 14 }} />,
                onClick: () => onUpdateTask({ ...task, scheduledDate: dayAfterStr }),
              },
              {
                label: 'Desagendar',
                icon: <XCircle style={{ width: 14, height: 14 }} />,
                onClick: () => onUpdateTask({ ...task, scheduledDate: undefined }),
              },
            ]}
          />
        );
      })()}
    </>
  );
}

/* ── Collapsed Past Period Summary ── */
function CollapsedPeriodSummary({
  period, tasks, isExpanded, onToggle,
  projects, sections, allTasks, selectedTaskId, onSelectTask, onStatusChange, onUpdateTask, rolloverMap,
  overItemId, dropLinePosition, justDroppedId, isDragActive,
}: {
  period: typeof PERIODS[number]; tasks: Task[]; isExpanded: boolean; onToggle: () => void;
  projects: Project[]; sections: Section[]; allTasks: Task[];
  selectedTaskId?: string; onSelectTask: (t: Task) => void; onStatusChange: (id: string, s: TaskStatus) => void; onUpdateTask: (task: Task) => void;
  rolloverMap: Map<string, number>; overItemId?: string | null; dropLinePosition?: 'top' | 'bottom' | null; justDroppedId?: string | null; isDragActive?: boolean;
}) {
  const PeriodIcon = period.icon;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const pendingCount = tasks.filter(t => t.status !== 'done').length;
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `period-${period.key}`, data: { type: 'period-drop', period: period.key } });

  if (tasks.length === 0 && !isDragActive) return null;

  return (
    <div ref={setDropRef} style={{
      marginBottom: isExpanded ? 16 : 12,
      borderRadius: 10,
      padding: isOver ? '6px 8px' : '0px',
      background: isOver ? 'var(--accent-subtle)' : 'transparent',
      border: isOver ? '1px dashed var(--accent-blue)' : '1px dashed transparent',
      transition: 'all 200ms ease',
    }}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full text-left transition-colors group"
        style={{ height: 28, opacity: 0.5 }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
      >
        <PeriodIcon className="flex-shrink-0" style={{ width: 13, height: 13, color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: 0.3 }}>
          {period.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-placeholder)', fontWeight: 400 }}>
          ·
        </span>
        {doneCount > 0 && (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>
            {doneCount}✓
          </span>
        )}
        {/* Pending tasks are promoted to active period, so no arrow badge needed here */}
        <ChevronDown
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            width: 12, height: 12, color: 'var(--text-placeholder)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Expanded content — full interactive DayTaskCards with drag & drop */}
      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              return (
                <DayTaskCard
                  key={task.id}
                  task={task}
                  projectColor={project?.color || 'var(--accent-blue)'}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => onSelectTask(task)}
                  onStatusChange={onStatusChange}
                  onUpdateTask={onUpdateTask}
                  projectName={project?.name}
                  rolloverDays={rolloverMap.get(task.id)}
                  sectionName={sections.find(s => s.id === task.section)?.title}
                  parentTaskName={task.parentTaskId ? allTasks.find(t => t.id === task.parentTaskId)?.name : undefined}
                  dropIndicator={overItemId === task.id ? dropLinePosition : null}
                  justDropped={justDroppedId === task.id}
                />
              );
            })}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

/* ── Period section ── */
function PeriodSection({
  period, tasks, allTasks, projects, sections, periodState, selectedTaskId, onSelectTask, onStatusChange, onUpdateTask, showProjectBadge, rolloverMap, overItemId, dropLinePosition, justDroppedId, isDragActive,
}: {
  period: typeof PERIODS[number]; tasks: Task[]; allTasks: Task[]; projects: Project[]; sections: Section[]; periodState: 'past' | 'current' | 'future';
  selectedTaskId?: string; onSelectTask: (t: Task) => void; onStatusChange: (id: string, s: TaskStatus) => void; onUpdateTask: (task: Task) => void;
  showProjectBadge?: boolean; rolloverMap: Map<string, number>;
  overItemId?: string | null; dropLinePosition?: 'top' | 'bottom' | null; justDroppedId?: string | null;
  isDragActive?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `period-${period.key}`, data: { type: 'period-drop', period: period.key } });
  const PeriodIcon = period.icon;
  const headerOpacity = periodState === 'current' ? 1 : 0.7;
  const headerColor = periodState === 'current' ? 'var(--text-secondary)' : 'var(--text-tertiary)';
  const isEmpty = tasks.length === 0;

  const allDisplayTasks = useMemo(() => {
    return tasks.map(t => ({ task: t, promoted: false, fromPeriod: undefined as DayPeriod | undefined }));
  }, [tasks]);

  const allTaskIds = useMemo(() => allDisplayTasks.map(dt => dt.task.id), [allDisplayTasks]);

  return (
    <div
      ref={setNodeRef}
      className="transition-all duration-200"
      style={{
        marginBottom: 24,
        borderRadius: 10,
        padding: isOver ? '6px 8px' : '0px',
        background: isOver ? 'var(--accent-subtle)' : 'transparent',
        border: isOver ? '1px dashed var(--accent-blue)' : '1px dashed transparent',
      }}
    >
      {/* Period header */}
      <div className="flex items-center gap-1.5 mb-1.5" style={{ opacity: headerOpacity, height: 24 }}>
        <PeriodIcon className="flex-shrink-0" style={{ width: 14, height: 14, color: periodState === 'current' ? 'var(--accent-blue)' : headerColor }} />
        <span style={{
          fontSize: 12, fontWeight: 500, letterSpacing: 0.5,
          color: periodState === 'current' ? 'var(--accent-blue)' : headerColor,
        }}>
          {period.label}
        </span>
        {periodState === 'current' && (
          <span style={{ fontSize: 10, color: 'var(--text-placeholder)', fontWeight: 400, marginLeft: 2 }}>· agora</span>
        )}
      </div>

      {/* Tasks */}
      {allDisplayTasks.length > 0 ? (
        <LayoutGroup id={`period-${period.key}`}>
          <div className="space-y-0.5">
            <SortableContext items={allTaskIds} strategy={verticalListSortingStrategy}>
              <AnimatePresence initial={false}>
                {allDisplayTasks.map(({ task, promoted, fromPeriod }) => {
                  const project = projects.find(p => p.id === task.projectId);
                  const isDone = task.status === 'done';
                  const fromLabel = promoted && fromPeriod ? PERIODS.find(p => p.key === fromPeriod)?.label : null;
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      initial={false}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    >
                      <div className="flex items-center">
                        <div className="flex-1 min-w-0">
                          <DayTaskCard task={task} projectColor={project?.color || 'var(--accent-blue)'} isSelected={selectedTaskId === task.id}
                            onSelect={() => onSelectTask(task)} onStatusChange={onStatusChange} onUpdateTask={onUpdateTask} showProjectBadge={showProjectBadge}
                            projectName={project?.name} rolloverDays={rolloverMap.get(task.id)}
                            sectionName={sections.find(s => s.id === task.section)?.title}
                            parentTaskName={task.parentTaskId ? allTasks.find(t => t.id === task.parentTaskId)?.name : undefined}
                            dropIndicator={overItemId === task.id ? dropLinePosition : null} justDropped={justDroppedId === task.id} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </SortableContext>
          </div>
        </LayoutGroup>
      ) : isDragActive ? (
        /* Empty period — only visible during drag */
        <div
          className="flex items-center justify-center transition-all duration-150"
          style={{
            height: 36,
            borderRadius: 8,
            border: isOver ? '1px solid var(--accent-blue)' : '1px dashed var(--border-subtle)',
            background: isOver ? 'var(--accent-subtle)' : 'transparent',
            opacity: isOver ? 1 : 0.5,
          }}
        >
          <span style={{ fontSize: 11, color: isOver ? 'var(--accent-blue)' : 'var(--text-placeholder)', fontWeight: 400 }}>
            {isOver ? 'Soltar aqui' : 'Mover para ' + period.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
/* ── Tempo Vivo Layout ── */
function TempoVivoLayout({
  tasks, tasksByPeriod, allTasks, projects, sections, currentPeriod, viewingToday, isPastDay,
  selectedTaskId, onSelectTask, onStatusChange, onUpdateTask, rolloverMap,
  overItemId, dropLinePosition, justDroppedId, activeDragId, onNavigateToWeek, allDone, allEmpty,
}: {
  tasks: Task[]; tasksByPeriod: Record<DayPeriod, Task[]>; allTasks: Task[]; projects: Project[]; sections: Section[];
  currentPeriod: DayPeriod; viewingToday: boolean; isPastDay: boolean;
  selectedTaskId?: string; onSelectTask: (t: Task) => void; onStatusChange: (id: string, s: TaskStatus) => void; onUpdateTask: (task: Task) => void;
  rolloverMap: Map<string, number>; overItemId?: string | null; dropLinePosition?: 'top' | 'bottom' | null;
  justDroppedId?: string | null; activeDragId?: string | null; onNavigateToWeek: () => void; allDone: boolean; allEmpty: boolean;
}) {
  const [expandedPast, setExpandedPast] = useState<Set<DayPeriod>>(new Set());
  const currentPeriodOrder = getPeriodOrder(currentPeriod);

  const togglePastExpanded = useCallback((period: DayPeriod) => {
    setExpandedPast(prev => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period); else next.add(period);
      return next;
    });
  }, []);

  
  // Compute period ordering: Active → Future → Past
  const { activePeriods, futurePeriods, pastPeriods } = useMemo(() => {
    if (!viewingToday) {
      // Past days & future days: all periods shown expanded (active) for full visibility
      return { activePeriods: [...PERIODS], futurePeriods: [] as typeof PERIODS, pastPeriods: [] as typeof PERIODS };
    }
    const active: typeof PERIODS = [];
    const future: typeof PERIODS = [];
    const past: typeof PERIODS = [];
    PERIODS.forEach(p => {
      const order = getPeriodOrder(p.key);
      if (order === currentPeriodOrder) active.push(p);
      else if (order > currentPeriodOrder) future.push(p);
      else past.push(p);
    });
    // Past periods in reverse order (most recent first, e.g. Tarde before Manhã)
    past.reverse();
    return { activePeriods: active, futurePeriods: future, pastPeriods: past };
  }, [viewingToday, currentPeriodOrder, isPastDay]);

  // Promotion is now handled in tasksByPeriod — no separate promotedToActive needed

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Active period(s) — tasks already include promoted ones from tasksByPeriod */}
      {activePeriods.map(period => (
        <PeriodSection
          key={period.key} period={period}
          tasks={tasksByPeriod[period.key]}
          allTasks={allTasks} projects={projects} sections={sections}
          periodState={viewingToday ? 'current' : 'future'}
          selectedTaskId={selectedTaskId} onSelectTask={onSelectTask}
          onStatusChange={onStatusChange} onUpdateTask={onUpdateTask}
          rolloverMap={rolloverMap} overItemId={overItemId}
          dropLinePosition={dropLinePosition} justDroppedId={justDroppedId}
          isDragActive={!!activeDragId}
        />
      ))}

      {/* Future periods — normal rendering */}
      {futurePeriods.map(period => (
        <PeriodSection
          key={period.key} period={period} tasks={tasksByPeriod[period.key]}
          allTasks={allTasks} projects={projects} sections={sections}
          periodState="future"
          selectedTaskId={selectedTaskId} onSelectTask={onSelectTask}
          onStatusChange={onStatusChange} onUpdateTask={onUpdateTask}
          rolloverMap={rolloverMap} overItemId={overItemId}
          dropLinePosition={dropLinePosition} justDroppedId={justDroppedId}
          isDragActive={!!activeDragId}
        />
      ))}

      {/* Past periods — collapsible with full drag & drop when expanded */}
      {pastPeriods.length > 0 && (
        <div style={{ marginTop: viewingToday ? 8 : 0, paddingTop: viewingToday ? 12 : 0, borderTop: viewingToday ? '1px solid var(--border-subtle)' : 'none' }}>
          {pastPeriods.map(period => {
            const pastTasks = tasksByPeriod[period.key];
            return (
              <CollapsedPeriodSummary
                key={period.key}
                period={period}
                tasks={pastTasks}
                isExpanded={expandedPast.has(period.key)}
                onToggle={() => togglePastExpanded(period.key)}
                projects={projects} sections={sections} allTasks={allTasks}
                selectedTaskId={selectedTaskId} onSelectTask={onSelectTask}
                onStatusChange={onStatusChange} onUpdateTask={onUpdateTask}
                rolloverMap={rolloverMap} overItemId={overItemId}
                dropLinePosition={dropLinePosition} justDroppedId={justDroppedId}
                isDragActive={!!activeDragId}
              />
            );
          })}
        </div>
      )}

      {allEmpty && <EmptyState onNavigateToWeek={onNavigateToWeek} viewingToday={viewingToday} />}
      {allDone && (
        <div className="flex items-center justify-center pt-4">
          <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--success)', opacity: 0.6 }}>
            {viewingToday ? 'Tudo feito por hoje ✓' : 'Tudo feito nesse dia ✓'}
          </span>
        </div>
      )}
    </div>
  );
}


export function MyDayView({
  tasks, projects, sections, serviceTags = [], userName, isPro = false, onUpdateTask, onBatchUpdatePositions, onStatusChange, onSelectTask, selectedTaskId, onNavigateToWeek,
}: MyDayViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null);
  const [focusModeOpen, setFocusModeOpen] = useState(false);
  const [overItemId, setOverItemId] = useState<string | null>(null);
  const [dropLinePosition, setDropLinePosition] = useState<'top' | 'bottom' | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('period');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const promotedIdsRef = useRef<Set<string>>(new Set());
  const midnightResetDoneRef = useRef<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const currentPeriodOrder = getPeriodOrder(currentPeriod);
  const viewingToday = isToday(selectedDate);
  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  // Temporal distance for badges
  const daysDiff = useMemo(() => differenceInCalendarDays(selectedDate, startOfDay(new Date())), [selectedDate]);
  const getTemporalLabel = (): string => {
    if (viewingToday) return '';
    if (isYesterday(selectedDate)) return 'ontem';
    if (isTomorrow(selectedDate)) return 'amanhã';
    const abs = Math.abs(daysDiff);
    if (daysDiff < 0) return abs <= 7 ? `${abs} dias atrás` : `${Math.ceil(abs / 7)} sem. atrás`;
    return abs <= 7 ? `em ${abs} dias` : `em ${Math.ceil(abs / 7)} sem.`;
  };

  const { todayTasks, rolloverMap } = useMemo(() => {
    const todayStart = startOfDay(selectedDate);
    const scheduled: Task[] = [];
    const scheduledIds = new Set<string>();

    const promoteSubtask = (sub: any, parent: Task, index: number): Task => ({
      ...sub,
      id: sub.id,
      name: sub.name,
      projectId: sub.projectId || parent.projectId,
      section: sub.section || parent.section,
      status: sub.status,
      parentTaskId: sub.parentTaskId,
      dayPeriod: sub.dayPeriod || parent.dayPeriod || 'morning',
      position: (sub as any).position != null ? (sub as any).position : (parent.position ?? 0) * 100 + index,
    });

    tasks.forEach(t => {
      if (t.parentTaskId) return;
      let isScheduled = false;
      if (t.scheduledDate === selectedDateStr) isScheduled = true;
      else if (t.dueDate === selectedDateStr && !t.scheduledDate) isScheduled = true;
      if (isScheduled) {
        // When viewing today, reset non-manually-moved tasks to morning so they start fresh
        const shouldResetPeriod = viewingToday && !t.manuallyMoved && t.status !== 'done';
        const task = shouldResetPeriod ? { ...t, dayPeriod: 'morning' as DayPeriod } : t;
        scheduled.push(task);
        scheduledIds.add(t.id);
      }

      // Check subtasks scheduled for selected date (or due today without scheduled)
      const findScheduledSubtasks = (subs: any[], parent: Task) => {
        subs.forEach((sub, idx) => {
          let subScheduled = false;
          if (sub.scheduledDate === selectedDateStr) subScheduled = true;
          else if (sub.dueDate === selectedDateStr && !sub.scheduledDate) subScheduled = true;
          if (subScheduled) {
            const promoted = promoteSubtask(sub, parent, idx);
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
    if (isPro && viewingToday) {
      // Overdue rollover only applies when viewing today
      tasks.forEach(t => {
        if (t.parentTaskId) return;
        // Never rollover completed tasks — they stay on their original day
        if (t.status === 'done') return;
        if (scheduledIds.has(t.id)) return;
        if (t.scheduledDate && t.scheduledDate < selectedDateStr) {
          const days = differenceInCalendarDays(todayStart, parseISO(t.scheduledDate));
          if (days > 0) {
            rMap.set(t.id, days);
            // Reset to morning — overdue tasks start fresh at the beginning of the day
            overdue.push({ ...t, dayPeriod: 'morning' as DayPeriod, manuallyMoved: false });
          }
          return;
        }
        if (!t.scheduledDate && t.dueDate) {
          const dueDate = parseISO(t.dueDate);
          if (isBefore(startOfDay(dueDate), todayStart)) {
            const days = t.rolloverCount && t.rolloverCount > 0 ? t.rolloverCount : differenceInCalendarDays(todayStart, dueDate);
            rMap.set(t.id, days);
            overdue.push({ ...t, dayPeriod: 'morning' as DayPeriod, manuallyMoved: false });
          }
        }

        // Check subtasks for overdue
        const findOverdueSubtasks = (subs: any[], parent: Task) => {
          subs.forEach((sub, idx) => {
            if (scheduledIds.has(sub.id)) return;
            // Never rollover completed subtasks
            if (sub.status === 'done') return;
            if (sub.scheduledDate && sub.scheduledDate < selectedDateStr) {
              const days = differenceInCalendarDays(todayStart, parseISO(sub.scheduledDate));
              if (days > 0) {
                const promoted = promoteSubtask(sub, parent, idx);
                rMap.set(sub.id, days);
                overdue.push({ ...promoted, dayPeriod: 'morning' as DayPeriod, manuallyMoved: false });
              }
            } else if (!sub.scheduledDate && sub.dueDate) {
              const dueDate = parseISO(sub.dueDate);
              if (isBefore(startOfDay(dueDate), todayStart)) {
                const days = differenceInCalendarDays(todayStart, dueDate);
                const promoted = promoteSubtask(sub, parent, idx);
                rMap.set(sub.id, days);
                overdue.push({ ...promoted, dayPeriod: 'morning' as DayPeriod, manuallyMoved: false });
              }
            }
            if (sub.subtasks) findOverdueSubtasks(sub.subtasks, parent);
          });
        };
        if (t.subtasks) findOverdueSubtasks(t.subtasks, t);
      });
    }
    return { todayTasks: [...overdue, ...scheduled], rolloverMap: rMap };
  }, [tasks, selectedDateStr, viewingToday]);

  const tasksByPeriod = useMemo(() => {
    const map: Record<DayPeriod, Task[]> = { morning: [], afternoon: [], evening: [] };
    todayTasks.forEach(t => {
      let period: DayPeriod;
      if (!viewingToday) {
        // Past/future days: all tasks shown in morning
        period = 'morning';
      } else if (t.manuallyMoved) {
        // User explicitly dragged today — respect their choice
        period = (t.dayPeriod || 'morning') as DayPeriod;
      } else {
        // Not manually moved — start in morning (auto-promotion will handle the rest)
        period = 'morning';
      }
      map[period].push(t);
    });
    // Sort within each period: pending first, done last, each group by position
    Object.keys(map).forEach(key => {
      const period = key as DayPeriod;
      const pending = map[period].filter(t => t.status !== 'done').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const done = map[period].filter(t => t.status === 'done').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      map[period] = [...pending, ...done];
    });
    return map;
  }, [todayTasks, viewingToday]);

  // ── Sistema 1: Promoção automática por horário ──
  // Ao meio-dia: pendentes da Manhã → Tarde. Às 18h: pendentes da Tarde → Noite.
  // Ignora tarefas com manuallyMoved=true. Roda UMA VEZ por tarefa.
  useEffect(() => {
    if (!viewingToday) return;
    const promotions: { task: Task; targetPeriod: DayPeriod }[] = [];

    todayTasks.forEach(t => {
      if (t.status === 'done') return;
      if (t.manuallyMoved) return;
      if (promotedIdsRef.current.has(t.id)) return;
      const dbPeriod = (t.dayPeriod || 'morning') as DayPeriod;
      const dbOrder = getPeriodOrder(dbPeriod);
      if (dbOrder < currentPeriodOrder) {
        promotions.push({ task: t, targetPeriod: currentPeriod });
      }
    });

    if (promotions.length > 0) {
      promotions.forEach(({ task, targetPeriod }) => {
        promotedIdsRef.current.add(task.id);
        onUpdateTask({ ...task, dayPeriod: targetPeriod });
      });
    }
  }, [todayTasks, viewingToday, currentPeriod, currentPeriodOrder, onUpdateTask]);

  // ── Midnight reset: limpa APENAS manually_moved ──
  // day_period NÃO é tocado — a lógica de exibição em tasksByPeriod cuida disso.
  useEffect(() => {
    const runReset = async () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (midnightResetDoneRef.current === todayStr) return;

      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('tasks').update({ manually_moved: false } as any).eq('manually_moved', true);
      midnightResetDoneRef.current = todayStr;
      promotedIdsRef.current.clear();
    };

    runReset();

    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => {
      midnightResetDoneRef.current = null;
      runReset();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, []);
  const allDone = useMemo(() => todayTasks.length > 0 && todayTasks.every(t => t.status === 'done'), [todayTasks]);

  const handleStatusChangeWrapped = useCallback((taskId: string, status: TaskStatus) => {
    onStatusChange(taskId, status);
  }, [onStatusChange]);

  const handleDragStart = (event: DragStartEvent) => { const data = event.active.data.current; if (data?.type === 'day-task') setActiveDragId(data.task.id); };
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !active) { setOverItemId(null); setDropLinePosition(null); return; }
    const overData = over.data.current;
    if (overData?.type === 'day-task') {
      const activeIndex = active.data.current?.sortable?.index ?? -1;
      const overIndex = overData?.sortable?.index ?? -1;
      setOverItemId(over.id as string);
      setDropLinePosition(activeIndex > overIndex ? 'top' : 'bottom');
    } else {
      setOverItemId(null); setDropLinePosition(null);
    }
  };
  // Helper: find the DISPLAY period a task is shown in (may differ from DB dayPeriod due to promotion)
  const getDisplayPeriod = useCallback((taskId: string): DayPeriod => {
    for (const p of ['morning', 'afternoon', 'evening'] as DayPeriod[]) {
      if (tasksByPeriod[p].some(t => t.id === taskId)) return p;
    }
    return 'morning';
  }, [tasksByPeriod]);

  const handleDragEnd = (event: DragEndEvent) => {
    const droppedId = activeDragId;
    setActiveDragId(null); setOverItemId(null); setDropLinePosition(null);
    const { active, over } = event;
    if (!over) { return; }
    if (droppedId) { setJustDroppedId(droppedId); setTimeout(() => setJustDroppedId(null), 450); }
    const activeData = active.data.current; const overData = over.data.current;

    if (activeData?.type === 'day-task' && overData?.type === 'period-drop') {
      // Dropped on empty period zone
      const task = activeData.task as Task; const targetPeriod = overData.period as DayPeriod;
      const displayPeriod = getDisplayPeriod(task.id);
      if (displayPeriod !== targetPeriod) {
        onUpdateTask({ ...task, dayPeriod: targetPeriod, manuallyMoved: true });
      }
      return;
    }

    if (activeData?.type === 'day-task' && overData?.type === 'day-task') {
      const draggedTask = activeData.task as Task; const targetTask = overData.task as Task;
      const draggedDisplayPeriod = getDisplayPeriod(draggedTask.id);
      const targetDisplayPeriod = getDisplayPeriod(targetTask.id);

      if (draggedDisplayPeriod === targetDisplayPeriod) {
        const periodTasks = [...(tasksByPeriod[draggedDisplayPeriod] || [])];
        const oldIdx = periodTasks.findIndex(t => t.id === draggedTask.id);
        const newIdx = periodTasks.findIndex(t => t.id === targetTask.id);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          const reordered = arrayMove(periodTasks, oldIdx, newIdx);
          const updates = reordered.map((t, i) => ({ id: t.id, position: i }));
          if (onBatchUpdatePositions) {
            onBatchUpdatePositions(updates);
          } else {
            reordered.forEach((t, i) => onUpdateTask({ ...t, position: i }));
          }
        }
      } else {
        onUpdateTask({ ...draggedTask, dayPeriod: targetDisplayPeriod, manuallyMoved: true });
      }
    }
  };

  // Find drag task — search top-level tasks first, then subtask pseudo-tasks in todayTasks
  const activeDragTask = useMemo(() => {
    if (!activeDragId) return null;
    const topLevel = tasks.find(t => t.id === activeDragId);
    if (topLevel) return topLevel;
    // Search in todayTasks (subtask pseudo-tasks)
    const pseudo = todayTasks.find(t => t.id === activeDragId);
    if (pseudo) return pseudo;
    return null;
  }, [activeDragId, tasks, todayTasks]);
  const firstName = userName?.split(' ')[0] || 'Usuário';
  const allEmpty = todayTasks.length === 0;

  const tasksByService = useMemo(() => {
    const map: Record<string, Task[]> = {};
    todayTasks.forEach(t => { const key = t.serviceTagId || '__none__'; if (!map[key]) map[key] = []; map[key].push(t); });
    return map;
  }, [todayTasks]);

  const temporalLabel = getTemporalLabel();
  const isPast = daysDiff < 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'hsl(var(--bg-app))' }}>
      {/* Header */}
      <div className="px-6 pt-6 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {viewingToday ? `${getGreeting()}, ${firstName}` : `Planejamento de ${firstName}`}
            </h1>
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

        {/* Day Navigator */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDate(d => subDays(d, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
              style={{ color: 'rgba(255,255,255,0.5)', transition: 'all 150ms ease-out', padding: 8 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}
              aria-label="Dia anterior"
            >
              <ChevronLeft className="w-[18px] h-[18px]" />
            </button>

            <div className="flex items-center gap-3 min-w-[180px] justify-center">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="tabular-nums text-center cursor-pointer rounded-md px-2 py-1 transition-colors"
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.5,
                      color: 'rgba(255,255,255,0.85)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => { if (date) { setSelectedDate(date); setCalendarOpen(false); } }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              {/* Temporal Context Badge */}
              {!viewingToday && temporalLabel && (
                <span
                 style={{
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 500,
                    lineHeight: 1.5,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.35)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {temporalLabel}
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
              style={{ color: 'rgba(255,255,255,0.5)', transition: 'all 150ms ease-out', padding: 8 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* "Hoje" button — only when not viewing today */}
          {!viewingToday && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="flex items-center gap-1.5"
              style={{
                padding: '4px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--temporal-today-bg)',
                color: '#FFFFFF',
                transition: 'background 150ms ease-out',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--temporal-today-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--temporal-today-bg)'; }}
              aria-label="Voltar para hoje"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Hoje</span>
            </button>
          )}
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
                          onSelect={() => onSelectTask(task)} onStatusChange={handleStatusChangeWrapped} onUpdateTask={onUpdateTask} showProjectBadge projectName={project?.name}
                          rolloverDays={rolloverMap.get(task.id)}
                          sectionName={sections.find(s => s.id === task.section)?.title}
                          parentTaskName={task.parentTaskId ? tasks.find(t => t.id === task.parentTaskId)?.name : undefined} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {allEmpty && <EmptyState onNavigateToWeek={onNavigateToWeek} viewingToday={viewingToday} />}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <TempoVivoLayout
            tasks={todayTasks}
            tasksByPeriod={tasksByPeriod}
            allTasks={tasks}
            projects={projects}
            sections={sections}
            currentPeriod={currentPeriod}
            viewingToday={viewingToday}
            isPastDay={isPast}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            onStatusChange={handleStatusChangeWrapped}
            onUpdateTask={onUpdateTask}
            rolloverMap={rolloverMap}
            overItemId={overItemId}
            dropLinePosition={dropLinePosition}
            justDroppedId={justDroppedId}
            activeDragId={activeDragId}
            onNavigateToWeek={onNavigateToWeek}
            allDone={allDone}
            allEmpty={allEmpty}
          />
            <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
              {activeDragTask ? (() => {
                const dragProject = projects.find(p => p.id === activeDragTask.projectId);
                return (
                  <div className="h-[44px] flex items-center gap-2 px-3 rounded-lg"
                    style={{
                      background: 'var(--bg-elevated)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.1)',
                      transform: 'scale(1.015)',
                      maxWidth: 480,
                    }}>
                    <span className="flex-shrink-0 rounded-full" style={{ width: 6, height: 6, background: dragProject?.color || 'var(--accent-blue)', opacity: 0.75 }} />
                    <span className="text-[14px] truncate" style={{ color: 'var(--text-primary)', fontWeight: 400 }}>{activeDragTask.name}</span>
                  </div>
                );
              })() : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {focusModeOpen && (
        <FocusMode tasks={todayTasks} projects={projects} onStatusChange={handleStatusChangeWrapped} onUpdateTask={onUpdateTask} onClose={() => setFocusModeOpen(false)} />
      )}
    </div>
  );
}

function EmptyState({ onNavigateToWeek, viewingToday = true }: { onNavigateToWeek: () => void; viewingToday?: boolean }) {
  return (
    <div className="flex items-center justify-center pt-8">
      {viewingToday ? (
        <button onClick={onNavigateToWeek} className="text-[13px] transition-colors hover:underline" style={{ color: 'var(--accent-blue)' }}>
          Planeje na Minha Semana →
        </button>
      ) : (
        <span className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>
          Nenhuma tarefa agendada para este dia
        </span>
      )}
    </div>
  );
}
