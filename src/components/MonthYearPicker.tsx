import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface MonthYearPickerProps {
  onSelect: (year: number, month: number) => void;
}

export function MonthYearPicker({ onSelect }: MonthYearPickerProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return (
    <div style={{ width: 200 }}>
      {/* Year nav */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setYear(y => y - 1)}
          className="w-7 h-7 flex items-center justify-center rounded-md"
          style={{ color: 'var(--text-tertiary)', transition: 'all 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-md"
          style={{ color: 'var(--text-tertiary)', transition: 'all 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-1">
        {MONTHS.map((label, i) => {
          const isCurrent = year === currentYear && i === currentMonth;
          return (
            <button
              key={i}
              onClick={() => onSelect(year, i)}
              className="h-8 rounded-md text-center select-none"
              style={{
                fontSize: 13,
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)',
                background: isCurrent ? 'var(--accent-primary-bg, transparent)' : 'transparent',
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={e => {
                if (!isCurrent) {
                  e.currentTarget.style.background = 'var(--bg-overlay)';
                }
              }}
              onMouseLeave={e => {
                if (!isCurrent) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
