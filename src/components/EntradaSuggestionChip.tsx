import { useState, useMemo } from 'react';
import { Task } from '@/types/task';

const DISMISS_KEY = 'meufluxo_entrada_dismiss';

function getDismissMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}'); }
  catch { return {}; }
}

function isDismissed(sectionId: string): boolean {
  const map = getDismissMap();
  const ts = map[sectionId];
  if (!ts) return false;
  return Date.now() - ts < 7 * 24 * 60 * 60 * 1000; // 7 days
}

function dismiss(sectionId: string) {
  const map = getDismissMap();
  map[sectionId] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
}

interface Props {
  sectionId: string;
  tasks: Task[];
  onCreateSection: (name: string) => void;
}

export function EntradaSuggestionChip({ sectionId, tasks, onCreateSection }: Props) {
  const [dismissed, setDismissed] = useState(() => isDismissed(sectionId));
  const pendingTasks = useMemo(() => tasks.filter(t => t.status === 'pending'), [tasks]);

  // Suggest a section name based on common words
  const suggestedName = useMemo(() => {
    const words = pendingTasks.map(t => t.name.split(' ')[0]);
    const freq: Record<string, number> = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    if (sorted[0] && sorted[0][1] >= 2) return sorted[0][0];
    return 'Nova Seção';
  }, [pendingTasks]);

  if (dismissed || pendingTasks.length < 3) return null;




  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{
        padding: '4px 12px',
        margin: '4px 16px 4px 16px',
        borderRadius: 20,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        fontSize: 12,
        color: 'var(--text-secondary)',
      }}
    >
      <span>💡 Organizar essas {pendingTasks.length} tarefas em uma nova seção?</span>
      <button
        onClick={() => onCreateSection(suggestedName)}
        className="transition-colors"
        style={{
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          background: 'var(--bg-overlay)',
          color: 'var(--text-primary)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Criar seção
      </button>
      <button
        onClick={() => { dismiss(sectionId); setDismissed(true); }}
        style={{
          fontSize: 14,
          color: 'var(--text-placeholder)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          lineHeight: 1,
          padding: '0 2px',
        }}
        title="Ignorar por 7 dias"
      >
        ×
      </button>
    </div>
  );
}
