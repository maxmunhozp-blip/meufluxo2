import { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Task } from '@/types/task';
import { formatFocusedTime } from '@/types/time';

interface TimeEntry {
  id: string;
  task_id: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string;
}

interface TimeReportViewProps {
  projectId: string;
  workspaceId: string;
  tasks: Task[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}min ${s}s` : `${m}min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (rm === 0) return `${h}h`;
  return `${h}h ${rm}min`;
}

export function TimeReportView({ projectId, workspaceId, tasks }: TimeReportViewProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    supabase
      .from('time_entries')
      .select('id, task_id, duration_seconds, started_at, ended_at')
      .eq('project_id', projectId)
      .eq('workspace_id', workspaceId)
      .order('started_at', { ascending: false })
      .then(({ data }) => {
        setEntries((data as TimeEntry[]) || []);
        setLoading(false);
      });
  }, [projectId, workspaceId]);

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of tasks) {
      map.set(t.id, t);
      for (const sub of t.subtasks || []) {
        map.set(sub.id, sub as any);
      }
    }
    return map;
  }, [tasks]);

  const groupedByTask = useMemo(() => {
    const groups = new Map<string, { taskName: string; totalSeconds: number; entries: TimeEntry[] }>();
    for (const entry of entries) {
      if (!groups.has(entry.task_id)) {
        const task = taskMap.get(entry.task_id);
        groups.set(entry.task_id, {
          taskName: task?.name || 'Tarefa removida',
          totalSeconds: 0,
          entries: [],
        });
      }
      const group = groups.get(entry.task_id)!;
      group.totalSeconds += entry.duration_seconds;
      group.entries.push(entry);
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds);
  }, [entries, taskMap]);

  const totalProjectSeconds = useMemo(
    () => entries.reduce((sum, e) => sum + e.duration_seconds, 0),
    [entries]
  );

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" style={{ color: 'var(--text-placeholder)' }}>
        <Clock className="w-4 h-4 mr-2 animate-pulse" />
        <span className="text-[13px]">Carregando registros…</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--text-placeholder)' }}>
        <Clock className="w-8 h-8 mb-3 opacity-40" />
        <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Nenhum registro de tempo
        </p>
        <p className="text-[12px]" style={{ color: 'var(--text-placeholder)' }}>
          Use o modo foco (🎯) para registrar tempo nas tarefas.
        </p>
      </div>
    );
  }

  return (
    <div className="px-8 py-6" style={{ maxWidth: 720 }}>
      {/* Summary */}
      <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
          <Clock className="w-5 h-5" style={{ color: 'var(--accent-blue)' }} />
        </div>
        <div>
          <div className="text-[20px] font-semibold" style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {formatDuration(totalProjectSeconds)}
          </div>
          <div className="text-[12px]" style={{ color: 'var(--text-placeholder)' }}>
            Tempo total focado · {entries.length} {entries.length === 1 ? 'sessão' : 'sessões'}
          </div>
        </div>
      </div>

      {/* Task breakdown */}
      <div className="space-y-1">
        {groupedByTask.map(([taskId, group]) => {
          const isExpanded = expandedTasks.has(taskId);
          const pct = totalProjectSeconds > 0 ? Math.round((group.totalSeconds / totalProjectSeconds) * 100) : 0;

          return (
            <div key={taskId}>
              <button
                onClick={() => toggleTask(taskId)}
                className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors"
                style={{ background: isExpanded ? 'var(--bg-hover)' : 'transparent' }}
                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
              >
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-placeholder)' }} />
                  : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-placeholder)' }} />
                }
                <span className="flex-1 text-left text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                  {group.taskName}
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: 'var(--text-placeholder)', background: 'var(--bg-elevated)' }}>
                  {pct}%
                </span>
                <span className="text-[13px] font-medium tabular-nums" style={{ color: 'var(--text-secondary)', minWidth: 60, textAlign: 'right' }}>
                  {formatDuration(group.totalSeconds)}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-7 mb-2">
                  {group.entries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 py-1.5 px-3 text-[12px]"
                      style={{ color: 'var(--text-placeholder)' }}
                    >
                      <span className="tabular-nums">{formatDate(entry.started_at)}</span>
                      <span className="tabular-nums">{formatTime(entry.started_at)} → {formatTime(entry.ended_at)}</span>
                      <span className="ml-auto tabular-nums font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formatDuration(entry.duration_seconds)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
