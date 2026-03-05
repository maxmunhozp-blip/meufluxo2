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

  const todayStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const viewingStart = new Date(currentYear, currentMonth, 1);
  const monthsDiff = (viewingStart.getFullYear() - todayStart.getFullYear()) * 12 + (viewingStart.getMonth() - todayStart.getMonth());
  const isPast = monthsDiff < 0;

  const getTemporalLabel = (): string => {
    if (isCurrentMonth) return '';
    const abs = Math.abs(monthsDiff);
    if (isPast) {
      return abs === 1 ? 'mês passado' : `${abs} meses atrás`;
    }
    return abs === 1 ? 'próximo mês' : `em ${abs} meses`;
  };

  const goToPrev = () => {
    const prev = new Date(currentYear, currentMonth - 1, 1);
    onMonthChange?.(prev);
  };

  const goToNext = () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    onMonthChange?.(next);
  };

  const showTemporal = onMonthChange && !isCurrentMonth;

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: Project name */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="truncate" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)' }}>
          {projectName}
        </h1>
      </div>

      {/* Right: [temporal badge] < Mês Ano > — all inline, single row */}
      {onMonthChange && (
        <div className="flex items-center flex-shrink-0">
          {/* Temporal badge — fades in/out next to left arrow, no layout shift */}
          <div
            style={{
              opacity: showTemporal ? 1 : 0,
              pointerEvents: showTemporal ? 'auto' : 'none',
              transition: 'opacity 200ms ease-out',
              marginRight: 8,
            }}
            aria-hidden={!showTemporal}
          >
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                lineHeight: 1.5,
                background: isPast ? 'var(--temporal-past-bg)' : 'var(--temporal-future-bg)',
                color: isPast ? 'var(--temporal-past-text)' : 'var(--temporal-future-text)',
                whiteSpace: 'nowrap',
              }}
              aria-label={showTemporal ? `Você está visualizando ${getTemporalLabel()}` : undefined}
            >
              {getTemporalLabel() || '\u00A0'}
            </span>
          </div>

          {/* Arrow zone — fixed 220px width */}
          <div className="flex items-center" style={{ width: 220 }}>
            <button
              onClick={goToPrev}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg"
              style={{ color: 'var(--text-tertiary)', transition: 'all 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <span
                className="tabular-nums text-center truncate"
                style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)' }}
              >
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
            </div>
            
            <button
              onClick={goToNext}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg"
              style={{ color: 'var(--text-tertiary)', transition: 'all 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
