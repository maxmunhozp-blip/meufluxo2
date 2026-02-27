import { useState } from 'react';
import { ChevronDown, Plus, Users } from 'lucide-react';
import type { Workspace } from '@/hooks/useSupabaseData';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSwitch: (id: string) => void;
  onInvite: (email: string) => Promise<void>;
  onCreate: (name: string) => Promise<string>;
}

export function WorkspaceSelector({ workspaces, activeWorkspaceId, onSwitch, onInvite, onCreate }: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try {
      await onInvite(email.trim());
      setEmail('');
      setInviteOpen(false);
    } catch {
      // error handled in hook
    }
    setInviting(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreate(newName.trim());
      setNewName('');
      setCreateOpen(false);
    } catch {
      // error handled in hook
    }
    setCreating(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 pt-5 pb-4 hover:bg-accent/30 transition-colors"
      >
        <div className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center text-primary text-[13px] font-bold flex-shrink-0">
          {(activeWs?.name || 'W').charAt(0).toUpperCase()}
        </div>
        <span className="text-[15px] font-bold text-foreground truncate flex-1 text-left">
          {activeWs?.name || 'MeuFluxo'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[98]" onClick={() => setOpen(false)} />
          <div
            className="absolute left-2 right-2 top-full z-[99] rounded-lg border border-border py-1 shadow-lg"
            style={{ background: 'hsl(var(--bg-surface))' }}
          >
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { onSwitch(ws.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 text-[13px] transition-colors rounded-md mx-0 ${
                  ws.id === activeWorkspaceId ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'
                }`}
                style={{ minHeight: 40 }}
              >
                <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{ws.name}</span>
              </button>
            ))}
            <div className="h-px bg-border mx-2 my-1" />
            <button
              onClick={() => { setInviteOpen(true); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 text-[13px] text-muted-foreground hover:bg-accent/50 transition-colors rounded-md"
              style={{ minHeight: 40 }}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Convidar membro</span>
            </button>
            <button
              onClick={() => { setCreateOpen(true); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 text-[13px] text-muted-foreground hover:bg-accent/50 transition-colors rounded-md"
              style={{ minHeight: 40 }}
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span>Novo Workspace</span>
            </button>
          </div>
        </>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-xl border border-border p-5 w-[360px]"
            style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
          >
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Convidar Membro</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Adicione um membro ao workspace <strong>{activeWs?.name}</strong>
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
              placeholder="email@exemplo.com"
              autoFocus
              className="w-full h-10 px-3 text-[14px] text-foreground bg-input rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setInviteOpen(false); setEmail(''); }}
                className="flex-1 h-9 text-[13px] text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                className="flex-1 h-9 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {inviting ? 'Enviando...' : 'Convidar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create workspace modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-xl border border-border p-5 w-[360px]"
            style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
          >
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Novo Workspace</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Crie um novo workspace para organizar seus projetos.
            </p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Nome do workspace"
              autoFocus
              className="w-full h-10 px-3 text-[14px] text-foreground bg-input rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setCreateOpen(false); setNewName(''); }}
                className="flex-1 h-9 text-[13px] text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex-1 h-9 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {creating ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
