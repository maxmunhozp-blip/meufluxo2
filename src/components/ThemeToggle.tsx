import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, Theme } from '@/hooks/useTheme';

const ICONS: Record<Theme, typeof Moon> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

const LABELS: Record<Theme, string> = {
  dark: 'Escuro',
  light: 'Claro',
  system: 'Sistema',
};

export function ThemeToggle() {
  const { preference, cycleTheme } = useTheme();
  const Icon = ICONS[preference];

  return (
    <button
      onClick={cycleTheme}
      className="w-full flex items-center gap-2.5 cursor-pointer select-none"
      style={{
        height: 40,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 8,
        fontSize: 14,
        color: 'var(--text-secondary)',
        transition: 'color 150ms ease-out, background 150ms ease-out',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      aria-label={`Tema: ${LABELS[preference]}. Clique para alternar.`}
      title={`Tema: ${LABELS[preference]}`}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
      <span className="text-sm">{LABELS[preference]}</span>
    </button>
  );
}
