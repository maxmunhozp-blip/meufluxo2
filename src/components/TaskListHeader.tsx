import { ChevronLeft, ChevronRight } from 'lucide-react';

export type FilterMode = 'all' | 'pending' | 'done';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

interface TaskListHeaderProps {
  projectName: string;
  pendingCount: number;
  onNewTask: () => void;
  filter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
  activeMonth?: Date;
  onMonthChange?: (month: Date) => void;
}

export function TaskListHeader({ projectName, filter, onFilterChange, activeMonth, onMonthChange }: TaskListHeaderProps) {
  const now = activeMonth || new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const today = new Date();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const goToPrev = () => {
    const prev = new Date(currentYear, currentMonth - 1, 1);
    onMonthChange?.(prev);
  };

  const goToNext = () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    onMonthChange?.(next);
  };

  return (
    <header
      className="flex items-center justify-between flex-shrink-0 w-full"
      style={{ background: 'var(--bg-base)', padding: '32px 32px 0 32px' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">{projectName}</h1>
      </div>

      {onMonthChange && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={goToPrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--text-tertiary)', transition: 'all 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="tabular-nums min-w-[120px] text-center"
            style={{ fontSize: 14, fontWeight: 500, color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goToNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: 'var(--text-tertiary)', transition: 'all 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0" />
    </header>
  );
}
