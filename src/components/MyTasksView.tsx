import { useMemo, useState, useCallback } from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { Task, TaskStatus, Subtask, Section } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';
import {
  startOfDay, endOfDay, addDays, isBefore, isAfter, isEqual, parseISO, isToday, isTomorrow, isYesterday,
  format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Profile } from '@/hooks/useSupabaseData';

interface MyTasksViewProps {
  tasks: Task[];
  sections: Section[];
  currentUserId?: string;
  profiles: Profile[];
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

interface TimeGroup {
  key: string;
  label: string;
  tasks: Task[];
  defaultExpanded: boolean;
  labelColor?: string;
}

function getDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isYesterday(d)) return 'Ontem';
  if (isToday(d)) return 'Hoje';
  if (isTomorrow(d)) return 'Amanhã';
  return format(d, "dd 'de' MMMM", { locale: ptBR });
}

export function MyTasksView({
  tasks,
  sections,
  currentUserId,
  profiles,
  onSelectTask,
  selectedTaskId,
  onStatusChange,
}: MyTasksViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('meufluxo_mytasks_expanded');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [key]: prev[key] === false ? true : false };
      localStorage.setItem('meufluxo_mytasks_expanded', JSON.stringify(next));
      return next;
    });
  }, []);

  const isGroupExpanded = (key: string, defaultExpanded: boolean) => {
    return expandedGroups[key] === undefined ? defaultExpanded : expandedGroups[key];
  };

  // Filter tasks assigned to current user (via members)
  const currentProfile = useMemo(() => profiles.find(p => p.id === currentUserId), [profiles, currentUserId]);

  const myTasks = useMemo(() => {
    if (!currentUserId) return [];
    const result: Task[] = [];

    const isMyTask = (t: { members?: Task['members']; assignee?: string }) => {
      const isMember = t.members?.some(m => m.userId === currentUserId);
      const isAssignee = currentProfile?.fullName && t.assignee === currentProfile.fullName;
      return isMember || isAssignee;
    };

    for (const t of tasks) {
      if (t.parentTaskId) continue; // skip subtasks in top-level iteration

      // Check the task itself
      if (isMyTask(t)) {
        result.push(t);
      }

      // Check subtasks — promote them to top-level items in "My Tasks"
      for (const sub of (t.subtasks || [])) {
        if (isMyTask(sub)) {
          // Convert subtask to a Task-like object for display
          result.push({
            id: sub.id,
            name: sub.name,
            status: sub.status,
            priority: sub.priority,
            description: sub.description,
            dueDate: sub.dueDate,
            assignee: sub.assignee,
            section: sub.section,
            projectId: sub.projectId,
            parentTaskId: sub.parentTaskId,
            members: sub.members,
            subtasks: sub.subtasks,
            comments: sub.comments,
          });
        }
      }
    }
    return result;
  }, [tasks, currentUserId, currentProfile]);

  // Group by temporal sections
  const groups = useMemo((): TimeGroup[] => {
    const now = startOfDay(new Date());
    const tomorrow = addDays(now, 1);
    const weekEnd = endOfDay(addDays(now, 7));

    const overdue: Task[] = [];
    const today: Task[] = [];
    const tomorrowTasks: Task[] = [];
    const thisWeek: Task[] = [];
    const later: Task[] = [];
    const noDueDate: Task[] = [];

    myTasks.forEach(t => {
      if (!t.dueDate) {
        noDueDate.push(t);
        return;
      }
      const d = startOfDay(parseISO(t.dueDate));
      if (isBefore(d, now)) overdue.push(t);
      else if (isEqual(d, now) || isToday(parseISO(t.dueDate))) today.push(t);
      else if (isEqual(d, tomorrow) || isTomorrow(parseISO(t.dueDate))) tomorrowTasks.push(t);
      else if (isBefore(d, weekEnd) || isEqual(d, endOfDay(addDays(now, 7)))) thisWeek.push(t);
      else later.push(t);
    });

    const result: TimeGroup[] = [];
    if (overdue.length > 0) result.push({ key: 'overdue', label: 'Atrasadas', tasks: overdue, defaultExpanded: true, labelColor: 'hsl(var(--status-overdue))' });
    if (today.length > 0) result.push({ key: 'today', label: 'Hoje', tasks: today, defaultExpanded: true });
    if (tomorrowTasks.length > 0) result.push({ key: 'tomorrow', label: 'Amanhã', tasks: tomorrowTasks, defaultExpanded: true });
    if (thisWeek.length > 0) result.push({ key: 'week', label: 'Próximos 7 dias', tasks: thisWeek, defaultExpanded: true });
    if (later.length > 0) result.push({ key: 'later', label: 'Mais tarde', tasks: later, defaultExpanded: false });
    if (noDueDate.length > 0) result.push({ key: 'no-date', label: 'Sem data', tasks: noDueDate, defaultExpanded: false });

    return result;
  }, [myTasks]);

  if (myTasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <CheckCircle2 className="w-10 h-10 text-nd-text-muted mb-3 opacity-40" />
        <p className="text-[14px] text-nd-text-secondary text-center leading-relaxed">
          Nenhuma tarefa atribuída a você.
        </p>
        <p className="text-[12px] text-nd-text-muted text-center mt-1">
          Adicione-se como responsável em uma tarefa para vê-la aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {groups.map(group => {
        const expanded = isGroupExpanded(group.key, group.defaultExpanded);
        const pendingCount = group.tasks.filter(t => t.status !== 'done').length;

        return (
          <div key={group.key} className="mt-2">
            <button
              onClick={() => toggleGroup(group.key)}
              className="group h-10 w-full px-6 flex items-center gap-2 hover:bg-nd-hover transition-colors duration-100"
            >
              <span className="w-5 h-5 flex items-center justify-center rounded transition-colors duration-100">
                <Play
                  className={`w-3 h-3 text-nd-text-muted fill-nd-text-muted transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                />
              </span>
              <span
                className="text-[14px] font-semibold tracking-[0.02em]"
                style={{ color: group.labelColor || 'hsl(var(--text-primary))' }}
              >
                {group.label}
              </span>
              {!expanded && pendingCount > 0 && (
                <span className="text-[12px] text-nd-text-secondary ml-2">
                  ({pendingCount} pendentes)
                </span>
              )}
            </button>

            {expanded && (
              <div>
                {group.tasks.map(task => {
                  const section = sections.find(s => s.id === task.section);
                  const isSelected = selectedTaskId === task.id;
                  const dueDateLabel = task.dueDate ? getDateLabel(task.dueDate) : undefined;
                  const isOverdue = task.dueDate && isBefore(startOfDay(parseISO(task.dueDate)), startOfDay(new Date())) && task.status !== 'done';

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className={`h-9 w-full px-6 flex items-center gap-2 cursor-pointer transition-all duration-200 ease-out border-b border-nd-border ${
                        isSelected
                          ? 'bg-nd-active'
                          : 'hover:bg-nd-hover'
                      }`}
                    >
                      <StatusCheckbox
                        status={task.status}
                        onChange={(newStatus) => onStatusChange(task.id, newStatus)}
                      />
                      <span
                        className={`flex-1 text-[13px] truncate ${
                          task.status === 'done'
                            ? 'text-nd-text-completed opacity-70 transition-[color,opacity] duration-200 ease-out'
                            : 'text-nd-text'
                        }`}
                      >
                        {task.name}
                      </span>

                      {/* Due date on the right */}
                      {dueDateLabel && (
                        <span
                          className="text-[12px] flex-shrink-0"
                          style={{
                            color: isOverdue
                              ? 'hsl(var(--status-overdue))'
                              : 'hsl(var(--text-secondary))',
                          }}
                        >
                          {dueDateLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
