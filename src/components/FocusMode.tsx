import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Sunrise, Sun, Moon } from 'lucide-react';
import { Task, TaskStatus, Subtask, Project, DayPeriod } from '@/types/task';
import { format } from 'date-fns';

const PERIODS: { key: DayPeriod; label: string; icon: typeof Sunrise }[] = [
  { key: 'morning', label: 'Manhã', icon: Sunrise },
  { key: 'afternoon', label: 'Tarde', icon: Sun },
  { key: 'evening', label: 'Noite', icon: Moon },
];

function getCurrentPeriod(): DayPeriod {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function getNextPeriod(p: DayPeriod): DayPeriod | null {
  if (p === 'morning') return 'afternoon';
  if (p === 'afternoon') return 'evening';
  return null;
}

function getPeriodInfo(p: DayPeriod) {
  return PERIODS.find(x => x.key === p)!;
}

interface FocusModeProps {
  tasks: Task[];
  projects: Project[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onUpdateTask?: (task: Task) => void;
  onClose: () => void;
}

type FocusState =
  | { type: 'task'; task: Task; periodKey: DayPeriod }
  | { type: 'section-done'; periodKey: DayPeriod; nextPeriod: DayPeriod | null }
  | { type: 'all-done' }
  | { type: 'empty' };

const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function FocusMode({ tasks, projects, onStatusChange, onUpdateTask, onClose }: FocusModeProps) {
  const [focusState, setFocusState] = useState<FocusState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [slideOut, setSlideOut] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const todayTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.parentTaskId) return false;
      if (t.scheduledDate === todayStr) return true;
      if (t.dueDate === todayStr && !t.scheduledDate) return true;
      return false;
    });
  }, [tasks, todayStr]);

  const getTasksByPeriod = useCallback((period: DayPeriod) => {
    return todayTasks.filter(t => (t.dayPeriod || 'morning') === period && t.status !== 'done' && !skippedIds.has(t.id));
  }, [todayTasks, skippedIds]);

  const findFirstTask = useCallback((): FocusState => {
    if (todayTasks.length === 0) return { type: 'empty' };
    const current = getCurrentPeriod();
    const allPeriods: DayPeriod[] = ['morning', 'afternoon', 'evening'];
    const startIdx = allPeriods.indexOf(current);
    for (let i = 0; i < 3; i++) {
      const p = allPeriods[(startIdx + i) % 3];
      const pending = getTasksByPeriod(p);
      if (pending.length > 0) return { type: 'task', task: pending[0], periodKey: p };
    }
    return { type: 'all-done' };
  }, [todayTasks, getTasksByPeriod]);

  useEffect(() => {
    setFocusState(findFirstTask());
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  useEffect(() => {
    if (focusState?.type === 'task') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [focusState?.type === 'task' ? (focusState as any).task?.id : null]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (focusState?.type === 'task') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDone(); }
        if (e.key === 'Tab' || e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusState]);

  const advanceToNext = useCallback((currentPeriod: DayPeriod) => {
    const pending = getTasksByPeriod(currentPeriod);
    if (pending.length > 0) {
      setSlideOut(true);
      setTimeout(() => {
        setFocusState({ type: 'task', task: pending[0], periodKey: currentPeriod });
        setSlideOut(false);
        setSlideIn(true);
        setTimeout(() => setSlideIn(false), 300);
      }, 300);
      return;
    }
    const next = getNextPeriod(currentPeriod);
    if (next) {
      const nextPending = getTasksByPeriod(next);
      if (nextPending.length > 0) {
        setFocusState({ type: 'section-done', periodKey: currentPeriod, nextPeriod: next });
        return;
      }
    }
    const allPeriods: DayPeriod[] = ['morning', 'afternoon', 'evening'];
    for (const p of allPeriods) {
      if (getTasksByPeriod(p).length > 0) {
        setFocusState({ type: 'section-done', periodKey: currentPeriod, nextPeriod: p });
        return;
      }
    }
    setFocusState({ type: 'all-done' });
  }, [getTasksByPeriod]);

  const handleDone = useCallback(() => {
    if (focusState?.type !== 'task') return;
    const { task, periodKey } = focusState;
    setShowCheck(true);
    onStatusChange(task.id, 'done');
    setTimeout(() => {
      setShowCheck(false);
      advanceToNext(periodKey);
    }, 900);
  }, [focusState, onStatusChange, advanceToNext]);

  const handleNext = useCallback(() => {
    if (focusState?.type !== 'task') return;
    const { task, periodKey } = focusState;
    setSkippedIds(prev => new Set(prev).add(task.id));
    setSlideOut(true);
    setTimeout(() => {
      setSlideOut(false);
      setSlideIn(true);
      const pending = getTasksByPeriod(periodKey).filter(t => t.id !== task.id);
      if (pending.length > 0) {
        setFocusState({ type: 'task', task: pending[0], periodKey });
      } else {
        advanceToNext(periodKey);
      }
      setTimeout(() => setSlideIn(false), 300);
    }, 300);
  }, [focusState, getTasksByPeriod, advanceToNext]);

  const handleSubtaskToggle = useCallback((subtask: Subtask) => {
    if (focusState?.type !== 'task' || !onUpdateTask) return;
    const task = focusState.task;
    const newStatus: TaskStatus = subtask.status === 'done' ? 'pending' : 'done';
    const updatedSubtasks = (task.subtasks || []).map(s =>
      s.id === subtask.id ? { ...s, status: newStatus } : s
    );
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
    onStatusChange(subtask.id, newStatus);
  }, [focusState, onUpdateTask, onStatusChange]);

  const handleContinueToSection = useCallback((period: DayPeriod) => {
    const pending = getTasksByPeriod(period);
    if (pending.length > 0) {
      setSlideIn(true);
      setFocusState({ type: 'task', task: pending[0], periodKey: period });
      setTimeout(() => setSlideIn(false), 300);
    }
  }, [getTasksByPeriod]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (!focusState) return null;

  const project = focusState.type === 'task'
    ? projects.find(p => p.id === focusState.task.projectId)
    : null;

  const currentSubtasks = focusState.type === 'task' ? (focusState.task.subtasks || []) : [];
  const allSubtasksDone = currentSubtasks.length > 0 && currentSubtasks.every(s => s.status === 'done');

  const freshTask = focusState.type === 'task' ? tasks.find(t => t.id === focusState.task.id) : null;
  const displaySubtasks = freshTask?.subtasks || currentSubtasks;

  return (
    <div
      className={`fixed inset-0 z-[500] flex flex-col items-center justify-center transition-all duration-500 ${
        fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
      }`}
      style={{
        background: 'var(--bg-focus)',
        transitionTimingFunction: EASING,
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-[44px] h-[44px] flex items-center justify-center transition-colors"
        style={{ color: 'var(--text-placeholder)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)'; }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Checkmark animation overlay */}
      {showCheck && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <svg width="80" height="80" viewBox="0 0 80 80" className="focus-check-anim">
            <circle cx="40" cy="40" r="36" fill="none" stroke="var(--accent-green)" strokeWidth="2" opacity="0.2" />
            <path
              d="M24 42 L34 52 L56 30"
              fill="none"
              stroke="var(--accent-green)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="focus-check-path"
            />
          </svg>
        </div>
      )}

      {/* Content */}
      <div
        className="flex flex-col items-center text-center px-6 transition-all"
        style={{
          maxWidth: 640,
          transitionDuration: '300ms',
          transitionTimingFunction: EASING,
          opacity: showCheck ? 0.2 : slideOut ? 0 : 1,
          transform: slideOut ? 'translateX(-40px)' : 'translateX(0)',
        }}
      >
        {focusState.type === 'task' && (
          <>
            {/* Project badge */}
            {project && (
              <span
                className="flex items-center gap-2 px-4 py-1.5 rounded-[6px] text-[12px] font-semibold mb-5"
                style={{
                  background: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
                {project.name}
              </span>
            )}

            {/* Task name */}
            <h1
              className="font-bold leading-tight mb-4"
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary)',
                maxWidth: 600,
              }}
            >
              {focusState.task.name}
            </h1>

            {/* Subtasks */}
            {displaySubtasks.length > 0 && (
              <div
                className="w-full mb-5 overflow-y-auto"
                style={{ maxHeight: 5 * 32, maxWidth: 400 }}
              >
                {displaySubtasks.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => handleSubtaskToggle(sub)}
                    className="flex items-center gap-2.5 w-full text-left py-1 transition-opacity"
                    style={{ height: 32, opacity: sub.status === 'done' ? 0.4 : 1 }}
                  >
                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                      {sub.status === 'done' ? (
                        <>
                          <circle cx="8" cy="8" r="7" fill="var(--accent-green)" />
                          <path
                            d="M5 8.5L7 10.5L11 6"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="focus-subtask-check"
                          />
                        </>
                      ) : (
                        <circle cx="8" cy="8" r="6.5" stroke="var(--text-placeholder)" strokeWidth="1" />
                      )}
                    </svg>
                    <span
                      className={`text-[14px] truncate ${sub.status === 'done' ? 'line-through' : ''}`}
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {sub.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Period + timer */}
            {(() => {
              const info = getPeriodInfo(focusState.periodKey);
              const PeriodIcon = info.icon;
              return (
                <div className="flex items-center gap-1.5 mb-8">
                  <PeriodIcon style={{ width: 14, height: 14, color: 'var(--text-placeholder)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>
                    {info.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}> · </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--text-placeholder)',
                      fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
                    }}
                  >
                    {formatTime(elapsed)}
                  </span>
                </div>
              );
            })()}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDone}
                className="flex items-center gap-2 font-semibold transition-all"
                style={{
                  background: 'var(--accent-blue)',
                  color: 'var(--btn-text)',
                  borderRadius: 10,
                  height: 44,
                  padding: '0 24px',
                  fontSize: 14,
                }}
              >
                ✓ Feito
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 transition-all"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  height: 44,
                  padding: '0 24px',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                → Próxima
              </button>
            </div>
          </>
        )}

        {focusState.type === 'section-done' && (() => {
          const info = getPeriodInfo(focusState.periodKey);
          const nextInfo = focusState.nextPeriod ? getPeriodInfo(focusState.nextPeriod) : null;
          return (
            <>
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--accent-green)', opacity: 0.6, marginBottom: 8 }}>
                Tudo feito por agora ✓
              </span>
              <p style={{ fontSize: 13, color: 'var(--text-placeholder)', marginBottom: 32 }}>
                {info.label} concluída
              </p>
              <div className="flex items-center gap-3">
                {nextInfo && focusState.nextPeriod && (
                  <button
                    onClick={() => handleContinueToSection(focusState.nextPeriod!)}
                    className="flex items-center gap-2 font-medium transition-all"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      height: 44,
                      padding: '0 24px',
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent-blue)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    Continuar para {nextInfo.label} →
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 font-medium transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    height: 44,
                    padding: '0 24px',
                    fontSize: 14,
                    color: 'var(--text-placeholder)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-placeholder)';
                  }}
                >
                  Voltar ao Meu Dia
                </button>
              </div>
            </>
          );
        })()}

        {focusState.type === 'all-done' && (
          <>
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--accent-green)', opacity: 0.6, marginBottom: 8 }}>
              Dia concluído ✓
            </span>
            <p style={{ fontSize: 13, color: 'var(--text-placeholder)', marginBottom: 32 }}>
              Bom trabalho.
            </p>
            <button
              onClick={onClose}
              className="flex items-center gap-2 font-medium transition-all"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                height: 44,
                padding: '0 24px',
                fontSize: 14,
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Voltar ao Meu Dia
            </button>
          </>
        )}

        {focusState.type === 'empty' && (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-placeholder)', marginBottom: 24 }}>
              Nenhuma tarefa para focar. Agende tarefas no Meu Dia.
            </p>
            <button
              onClick={onClose}
              className="flex items-center gap-2 font-medium transition-all"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                height: 44,
                padding: '0 24px',
                fontSize: 14,
                color: 'var(--text-secondary)',
              }}
            >
              Voltar
            </button>
          </>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .focus-check-path,
          .focus-check-anim,
          .focus-subtask-check {
            animation: none !important;
          }
        }
        .focus-check-path {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: focus-draw-check 0.4s ease-out forwards;
        }
        @keyframes focus-draw-check {
          to { stroke-dashoffset: 0; }
        }
        .focus-check-anim {
          animation: focus-check-scale 0.5s ${EASING};
        }
        @keyframes focus-check-scale {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .focus-subtask-check {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: focus-draw-check 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

