import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Task, TaskStatus, Subtask, Project } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';

const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

interface SingleFocusModeProps {
  task: Task;
  project?: Project;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onUpdateTask?: (task: Task) => void;
  onClose: () => void;
  allTasks?: Task[];
  workspaceId: string;
  userId: string;
}

export function SingleFocusMode({ task, project, onStatusChange, onUpdateTask, onClose, allTasks, workspaceId, userId }: SingleFocusModeProps) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const [showCheck, setShowCheck] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date>(new Date());

  const saveTimeEntry = useCallback((t: Task, seconds: number) => {
    if (seconds < 5) return;
    supabase.from('time_entries').insert({
      task_id: t.id,
      project_id: t.projectId,
      workspace_id: workspaceId,
      user_id: userId,
      duration_seconds: seconds,
      started_at: startedAtRef.current.toISOString(),
      ended_at: new Date().toISOString(),
    }).then();
  }, [workspaceId, userId]);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { handleClose(); return; }
      if (!isDone && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleDone(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDone]);

  const handleClose = useCallback(() => {
    saveTimeEntry(task, elapsedRef.current);
    onClose();
  }, [task, onClose, saveTimeEntry]);

  const handleDone = useCallback(() => {
    if (isDone) return;
    saveTimeEntry(task, elapsedRef.current);
    setShowCheck(true);
    onStatusChange(task.id, 'done');
    setTimeout(() => {
      setShowCheck(false);
      setIsDone(true);
    }, 900);
  }, [isDone, task, onStatusChange, saveTimeEntry]);

  const handleSubtaskToggle = useCallback((subtask: Subtask) => {
    if (!onUpdateTask) return;
    const newStatus: TaskStatus = subtask.status === 'done' ? 'pending' : 'done';
    const updatedSubtasks = (task.subtasks || []).map(s =>
      s.id === subtask.id ? { ...s, status: newStatus } : s
    );
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
    onStatusChange(subtask.id, newStatus);
  }, [task, onUpdateTask, onStatusChange]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Get fresh subtasks from allTasks if available
  const freshTask = allTasks?.find(t => t.id === task.id);
  const displaySubtasks = freshTask?.subtasks || task.subtasks || [];

  return (
    <div
      className={`fixed inset-0 z-[500] flex flex-col items-center justify-center transition-all duration-500 ${
        fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
      }`}
      style={{ background: 'var(--bg-focus)', transitionTimingFunction: EASING }}
    >
      <button
        onClick={handleClose}
        className="absolute top-5 right-5 w-[44px] h-[44px] flex items-center justify-center transition-colors"
        style={{ color: 'var(--text-placeholder)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)'; }}
      >
        <X className="w-5 h-5" />
      </button>

      {showCheck && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <svg width="80" height="80" viewBox="0 0 80 80" className="sfm-check-anim">
            <circle cx="40" cy="40" r="36" fill="none" stroke="var(--accent-green)" strokeWidth="2" opacity="0.2" />
            <path d="M24 42 L34 52 L56 30" fill="none" stroke="var(--accent-green)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="sfm-check-path" />
          </svg>
        </div>
      )}

      <div
        className="flex flex-col items-center text-center px-6 transition-all"
        style={{ maxWidth: 640, transitionDuration: '300ms', transitionTimingFunction: EASING, opacity: showCheck ? 0.2 : 1 }}
      >
        {!isDone ? (
          <>
            {project && (
              <span className="flex items-center gap-2 px-4 py-1.5 rounded-[6px] text-[12px] font-semibold mb-5"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
                {project.name}
              </span>
            )}

            <h1 className="font-bold leading-tight mb-4"
              style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', maxWidth: 600 }}>
              {task.name}
            </h1>

            {displaySubtasks.length > 0 && (
              <div className="w-full mb-5 overflow-y-auto" style={{ maxHeight: 5 * 32, maxWidth: 400 }}>
                {displaySubtasks.map(sub => (
                  <button key={sub.id} onClick={() => handleSubtaskToggle(sub)}
                    className="flex items-center gap-2.5 w-full text-left py-1 transition-opacity"
                    style={{ height: 32, opacity: sub.status === 'done' ? 0.4 : 1 }}>
                    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                      {sub.status === 'done' ? (
                        <>
                          <circle cx="8" cy="8" r="7" fill="var(--accent-green)" />
                          <path d="M5 8.5L7 10.5L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      ) : (
                        <circle cx="8" cy="8" r="6.5" stroke="var(--text-placeholder)" strokeWidth="1" />
                      )}
                    </svg>
                    <span className={`text-[14px] truncate ${sub.status === 'done' ? 'line-through' : ''}`}
                      style={{ color: 'var(--text-secondary)' }}>{sub.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 mb-8">
              <span style={{ fontSize: 12, color: 'var(--text-placeholder)', fontFamily: "'SF Mono', 'JetBrains Mono', monospace" }}>
                {formatTime(elapsed)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleDone}
                className="flex items-center gap-2 font-semibold transition-all"
                style={{ background: 'var(--accent-blue)', color: 'var(--btn-text)', borderRadius: 10, height: 44, padding: '0 24px', fontSize: 14 }}>
                ✓ Feito
              </button>
              <button onClick={onClose}
                className="flex items-center gap-2 transition-all"
                style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 10, height: 44, padding: '0 24px', fontSize: 14, color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                Voltar
              </button>
            </div>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--accent-green)', opacity: 0.6, marginBottom: 8 }}>
              Tarefa concluída ✓
            </span>
            <p style={{ fontSize: 13, color: 'var(--text-placeholder)', marginBottom: 32 }}>Bom trabalho.</p>
            <button onClick={onClose}
              className="flex items-center gap-2 font-medium transition-all"
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 10, height: 44, padding: '0 24px', fontSize: 14, color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
              Voltar
            </button>
          </>
        )}
      </div>

      <style>{`
        .sfm-check-path { stroke-dasharray: 60; stroke-dashoffset: 60; animation: sfm-draw 0.4s ease-out forwards; }
        @keyframes sfm-draw { to { stroke-dashoffset: 0; } }
        .sfm-check-anim { animation: sfm-scale 0.5s ${EASING}; }
        @keyframes sfm-scale { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
