import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { TaskMember } from '@/types/task';
import { Profile } from '@/hooks/useSupabaseData';

interface MemberPickerProps {
  members: TaskMember[];
  profiles: Profile[];
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function MemberPicker({ members, profiles, onAdd, onRemove }: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const memberIds = new Set(members.map(m => m.userId));
  const available = profiles.filter(p => !memberIds.has(p.id) && (
    !search || (p.fullName || '').toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div className="mb-6">
      <label className="text-[12px] font-semibold text-nd-text-secondary block mb-2">Membros</label>

      <div className="flex flex-wrap gap-2 items-center">
        {members.map(m => (
          <div
            key={m.userId}
            className="group flex items-center gap-1.5 h-7 px-2 rounded-full bg-nd-hover text-[12px] text-nd-text"
          >
            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {getInitials(m.fullName)}
            </div>
            <span className="truncate max-w-[100px]">{m.fullName || 'Sem nome'}</span>
            <button
              onClick={() => onRemove(m.userId)}
              className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-nd-text-muted hover:text-nd-overdue transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <div ref={containerRef} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="h-7 w-7 rounded-full border border-dashed border-nd-border flex items-center justify-center text-nd-text-muted hover:text-nd-text hover:border-nd-text-secondary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {open && (
            <div className="absolute left-0 top-9 z-50 w-56 rounded-lg border border-nd-border shadow-lg overflow-hidden"
              style={{ background: 'hsl(var(--bg-surface))' }}
            >
              <div className="p-2">
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar membro..."
                  className="w-full h-8 px-2 text-[13px] text-nd-text bg-nd-input rounded border border-transparent focus:border-nd-border-input focus:outline-none placeholder:text-nd-text-muted"
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {available.length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-nd-text-muted">Nenhum membro disponível</p>
                )}
                {available.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onAdd(p.id); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-nd-text hover:bg-nd-hover transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {getInitials(p.fullName)}
                    </div>
                    <span className="truncate">{p.fullName || 'Sem nome'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
