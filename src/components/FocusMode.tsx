import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { Task, TaskStatus, Project, DayPeriod } from '@/types/task';

const PERIODS: { key: DayPeriod; label: string; emoji: string }[] = [
  { key: 'morning', label: 'Manhã', emoji: '☀️' },
  { key: 'afternoon', label: 'Tarde', emoji: '🌤️' },
  { key: 'evening', label: 'Noite', emoji: '🌙' },
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

function periodLabel(p: DayPeriod) {
  return PERIODS.find(x => x.key === p)!;
}

interface FocusModeProps {
  tasks: Task[];
  projects: Project[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onClose: () => void;
}

type FocusState =
  | { type: 'task'; task: Task; periodKey: DayPeriod }
  | { type: 'section-done'; periodKey: DayPeriod; nextPeriod: DayPeriod | null }
  | { type: 'all-done' };

export function FocusMode({ tasks, projects, onStatusChange, onClose }: FocusModeProps) {
  const [focusState, setFocusState] = useState<FocusState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [taskTransition, setTaskTransition] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayTasks = useMemo(() => {
    return tasks.filter(t => !t.parentTaskId && t.dueDate === todayStr);
  }, [tasks, todayStr]);

  const getTasksByPeriod = useCallback((period: DayPeriod) => {
    return todayTasks.filter(t => (t.dayPeriod || 'morning') === period && t.status !== 'done' && !skippedIds.has(t.id));
  }, [todayTasks, skippedIds]);

  const findFirstTask = useCallback((): FocusState => {
    const current = getCurrentPeriod();
    const order: DayPeriod[] = [];
    // Start from current period, then next ones
    const allPeriods: DayPeriod[] = ['morning', 'afternoon', 'evening'];
    const startIdx = allPeriods.indexOf(current);
    for (let i = 0; i < 3; i++) order.push(allPeriods[(startIdx + i) % 3]);

    for (const p of order) {
      const pending = getTasksByPeriod(p);
      if (pending.length > 0) return { type: 'task', task: pending[0], periodKey: p };
    }
    return { type: 'all-done' };
  }, [getTasksByPeriod]);

  // Initialize
  useEffect(() => {
    setFocusState(findFirstTask());
    setTimeout(() => setFadeIn(true), 10);
  }, []);

  // Timer
  useEffect(() => {
    if (focusState?.type === 'task') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [focusState?.type === 'task' ? (focusState as any).task?.id : null]);

  // Keyboard shortcuts
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
      setTaskTransition(true);
      setTimeout(() => {
        setFocusState({ type: 'task', task: pending[0], periodKey: currentPeriod });
        setTaskTransition(false);
      }, 200);
      return;
    }
    // Section done
    const next = getNextPeriod(currentPeriod);
    if (next) {
      const nextPending = getTasksByPeriod(next);
      if (nextPending.length > 0) {
        setFocusState({ type: 'section-done', periodKey: currentPeriod, nextPeriod: next });
        return;
      }
    }
    // Check all periods
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
    advanceToNext(periodKey);
  }, [focusState, advanceToNext]);

  const handleContinueToSection = useCallback((period: DayPeriod) => {
    const pending = getTasksByPeriod(period);
    if (pending.length > 0) {
      setFocusState({ type: 'task', task: pending[0], periodKey: period });
    }
  }, [getTasksByPeriod]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (!focusState) return null;

  const project = focusState.type === 'task'
    ? projects.find(p => p.id === focusState.task.projectId)
    : null;

  return (
    <div
      className={`fixed inset-0 z-[500] flex flex-col items-center justify-center transition-opacity duration-300 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: '#0D0D15' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Checkmark animation overlay */}
      {showCheck && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <svg width="80" height="80" viewBox="0 0 80 80" className="focus-check-anim">
            <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--status-done))" strokeWidth="3" opacity="0.3" />
            <path
              d="M24 42 L34 52 L56 30"
              fill="none"
              stroke="hsl(var(--status-done))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="focus-check-path"
            />
          </svg>
        </div>
      )}

      {/* Content */}
      <div className={`flex flex-col items-center text-center px-6 max-w-lg transition-opacity duration-200 ${
        taskTransition || showCheck ? 'opacity-30' : 'opacity-100'
      }`}>
        {focusState.type === 'task' && (
          <>
            {/* Client badge */}
            {project && (
              <span
                className="px-3 py-1 rounded-full text-[12px] font-medium mb-4"
                style={{ background: `${project.color}33`, color: project.color }}
              >
                {project.name}
              </span>
            )}

            {/* Task name */}
            <h1 className="text-[24px] font-semibold text-foreground leading-tight mb-3">
              {focusState.task.name}
            </h1>

            {/* Period label */}
            <span className="text-[13px] text-muted-foreground mb-2">
              {periodLabel(focusState.periodKey).emoji} {periodLabel(focusState.periodKey).label}
            </span>

            {/* Timer */}
            <span className="text-[18px] font-mono text-muted-foreground/50 mb-8">
              {formatTime(elapsed)}
            </span>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDone}
                className="flex items-center gap-2 px-5 h-10 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                ✓ Feito
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 h-10 rounded-lg text-[13px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                → Próxima
              </button>
            </div>
          </>
        )}

        {focusState.type === 'section-done' && (
          <>
            <h1 className="text-[22px] font-semibold text-foreground mb-2">
              Seção {periodLabel(focusState.periodKey).label} concluída! ✨
            </h1>
            <div className="flex items-center gap-3 mt-6">
              {focusState.nextPeriod && (
                <button
                  onClick={() => handleContinueToSection(focusState.nextPeriod!)}
                  className="px-5 h-10 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Continuar para {periodLabel(focusState.nextPeriod).emoji} {periodLabel(focusState.nextPeriod).label}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-5 h-10 rounded-lg text-[13px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                Voltar ao Meu Dia
              </button>
            </div>
          </>
        )}

        {focusState.type === 'all-done' && (
          <>
            <h1 className="text-[24px] font-semibold text-foreground mb-2">
              Dia concluído! 🎉
            </h1>
            <p className="text-[14px] text-muted-foreground mb-6">Bom trabalho.</p>
            <button
              onClick={onClose}
              className="px-5 h-10 rounded-lg text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Voltar
            </button>
          </>
        )}
      </div>

      {/* CSS for check animation */}
      <style>{`
        .focus-check-path {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: focus-draw-check 0.4s ease-out forwards;
        }
        @keyframes focus-draw-check {
          to { stroke-dashoffset: 0; }
        }
        .focus-check-anim {
          animation: focus-check-scale 0.5s ease-out;
        }
        @keyframes focus-check-scale {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
