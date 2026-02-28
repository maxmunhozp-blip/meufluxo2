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
      className="h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0 w-full"
      style={{ background: 'hsl(var(--bg-app))' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-[18px] font-semibold truncate" style={{ color: '#E5E5E5' }}>{projectName}</h1>
      </div>

      {/* Month navigation */}
      {onMonthChange && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={goToPrev}
            className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ color: '#6B7280' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E5E5E5'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="text-[13px] font-medium tabular-nums min-w-[100px] text-center"
            style={{ color: isCurrentMonth ? '#E5E5E5' : '#8A8A8A' }}
          >
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goToNext}
            className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ color: '#6B7280' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E5E5E5'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0" />
    </header>
  );
}
