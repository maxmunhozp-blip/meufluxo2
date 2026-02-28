export type FilterMode = 'all' | 'pending' | 'done';

interface TaskListHeaderProps {
  projectName: string;
  pendingCount: number;
  onNewTask: () => void;
  filter: FilterMode;
  onFilterChange: (filter: FilterMode) => void;
}

// Problema 3: Removido ícone de olho sem função clara
// Problema 4: Removido botão "Nova Tarefa" — criação contextual apenas
// Research: "action obvious at the point of need" (Focus Bear, 2025)

export function TaskListHeader({ projectName, filter, onFilterChange }: TaskListHeaderProps) {
  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-nd-border flex-shrink-0"
      style={{ background: 'hsl(var(--bg-app))' }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-[18px] font-semibold text-nd-text truncate">{projectName}</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-4 flex-shrink-0" />
    </header>
  );
}
