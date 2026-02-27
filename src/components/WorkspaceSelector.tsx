import { useState } from 'react';
import { ChevronDown, Plus, Users, Check, Pencil, Trash2, MoreHorizontal, Link2, Copy, CheckCircle } from 'lucide-react';
import type { Workspace } from '@/hooks/useSupabaseData';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSwitch: (id: string) => void;
  onInvite: (email: string) => Promise<void>;
  onCreate: (name: string) => Promise<string>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onGenerateInviteLink: () => Promise<string>;
}

export function WorkspaceSelector({ workspaces, activeWorkspaceId, onSwitch, onInvite, onCreate, onRename, onDelete, onGenerateInviteLink }: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuWsId, setMenuWsId] = useState<string | null>(null);

  // Invite link state
  const [inviteLink, setInviteLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const link = await onGenerateInviteLink();
      setInviteLink(link);
    } catch {}
    setGeneratingLink(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="relative px-4 pt-3">
      {/* Trigger — discrete, functional */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 group transition-colors"
      >
        <span className="text-[12px] font-medium" style={{ color: '#8888A0' }}>
          {activeWs?.name || 'Workspace'}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ color: '#8888A0' }}
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

            <button
              onClick={() => { setInviteOpen(true); setInviteLink(''); setCopied(false); setOpen(false); }}
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

      {/* Invite modal — link-based */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl border border-border p-5 w-[400px]" style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Convidar Membro</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              Gere um link de convite para <strong>{activeWs?.name}</strong>. O link expira em 7 dias.
            </p>

            {!inviteLink ? (
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="w-full h-10 flex items-center justify-center gap-2 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" />
                {generatingLink ? 'Gerando...' : 'Gerar link de convite'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 h-10 px-3 text-[13px] text-foreground bg-input rounded-lg border border-border focus:outline-none truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="h-10 px-3 flex items-center gap-1.5 text-[13px] font-medium rounded-lg border border-border transition-colors hover:bg-muted"
                    style={{ color: copied ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Envie este link por WhatsApp, email ou qualquer outro meio. Cada link só pode ser usado uma vez.
                </p>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setInviteOpen(false); setInviteLink(''); }}
                className="h-9 px-4 text-[13px] text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors"
              >
                Fechar
              </button>
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
