import { Sun, CheckCircle2, CalendarDays, FolderOpen } from 'lucide-react';

interface BottomNavProps {
  activeView: 'day' | 'tasks' | 'week' | 'project';
  onNavigate: (view: 'day' | 'tasks' | 'week' | 'project') => void;
}

const NAV_ITEMS = [
  { key: 'day' as const, label: 'Meu Dia', icon: Sun },
  { key: 'tasks' as const, label: 'Tarefas', icon: CheckCircle2 },
  { key: 'week' as const, label: 'Semana', icon: CalendarDays },
  { key: 'project' as const, label: 'Projetos', icon: FolderOpen },
];

export function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-nd-border"
      style={{
        background: 'hsl(var(--bg-surface))',
        height: 56,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const active = activeView === key;
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              active ? 'text-primary' : 'text-nd-text-muted'
            }`}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
