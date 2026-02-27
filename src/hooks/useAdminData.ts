import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardData {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  freeCount: number;
  proCount: number;
  signupsByWeek: { label: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  plan: string;
  roles: string[];
  createdAt: string;
  lastSignIn: string | null;
  banned: boolean;
}

export interface AdminUserDetail extends AdminUser {
  workspaces: { id: string; name: string; plan: string; role: string }[];
}

export interface AdminWorkspace {
  id: string;
  name: string;
  ownerName: string;
  plan: string;
  members: number;
  projects: number;
  tasks: number;
  createdAt: string;
}

async function adminFetch(action: string, params?: Record<string, string>, body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function useAdminData() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersPlanFilter, setUsersPlanFilter] = useState('all');
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [workspacesTotal, setWorkspacesTotal] = useState(0);
  const [workspacesPage, setWorkspacesPage] = useState(1);
  const [workspacesSearch, setWorkspacesSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);

  // Check if current user is super_admin
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsSuperAdmin(false); setLoading(false); return; }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      setIsSuperAdmin(!!data);
      setLoading(false);
    })();
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await adminFetch('dashboard');
      setDashboard(data);
    } catch (e) {
      console.error('Admin dashboard error:', e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminFetch('users', {
        page: String(usersPage),
        search: usersSearch,
        plan: usersPlanFilter,
      });
      setUsers(data.users);
      setUsersTotal(data.total);
    } catch (e) {
      console.error('Admin users error:', e);
    }
  }, [usersPage, usersSearch, usersPlanFilter]);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const data = await adminFetch('workspaces', {
        page: String(workspacesPage),
        search: workspacesSearch,
      });
      setWorkspaces(data.workspaces);
      setWorkspacesTotal(data.total);
    } catch (e) {
      console.error('Admin workspaces error:', e);
    }
  }, [workspacesPage, workspacesSearch]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    try {
      const data = await adminFetch('user-detail', { userId });
      setSelectedUser(data);
    } catch (e) {
      console.error('Admin user detail error:', e);
    }
  }, []);

  const updatePlan = useCallback(async (workspaceId: string, plan: string) => {
    await adminFetch('update-plan', {}, { workspaceId, plan });
  }, []);

  const updateRole = useCallback(async (userId: string, role: string, action: 'add' | 'remove') => {
    await adminFetch('update-role', {}, { userId, role, action });
  }, []);

  const banUser = useCallback(async (userId: string, ban: boolean) => {
    await adminFetch('ban-user', {}, { userId, ban });
  }, []);

  return {
    isSuperAdmin,
    loading,
    dashboard,
    users,
    usersTotal,
    usersPage,
    setUsersPage,
    usersSearch,
    setUsersSearch,
    usersPlanFilter,
    setUsersPlanFilter,
    workspaces,
    workspacesTotal,
    workspacesPage,
    setWorkspacesPage,
    workspacesSearch,
    setWorkspacesSearch,
    selectedUser,
    setSelectedUser,
    fetchDashboard,
    fetchUsers,
    fetchWorkspaces,
    fetchUserDetail,
    updatePlan,
    updateRole,
    banUser,
  };
}
