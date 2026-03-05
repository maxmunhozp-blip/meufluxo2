import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';

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

/**
 * TaskListHeader — Temporal navigation with spatial stability
 *
 * Design rationale (neurodivergent-inclusive):
 * ─────────────────────────────────────────────
 * 1. W3C COGA O4P01 — "Controls and content do not move unexpectedly."
 *    The arrow zone occupies a FIXED 220px regardless of temporal state.
 *    The temporal badge area is always reserved (fixed height) so adding/
 *    removing it causes zero layout shift (CLS = 0).
 *
 * 2. Sweller's Cognitive Load Theory — Layout shifts create extraneous
 *    cognitive load. By reserving space and using opacity-only transitions,
 *    the user's spatial memory of control positions is never disrupted.
 *
 * 3. Apple HIG Motion — "Prefer subtle, purposeful animation."
 *    The temporal badge fades in/out with a 200ms ease-out curve.
 *    No positional movement, no scaling — pure opacity change.
 *    This respects prefers-reduced-motion via CSS.
 *
 * 4. Fitts's Law — Arrow buttons maintain consistent click targets.
 *    The "Hoje" button sits adjacent to the left arrow for quick
 *    temporal reset without hunting.
 *
 * Layout (non-current month):
 *   [ProjectName]  [Hoje]          [temporal badge centered]
 *                              [< Mês Ano >]
 *
 * Layout (current month — no shift):
 *   [ProjectName]              [badge area: invisible, same height]
 *                              [< Mês Ano >]
 */
export function TaskListHeader({ projectName, filter, onFilterChange, activeMonth, onMonthChange }: TaskListHeaderProps) {
  const now = activeMonth || new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const today = new Date();
  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  // Temporal distance calculation
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

  const goToToday = () => {
    onMonthChange?.(new Date());
  };

  const showTemporal = onMonthChange && !isCurrentMonth;

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: Project name + Hoje button */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="truncate" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)' }}>
          {projectName}
        </h1>
        {/* "Hoje" button — fades in/out, no layout shift */}
        <div
          style={{
            opacity: showTemporal ? 1 : 0,
            pointerEvents: showTemporal ? 'auto' : 'none',
            transition: 'opacity 200ms ease-out',
          }}
        >
          <button
            onClick={goToToday}
            className="flex items-center gap-1.5 flex-shrink-0"
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
            aria-label="Voltar para o mês atual"
            tabIndex={showTemporal ? 0 : -1}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Hoje</span>
          </button>
        </div>
      </div>

      {/* Right: Temporal badge (always-reserved height) + Arrow zone */}
      {onMonthChange && (
        <div className="flex flex-col items-center flex-shrink-0">
          {/*
           * Temporal badge container — ALWAYS rendered with fixed height
           * to prevent any vertical layout shift (W3C COGA O4P01).
           * Only opacity changes on state transition.
           */}
          <div
            style={{
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: showTemporal ? 1 : 0,
              transition: 'opacity 200ms ease-out',
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

          {/* Arrow zone — fixed 220px width (Fitts's Law) */}
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
