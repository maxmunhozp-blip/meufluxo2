import { useState } from 'react';
import { ChevronDown, Plus, Users, Check, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import type { Workspace } from '@/hooks/useSupabaseData';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSwitch: (id: string) => void;
  onInvite: (email: string) => Promise<void>;
  onCreate: (name: string) => Promise<string>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function WorkspaceSelector({ workspaces, activeWorkspaceId, onSwitch, onInvite, onCreate, onRename, onDelete }: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuWsId, setMenuWsId] = useState<string | null>(null);

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try { await onInvite(email.trim()); setEmail(''); setInviteOpen(false); } catch {}
    setInviting(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try { await onCreate(newName.trim()); setNewName(''); setCreateOpen(false); } catch {}
    setCreating(false);
  };

  const handleRename = async () => {
    if (!renameOpen || !renameValue.trim()) return;
    try { await onRename(renameOpen, renameValue.trim()); } catch {}
    setRenameOpen(null); setRenameValue('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este workspace e todos os seus dados?')) return;
    setMenuWsId(null); setOpen(false);
    await onDelete(id);
  };

  return (
    <div className="relative px-4 pt-4 pb-1">
      {/* Trigger — looks like a subtle label, not a button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 group transition-colors"
      >
        <span className="text-[12px] font-medium tracking-wide uppercase" style={{ color: 'hsl(var(--sidebar-label))' }}>
          {activeWs?.name || 'Workspace'}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: 'hsl(var(--sidebar-label))' }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-[98]" onClick={() => { setOpen(false); setMenuWsId(null); }} />
          <div
            className="absolute left-0 top-full mt-1 z-[99] rounded-[10px] py-1.5 min-w-[220px]"
            style={{
              background: 'hsl(var(--dropdown-bg))',
              border: '1px solid hsl(var(--dropdown-border))',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}
          >
            {/* Workspace list */}
            {workspaces.map(ws => (
              <div key={ws.id} className="relative group/item flex items-center">
                <button
                  onClick={() => { onSwitch(ws.id); setOpen(false); setMenuWsId(null); }}
                  className="flex-1 flex items-center gap-2.5 px-3 text-[13px] transition-colors rounded-md mx-1"
                  style={{
                    minHeight: 36,
                    color: ws.id === activeWorkspaceId ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--dropdown-hover))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* Checkmark for active */}
                  <span className="w-4 flex items-center justify-center flex-shrink-0">
                    {ws.id === activeWorkspaceId && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className={`truncate ${ws.id === activeWorkspaceId ? 'font-medium' : ''}`}>
                    {ws.name}
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuWsId(menuWsId === ws.id ? null : ws.id); }}
                  className="opacity-0 group-hover/item:opacity-100 w-6 h-6 flex items-center justify-center rounded transition-all mr-1.5 flex-shrink-0"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--dropdown-hover))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Sub-menu */}
                {menuWsId === ws.id && (
                  <div
                    className="absolute left-full top-0 ml-1 z-[100] rounded-[10px] py-1 min-w-[130px]"
                    style={{
                      background: 'hsl(var(--dropdown-bg))',
                      border: '1px solid hsl(var(--dropdown-border))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    }}
                  >
                    <button
                      onClick={() => { setRenameOpen(ws.id); setRenameValue(ws.name); setMenuWsId(null); setOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 h-8 text-[13px] transition-colors rounded-md mx-0"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--dropdown-hover))'; (e.currentTarget as HTMLElement).style.color = 'hsl(var(--foreground))'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'hsl(var(--muted-foreground))'; }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Renomear
                    </button>
                    <button
                      onClick={() => handleDelete(ws.id)}
                      className="w-full flex items-center gap-2 px-3 h-8 text-[13px] transition-colors rounded-md mx-0"
                      style={{ color: 'hsl(var(--warning-muted))' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsla(var(--warning-muted) / 0.1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="h-px mx-2 my-1.5" style={{ background: 'hsl(var(--dropdown-border))' }} />

            {/* Secondary actions */}
            <button
              onClick={() => { setInviteOpen(true); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 text-[13px] transition-colors rounded-md mx-1"
              style={{ minHeight: 36, color: 'hsl(var(--muted-foreground))' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--dropdown-hover))'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Convidar membro</span>
            </button>
            <button
              onClick={() => { setCreateOpen(true); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 text-[13px] transition-colors rounded-md mx-1"
              style={{ minHeight: 36, color: 'hsl(var(--muted-foreground))' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'hsl(var(--dropdown-hover))'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Novo Workspace</span>
            </button>
          </div>
        </>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl border border-border p-5 w-[360px]" style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Convidar Membro</h3>
            <p className="text-[13px] text-muted-foreground mb-4">Adicione um membro ao workspace <strong>{activeWs?.name}</strong></p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }} placeholder="email@exemplo.com" autoFocus className="w-full h-10 px-3 text-[14px] text-foreground bg-input rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground mb-3" />
            <div className="flex gap-2">
              <button onClick={() => { setInviteOpen(false); setEmail(''); }} className="flex-1 h-9 text-[13px] text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors">Cancelar</button>
              <button onClick={handleInvite} disabled={inviting || !email.trim()} className="flex-1 h-9 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">{inviting ? 'Enviando...' : 'Convidar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl border border-border p-5 w-[360px]" style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Novo Workspace</h3>
            <p className="text-[13px] text-muted-foreground mb-4">Crie um novo workspace para organizar seus projetos.</p>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }} placeholder="Nome do workspace" autoFocus className="w-full h-10 px-3 text-[14px] text-foreground bg-input rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground mb-3" />
            <div className="flex gap-2">
              <button onClick={() => { setCreateOpen(false); setNewName(''); }} className="flex-1 h-9 text-[13px] text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors">Cancelar</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1 h-9 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">{creating ? 'Criando...' : 'Criar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl border border-border p-5 w-[360px]" style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Renomear Workspace</h3>
            <p className="text-[13px] text-muted-foreground mb-4">Digite o novo nome para o workspace.</p>
            <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }} autoFocus className="w-full h-10 px-3 text-[14px] text-foreground bg-input rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground mb-3" />
            <div className="flex gap-2">
              <button onClick={() => { setRenameOpen(null); setRenameValue(''); }} className="flex-1 h-9 text-[13px] text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors">Cancelar</button>
              <button onClick={handleRename} disabled={!renameValue.trim()} className="flex-1 h-9 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
