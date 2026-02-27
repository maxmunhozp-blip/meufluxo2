import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, LayoutDashboard, Building2, Search, ChevronLeft, ChevronRight, X, Shield, ShieldAlert, Ban, Crown } from 'lucide-react';
import { useAdminData, AdminUser, AdminUserDetail } from '@/hooks/useAdminData';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

type Tab = 'dashboard' | 'users' | 'workspaces';

const Admin = () => {
  const navigate = useNavigate();
  const admin = useAdminData();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if (admin.isSuperAdmin === false) {
      navigate('/');
    }
  }, [admin.isSuperAdmin, navigate]);

  useEffect(() => {
    if (admin.isSuperAdmin) {
      admin.fetchDashboard();
    }
  }, [admin.isSuperAdmin]);

  useEffect(() => {
    if (admin.isSuperAdmin && activeTab === 'users') admin.fetchUsers();
  }, [admin.isSuperAdmin, activeTab, admin.usersPage, admin.usersSearch, admin.usersPlanFilter]);

  useEffect(() => {
    if (admin.isSuperAdmin && activeTab === 'workspaces') admin.fetchWorkspaces();
  }, [admin.isSuperAdmin, activeTab, admin.workspacesPage, admin.workspacesSearch]);

  if (admin.loading || admin.isSuperAdmin === null) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const breadcrumb = () => {
    const parts = ['Admin'];
    if (activeTab === 'users') parts.push('Usuários');
    if (activeTab === 'workspaces') parts.push('Workspaces');
    if (admin.selectedUser) parts.push(admin.selectedUser.fullName || admin.selectedUser.email);
    return parts;
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      {/* Header */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-border shrink-0" style={{ background: 'hsl(var(--bg-sidebar))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao MeuFluxo
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumb().map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground/50">›</span>}
                <span className={i === breadcrumb().length - 1 ? 'text-foreground font-medium' : ''}>{part}</span>
              </span>
            ))}
          </div>
        </div>
        <span className="text-[10px] font-bold tracking-wider text-primary/60 uppercase">Admin Panel</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 border-r border-border p-2 shrink-0 flex flex-col gap-1" style={{ background: 'hsl(var(--bg-sidebar))' }}>
          {([
            { key: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
            { key: 'users' as Tab, label: 'Usuários', icon: Users },
            { key: 'workspaces' as Tab, label: 'Workspaces', icon: Building2 },
          ]).map(item => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); admin.setSelectedUser(null); }}
              className={`flex items-center gap-2 px-3 h-9 rounded-md text-[13px] transition-colors w-full ${
                activeTab === item.key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && <DashboardTab data={admin.dashboard} />}
          {activeTab === 'users' && !admin.selectedUser && (
            <UsersTab
              users={admin.users}
              total={admin.usersTotal}
              page={admin.usersPage}
              setPage={admin.setUsersPage}
              search={admin.usersSearch}
              setSearch={admin.setUsersSearch}
              planFilter={admin.usersPlanFilter}
              setPlanFilter={admin.setUsersPlanFilter}
              onSelectUser={(u) => admin.fetchUserDetail(u.id)}
            />
          )}
          {activeTab === 'users' && admin.selectedUser && (
            <UserDetailPanel
              user={admin.selectedUser}
              onClose={() => admin.setSelectedUser(null)}
              onUpdatePlan={async (wsId, plan) => { await admin.updatePlan(wsId, plan); admin.fetchUserDetail(admin.selectedUser!.id); }}
              onUpdateRole={async (role, action) => { await admin.updateRole(admin.selectedUser!.id, role, action); admin.fetchUserDetail(admin.selectedUser!.id); }}
              onBan={async (ban) => { await admin.banUser(admin.selectedUser!.id, ban); admin.fetchUserDetail(admin.selectedUser!.id); }}
            />
          )}
          {activeTab === 'workspaces' && (
            <WorkspacesTab
              workspaces={admin.workspaces}
              total={admin.workspacesTotal}
              page={admin.workspacesPage}
              setPage={admin.setWorkspacesPage}
              search={admin.workspacesSearch}
              setSearch={admin.setWorkspacesSearch}
              onUpdatePlan={async (wsId, plan) => { await admin.updatePlan(wsId, plan); admin.fetchWorkspaces(); }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

function DashboardTab({ data }: { data: any }) {
  if (!data) return <div className="text-muted-foreground text-sm">Carregando...</div>;

  const cards = [
    { label: 'Total Usuários', value: data.totalUsers, color: 'hsl(var(--primary))' },
    { label: 'Ativos (7 dias)', value: data.activeUsers, color: 'hsl(142 76% 36%)' },
    { label: 'Workspaces', value: data.totalWorkspaces, color: 'hsl(221 83% 53%)' },
    { label: 'Free / Pro', value: `${data.freeCount} / ${data.proCount}`, color: 'hsl(38 92% 50%)' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-lg font-bold text-foreground">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-lg border border-border p-4" style={{ background: 'hsl(var(--bg-surface))' }}>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{card.label}</p>
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border p-4" style={{ background: 'hsl(var(--bg-surface))' }}>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-4">Cadastros por Semana</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.signupsByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function UsersTab({
  users, total, page, setPage, search, setSearch, planFilter, setPlanFilter, onSelectUser,
}: {
  users: AdminUser[];
  total: number;
  page: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  planFilter: string;
  setPlanFilter: (f: string) => void;
  onSelectUser: (u: AdminUser) => void;
}) {
  const totalPages = Math.ceil(total / 20);
  const [localSearch, setLocalSearch] = useState(search);

  return (
    <div className="space-y-4 max-w-5xl">
      <h2 className="text-lg font-bold text-foreground">Usuários ({total})</h2>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(localSearch); setPage(1); } }}
            placeholder="Buscar nome ou email..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-muted/50 rounded-md border border-border outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="h-8 px-2 text-xs bg-muted/50 rounded-md border border-border outline-none"
        >
          <option value="all">Todos os planos</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden" style={{ background: 'hsl(var(--bg-surface))' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Usuário</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Email</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Plano</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Role</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Cadastro</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden xl:table-cell">Último login</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr
                key={u.id}
                onClick={() => onSelectUser(u)}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' }}>
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (u.fullName || u.email || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-foreground truncate max-w-[120px]">{u.fullName || '—'}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell truncate max-w-[180px]">{u.email}</td>
                <td className="px-3 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    u.plan === 'pro'
                      ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {u.plan.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell">
                  <div className="flex gap-1">
                    {u.roles.map(r => (
                      <span key={r} className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r === 'super_admin' ? 'bg-red-500/10 text-red-400' : 'bg-muted text-muted-foreground'
                      }`}>{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground hidden xl:table-cell">
                  {u.lastSignIn ? new Date(u.lastSignIn).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`w-2 h-2 rounded-full inline-block ${u.banned ? 'bg-destructive' : 'bg-green-500'}`} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{total} registros</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 text-muted-foreground">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 text-muted-foreground">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserDetailPanel({
  user, onClose, onUpdatePlan, onUpdateRole, onBan,
}: {
  user: AdminUserDetail;
  onClose: () => void;
  onUpdatePlan: (wsId: string, plan: string) => Promise<void>;
  onUpdateRole: (role: string, action: 'add' | 'remove') => Promise<void>;
  onBan: (ban: boolean) => Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState(false);

  const doAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try { await fn(); } finally { setActionLoading(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold text-foreground">{user.fullName || user.email}</h2>
        {user.banned && <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-bold">BANIDO</span>}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Email" value={user.email} />
        <InfoCard label="Cadastro" value={user.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '—'} />
        <InfoCard label="Último login" value={user.lastSignIn ? new Date(user.lastSignIn).toLocaleString('pt-BR') : 'Nunca'} />
        <InfoCard label="Roles" value={user.roles.join(', ')} />
      </div>

      {/* Workspaces */}
      <div className="rounded-lg border border-border p-4 space-y-3" style={{ background: 'hsl(var(--bg-surface))' }}>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Workspaces</p>
        {user.workspaces.map(ws => (
          <div key={ws.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{ws.name}</p>
              <p className="text-[11px] text-muted-foreground">Role: {ws.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                ws.plan === 'pro' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-muted text-muted-foreground'
              }`}>{ws.plan.toUpperCase()}</span>
              <button
                disabled={actionLoading}
                onClick={() => doAction(() => onUpdatePlan(ws.id, ws.plan === 'pro' ? 'free' : 'pro'))}
                className="px-2 py-1 text-[10px] font-medium rounded border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                {ws.plan === 'pro' ? 'Downgrade' : 'Upgrade'}
              </button>
            </div>
          </div>
        ))}
        {user.workspaces.length === 0 && <p className="text-xs text-muted-foreground">Nenhum workspace.</p>}
      </div>

      {/* Actions */}
      <div className="rounded-lg border border-border p-4 space-y-3" style={{ background: 'hsl(var(--bg-surface))' }}>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Ações</p>
        <div className="flex flex-wrap gap-2">
          {!user.roles.includes('super_admin') ? (
            <button
              disabled={actionLoading}
              onClick={() => doAction(() => onUpdateRole('super_admin', 'add'))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Crown className="w-3 h-3" /> Tornar Super Admin
            </button>
          ) : (
            <button
              disabled={actionLoading}
              onClick={() => doAction(() => onUpdateRole('super_admin', 'remove'))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <ShieldAlert className="w-3 h-3" /> Remover Super Admin
            </button>
          )}
          <button
            disabled={actionLoading}
            onClick={() => doAction(() => onBan(!user.banned))}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md border transition-colors disabled:opacity-50 ${
              user.banned
                ? 'border-green-500/30 text-green-500 hover:bg-green-500/10'
                : 'border-destructive/30 text-destructive hover:bg-destructive/10'
            }`}
          >
            <Ban className="w-3 h-3" /> {user.banned ? 'Desbanir' : 'Banir Usuário'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3" style={{ background: 'hsl(var(--bg-surface))' }}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-foreground font-medium truncate">{value}</p>
    </div>
  );
}

function WorkspacesTab({
  workspaces, total, page, setPage, search, setSearch, onUpdatePlan,
}: {
  workspaces: any[];
  total: number;
  page: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  onUpdatePlan: (wsId: string, plan: string) => Promise<void>;
}) {
  const totalPages = Math.ceil(total / 20);
  const [localSearch, setLocalSearch] = useState(search);

  return (
    <div className="space-y-4 max-w-5xl">
      <h2 className="text-lg font-bold text-foreground">Workspaces ({total})</h2>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setSearch(localSearch); setPage(1); } }}
          placeholder="Buscar workspace..."
          className="w-full h-8 pl-8 pr-3 text-xs bg-muted/50 rounded-md border border-border outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden" style={{ background: 'hsl(var(--bg-surface))' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Owner</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Plano</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Membros</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Projetos</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Tarefas</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Criado em</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Ação</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map(ws => (
              <tr key={ws.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5 font-medium text-foreground">{ws.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{ws.ownerName}</td>
                <td className="px-3 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    ws.plan === 'pro' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-muted text-muted-foreground'
                  }`}>{ws.plan.toUpperCase()}</span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{ws.members}</td>
                <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{ws.projects}</td>
                <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">{ws.tasks}</td>
                <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">{new Date(ws.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => onUpdatePlan(ws.id, ws.plan === 'pro' ? 'free' : 'pro')}
                    className="px-2 py-1 text-[10px] font-medium rounded border border-border hover:bg-muted transition-colors"
                  >
                    {ws.plan === 'pro' ? 'Downgrade' : 'Upgrade'}
                  </button>
                </td>
              </tr>
            ))}
            {workspaces.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Nenhum workspace encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{total} registros</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 text-muted-foreground">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 text-muted-foreground">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
