import { useState, useRef } from 'react';
import { X, Plus, GripVertical, Pencil, Trash2, BarChart2, Smartphone, FileText, Video, Users, Megaphone, Tag } from 'lucide-react';
import type { ServiceTag } from '@/types/task';

const ICON_OPTIONS = [
  { value: 'bar-chart-2', label: 'Tráfego', Icon: BarChart2 },
  { value: 'smartphone', label: 'Redes Sociais', Icon: Smartphone },
  { value: 'file-text', label: 'Relatórios', Icon: FileText },
  { value: 'video', label: 'Vídeos', Icon: Video },
  { value: 'users', label: 'Reuniões', Icon: Users },
  { value: 'megaphone', label: 'Campanha', Icon: Megaphone },
  { value: 'tag', label: 'Outro', Icon: Tag },
];

export function getTagIcon(iconName: string) {
  const found = ICON_OPTIONS.find(i => i.value === iconName);
  return found?.Icon || Tag;
}

interface ServiceTagsManagerProps {
  tags: ServiceTag[];
  onAdd: (name: string, icon: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onChangeIcon: (id: string, icon: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function ServiceTagsManager({ tags, onAdd, onRename, onChangeIcon, onDelete, onClose }: ServiceTagsManagerProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('tag');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [iconPickerId, setIconPickerId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onAdd(newName.trim(), newIcon);
    setNewName('');
    setNewIcon('tag');
    setAdding(false);
  };

  const handleRename = async (id: string) => {
    if (editValue.trim()) await onRename(id, editValue.trim());
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-md rounded-xl border border-border p-6"
        style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold text-foreground">Tipos de trabalho</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 mb-4">
          {tags.map(tag => {
            const IconComp = getTagIcon(tag.icon);
            return (
              <div key={tag.id} className="flex items-center gap-2 h-10 px-2 rounded-md hover:bg-accent/30 group relative">
                {/* Icon picker */}
                <button
                  onClick={() => setIconPickerId(iconPickerId === tag.id ? null : tag.id)}
                  className="w-6 h-6 flex items-center justify-center rounded flex-shrink-0"
                >
                  <IconComp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>

                {editingId === tag.id ? (
                  <input
                    ref={editRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(tag.id); if (e.key === 'Escape') setEditingId(null); }}
                    onBlur={() => handleRename(tag.id)}
                    autoFocus
                    className="flex-1 h-7 px-2 text-[13px] text-foreground bg-input rounded border border-primary focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-[13px] text-foreground truncate">{tag.name}</span>
                )}

                <button
                  onClick={() => { setEditingId(tag.id); setEditValue(tag.name); setTimeout(() => editRef.current?.focus(), 0); }}
                  className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => { onDelete(tag.id); }}
                  className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Icon picker dropdown */}
                {iconPickerId === tag.id && (
                  <div className="absolute left-0 top-full z-50 mt-1 p-2 rounded-lg border border-border flex gap-1 flex-wrap" style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', width: 200 }}>
                    {ICON_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { onChangeIcon(tag.id, opt.value); setIconPickerId(null); }}
                        className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${tag.icon === opt.value ? 'bg-primary/20' : 'hover:bg-accent/50'}`}
                        title={opt.label}
                      >
                        <opt.Icon className="w-4 h-4" style={{ color: tag.icon === opt.value ? 'hsl(var(--primary))' : 'var(--text-secondary)' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {adding ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const idx = ICON_OPTIONS.findIndex(i => i.value === newIcon);
                setNewIcon(ICON_OPTIONS[(idx + 1) % ICON_OPTIONS.length].value);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-border"
            >
              {(() => { const I = getTagIcon(newIcon); return <I className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />; })()}
            </button>
            <input
              ref={inputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
              onBlur={() => { if (newName.trim()) handleAdd(); else setAdding(false); }}
              autoFocus
              placeholder="Nome do tipo..."
              className="flex-1 h-8 px-2 text-[13px] text-foreground bg-input rounded border border-primary focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        ) : (
          <button
            onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar tipo
          </button>
        )}
      </div>
    </div>
  );
}
