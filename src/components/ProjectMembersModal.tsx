import { useState } from 'react';
import { X, UserPlus, UserMinus } from 'lucide-react';
import type { WorkspaceMember } from '@/hooks/useSupabaseData';

interface ProjectMembersModalProps {
  projectId: string;
  projectName: string;
  workspaceMembers: WorkspaceMember[];
  projectMembers: WorkspaceMember[];
  onAdd: (projectId: string, userId: string) => Promise<void>;
  onRemove: (projectId: string, userId: string) => Promise<void>;
  onClose: () => void;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ProjectMembersModal({ projectId, projectName, workspaceMembers, projectMembers, onAdd, onRemove, onClose }: ProjectMembersModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const projectMemberIds = new Set(projectMembers.map(m => m.userId));

  const handleToggle = async (userId: string) => {
    setLoading(userId);
    try {
      if (projectMemberIds.has(userId)) {
        await onRemove(projectId, userId);
      } else {
        await onAdd(projectId, userId);
      }
    } catch {}
    setLoading(null);
  };

  // Only show accepted members (non-owners/admins) since owners/admins see all projects
  const toggleableMembers = workspaceMembers.filter(m => m.role === 'member' && m.acceptedAt);
  const adminMembers = workspaceMembers.filter(m => m.role === 'owner' || m.role === 'admin');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl border border-border p-5 w-[400px] max-h-[80vh] flex flex-col" style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Membros do Projeto</h3>
            <p className="text-[13px] text-muted-foreground">{projectName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {/* Admins/owners - always have access */}
          {adminMembers.length > 0 && (
            <>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-1">Administradores (acesso total)</p>
              {adminMembers.map(m => (
                <div key={m.userId} className="flex items-center gap-2.5 px-2 py-2 rounded-md">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {getInitials(m.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-foreground truncate block">{m.fullName || 'Sem nome'}</span>
                    <span className="text-[11px] text-muted-foreground capitalize">{m.role}</span>
                  </div>
                </div>
              ))}
              {toggleableMembers.length > 0 && <div className="h-px bg-border my-2" />}
            </>
          )}

          {/* Regular members - toggleable */}
          {toggleableMembers.length > 0 && (
            <>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-1">Membros</p>
              {toggleableMembers.map(m => {
                const hasAccess = projectMemberIds.has(m.userId);
                const isLoading = loading === m.userId;
                return (
                  <div key={m.userId} className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {getInitials(m.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-foreground truncate block">{m.fullName || 'Sem nome'}</span>
                    </div>
                    <button
                      onClick={() => handleToggle(m.userId)}
                      disabled={isLoading}
                      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                        hasAccess 
                          ? 'text-primary bg-primary/10 hover:bg-primary/20' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      } disabled:opacity-50`}
                      title={hasAccess ? 'Remover acesso' : 'Dar acesso'}
                    >
                      {hasAccess ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {toggleableMembers.length === 0 && adminMembers.length === 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-4">Nenhum membro no workspace</p>
          )}

          {toggleableMembers.length === 0 && adminMembers.length > 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-4">Convide membros ao workspace primeiro</p>
          )}
        </div>
      </div>
    </div>
  );
}
