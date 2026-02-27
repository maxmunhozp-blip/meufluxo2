import { Eye, EyeOff } from 'lucide-react';

export type FilterMode = 'all' | 'pending' | 'done';

interface TaskListHeaderProps {
  projectName: string;
  pendingCount: number;
  onNewTask: () => void;
  filter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
}

// Research-backed: dropdown filters create decision fatigue for ADHD users
// (Sabharwal 2026; Super Productivity ADHD Guide).
// Simplified to a single toggle: show/hide completed tasks.
// One click, zero decisions. The toggle state is self-evident via icon.

export function TaskListHeader({ projectName, onNewTask, filter, onFilterChange }: TaskListHeaderProps) {
  const hidingDone = filter === 'pending';

  const toggleFilter = () => {
    onFilterChange(hidingDone ? 'all' : 'pending');
  };

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-nd-border flex-shrink-0"
      style={{ background: 'hsl(var(--bg-app))' }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-[18px] font-semibold text-nd-text truncate">{projectName}</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
        <button
          onClick={toggleFilter}
          title={hidingDone ? 'Mostrar concluídas' : 'Ocultar concluídas'}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
            hidingDone
              ? 'text-primary bg-primary/10'
              : 'text-nd-text-secondary hover:text-nd-text hover:bg-nd-hover'
          }`}
        >
          {hidingDone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={onNewTask}
          className="h-8 px-3.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          + Nova Tarefa
        </button>
      </div>
    </header>
  );
}
