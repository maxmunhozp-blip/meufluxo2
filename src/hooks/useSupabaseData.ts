import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project, Section, Task, TaskStatus, Priority, TaskMember, Comment, Subtask, Attachment, RecurrenceType, RecurrenceConfig, ServiceTag } from '@/types/task';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { usePlanLimits, PlanLimits, PlanType } from './usePlanLimits';

export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'member';
  acceptedAt: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

interface UseSupabaseDataReturn {
  projects: Project[];
  sections: Section[];
  tasks: Task[];
  profiles: Profile[];
  comments: Comment[];
  attachments: Attachment[];
  serviceTags: ServiceTag[];
  loading: boolean;
  session: Session | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  workspaceMembers: WorkspaceMember[];
  switchWorkspace: (workspaceId: string) => void;
  inviteToWorkspace: (email: string) => Promise<void>;
  generateInviteLink: () => Promise<string>;
  createWorkspace: (name: string) => Promise<string>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  acceptWorkspaceInvite: (workspaceId: string) => Promise<void>;
  addProjectMember: (projectId: string, userId: string) => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;
  getProjectMembers: (projectId: string) => WorkspaceMember[];
  setProjects: (fn: (prev: Project[]) => Project[]) => void;
  setSections: (fn: (prev: Section[]) => Section[]) => void;
  setTasks: (fn: (prev: Task[]) => Task[]) => void;
  exportData: () => void;
  importData: (file: File) => void;
  createProject: (name: string, color: string) => Promise<string>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  changeProjectColor: (id: string, color: string) => Promise<void>;
  createSection: (title: string, projectId: string, displayMonth?: string) => Promise<string>;
  renameSection: (id: string, title: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  deleteSectionFromDb: (id: string) => Promise<void>;
  createTask: (task: Partial<Task> & { name: string; section: string; projectId: string }) => Promise<string>;
  updateTask: (task: Task) => Promise<void>;
  batchUpdatePositions: (updates: { id: string; position: number }[]) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  restoreTask: (snapshot: Task) => Promise<void>;
  duplicateTask: (taskId: string) => Promise<string>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  reorderProjects: (projects: Project[]) => void;
  addTaskMember: (taskId: string, userId: string) => Promise<void>;
  removeTaskMember: (taskId: string, userId: string) => Promise<void>;
  addComment: (taskId: string, text: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  duplicateProject: (projectId: string, mode: 'sections' | 'tasks' | 'both') => Promise<string>;
  addSubtask: (parentTaskId: string, name: string) => Promise<void>;
  updateSubtask: (subtaskId: string, updates: { name?: string; status?: TaskStatus }) => Promise<void>;
  scheduleSubtask: (subtaskId: string, scheduledDate: string | null) => Promise<void>;
  deleteSubtask: (parentTaskId: string, subtaskId: string) => Promise<void>;
  reorderSubtasks: (parentTaskId: string, subtaskIds: string[]) => Promise<void>;
  uploadAttachment: (taskId: string, file: File) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  createServiceTag: (name: string, icon: string) => Promise<void>;
  renameServiceTag: (id: string, name: string) => Promise<void>;
  changeServiceTagIcon: (id: string, icon: string) => Promise<void>;
  deleteServiceTag: (id: string) => Promise<void>;
  planLimits: {
    plan: PlanType;
    limits: PlanLimits;
    canCreateProject: boolean;
    canCreateTaskInProject: (projectId: string) => boolean;
    canInviteMember: boolean;
    canCreateWorkspace: boolean;
    isPro: boolean;
  };
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  autoTagTask: (taskId: string, taskName: string, sectionId: string) => Promise<void>;
}

function mapDbProject(row: any): Project {
  return { id: row.id, name: row.name, color: row.color, workspaceId: row.workspace_id, position: row.position ?? 0 };
}

function mapDbSection(row: any): Section {
  return { id: row.id, title: row.name, projectId: row.project_id, workspaceId: row.workspace_id, displayMonth: row.display_month || undefined };
}

function mapDbTask(row: any): Task {
  return {
    id: row.id,
    name: row.title,
    status: row.status as TaskStatus,
    priority: row.priority as Priority | undefined,
    description: row.description || undefined,
    dueDate: row.due_date || undefined,
    assignee: row.assignee || undefined,
    dayPeriod: row.day_period || 'morning',
    recurrenceType: row.recurrence_type || null,
    recurrenceConfig: row.recurrence_config || undefined,
    section: row.section_id,
    projectId: row.project_id,
    rolloverCount: row.rollover_count || 0,
    originalDueDate: row.original_due_date || undefined,
    scheduledDate: row.scheduled_date || undefined,
    workspaceId: row.workspace_id,
    serviceTagId: row.service_tag_id || undefined,
    createdAt: row.created_at || undefined,
    displayMonth: row.display_month || undefined,
    position: row.position ?? 0,
    completedAt: row.completed_at || undefined,
  };
}

export function useSupabaseData(): UseSupabaseDataReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [workspacesState, setWorkspacesState] = useState<Workspace[]>([]);
  const [projectsState, setProjectsState] = useState<Project[]>([]);
  const [sectionsState, setSectionsState] = useState<Section[]>([]);
  const [tasksState, setTasksState] = useState<Task[]>([]);
  const [profilesState, setProfilesState] = useState<Profile[]>([]);
  const [commentsState, setCommentsState] = useState<Comment[]>([]);
  const [attachmentsState, setAttachmentsState] = useState<Attachment[]>([]);
  const [serviceTagsState, setServiceTagsState] = useState<ServiceTag[]>([]);
  const [workspaceMembersState, setWorkspaceMembersState] = useState<WorkspaceMember[]>([]);
  const [projectMembersState, setProjectMembersState] = useState<{ projectId: string; userId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Check super_admin role
  useEffect(() => {
    if (!session) { setIsSuperAdmin(false); return; }
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'super_admin')
      .maybeSingle()
      .then(({ data }) => setIsSuperAdmin(!!data));
  }, [session]);

  const planLimits = usePlanLimits(
    workspacesState,
    activeWorkspaceId,
    projectsState,
    tasksState,
    workspaceMembersState,
    isSuperAdmin,
  );

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionChecked(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch all data when session is available
  useEffect(() => {
    if (!sessionChecked) return;
    if (!session) { setLoading(false); return; }
    
    const fetchAll = async () => {
      setLoading(true);

      // Fetch user's workspaces
      const { data: wsMemberships } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, accepted_at, user_id')
        .eq('user_id', session.user.id);
      
      const wsIds = (wsMemberships || []).map(w => w.workspace_id);
      
      if (wsIds.length > 0) {
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('*')
          .in('id', wsIds);
        setWorkspacesState((wsData || []).map(w => ({ id: w.id, name: w.name, ownerId: w.owner_id })));
      }

      const wsId = wsIds[0] || null;
      setActiveWorkspaceId(wsId);

      // Fetch workspace members for active workspace
      if (wsId) {
        const { data: allWsMembers } = await supabase
          .from('workspace_members')
          .select('id, user_id, role, accepted_at')
          .eq('workspace_id', wsId);
        
        const { data: allProfiles } = await supabase.from('profiles').select('*');
        const profileMap = new Map((allProfiles || []).map(p => [p.id, p]));
        
        setWorkspaceMembersState((allWsMembers || []).map(m => {
          const p = profileMap.get(m.user_id);
          return {
            id: m.id,
            userId: m.user_id,
            fullName: p?.full_name || null,
            avatarUrl: p?.avatar_url || null,
            role: m.role as 'owner' | 'admin' | 'member',
            acceptedAt: m.accepted_at,
          };
        }));

        // Fetch project members
        const { data: projMembers } = await supabase
          .from('project_members')
          .select('project_id, user_id');
        setProjectMembersState((projMembers || []).map(pm => ({ projectId: pm.project_id, userId: pm.user_id })));

        // Fetch service tags
        const { data: tagsData } = await supabase
          .from('service_tags')
          .select('*')
          .eq('workspace_id', wsId)
          .order('position');
        setServiceTagsState((tagsData || []).map((t: any) => ({
          id: t.id, name: t.name, icon: t.icon, workspaceId: t.workspace_id, position: t.position,
        })));
      }

      const [projectsRes, sectionsRes, tasksRes, subtasksRes, profilesRes, membersRes, commentsRes, attachmentsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('archived', false).order('position').order('created_at'),
        supabase.from('sections').select('*').order('position'),
        supabase.from('tasks').select('*').is('parent_task_id', null).order('position'),
        supabase.from('tasks').select('*').not('parent_task_id', 'is', null).order('position'),
        supabase.from('profiles').select('*'),
        supabase.from('task_members').select('*'),
        supabase.from('comments').select('*').order('created_at', { ascending: true }),
        supabase.from('task_attachments' as any).select('*').order('created_at', { ascending: true }),
      ]);

      const profiles: Profile[] = (profilesRes.data || []).map((p: any) => ({
        id: p.id,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
      }));
      setProfilesState(profiles);

      // Map members by task
      const membersByTask: Record<string, TaskMember[]> = {};
      for (const m of (membersRes.data || [])) {
        const profile = profiles.find(p => p.id === m.user_id);
        const member: TaskMember = {
          id: m.id,
          userId: m.user_id,
          fullName: profile?.fullName || null,
          avatarUrl: profile?.avatarUrl || null,
        };
        if (!membersByTask[m.task_id]) membersByTask[m.task_id] = [];
        membersByTask[m.task_id].push(member);
      }

      // Map subtasks by parent
      const subtasksByParent: Record<string, Subtask[]> = {};
      for (const row of (subtasksRes.data || [])) {
        const sub: Subtask = {
          id: row.id,
          name: row.title,
          status: row.status as TaskStatus,
          priority: row.priority as Priority | undefined,
          description: row.description || undefined,
          dueDate: row.due_date || undefined,
          scheduledDate: row.scheduled_date || undefined,
          assignee: row.assignee || undefined,
          section: row.section_id,
          projectId: row.project_id,
          parentTaskId: row.parent_task_id,
          serviceTagId: row.service_tag_id || undefined,
          dayPeriod: row.day_period || 'morning',
          members: membersByTask[row.id] || [],
          position: row.position ?? 0,
        };
        if (!subtasksByParent[row.parent_task_id]) subtasksByParent[row.parent_task_id] = [];
        subtasksByParent[row.parent_task_id].push(sub);
      }

      // Nest level 2 subtasks into level 1 subtasks
      for (const parentId of Object.keys(subtasksByParent)) {
        subtasksByParent[parentId] = subtasksByParent[parentId].map(sub => ({
          ...sub,
          subtasks: subtasksByParent[sub.id] || [],
        }));
      }

      // Map comments
      const dbComments: Comment[] = (commentsRes.data || []).map((c: any) => {
        const profile = profiles.find(p => p.id === c.user_id);
        return {
          id: c.id,
          taskId: c.task_id,
          author: profile?.fullName || 'Usuário',
          authorId: c.user_id,
          text: c.content,
          date: c.created_at,
        };
      });
      setCommentsState(dbComments);

      // Map attachments
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const dbAttachments: Attachment[] = (attachmentsRes.data || []).map((a: any) => ({
        id: a.id,
        taskId: a.task_id,
        userId: a.user_id,
        fileName: a.file_name,
        filePath: a.file_path,
        fileSize: a.file_size,
        contentType: a.content_type,
        createdAt: a.created_at,
        url: `${SUPABASE_URL}/storage/v1/object/public/task-attachments/${a.file_path}`,
      }));
      setAttachmentsState(dbAttachments);

      if (projectsRes.data) setProjectsState(projectsRes.data.map(mapDbProject));
      if (sectionsRes.data) setSectionsState(sectionsRes.data.map(mapDbSection));
      if (tasksRes.data) {
        setTasksState(tasksRes.data.map((row: any) => ({
          ...mapDbTask(row),
          members: membersByTask[row.id] || [],
          subtasks: subtasksByParent[row.id] || [],
        })));
      }
      setLoading(false);
    };

    fetchAll();

    // Realtime subscriptions for all tables
    const channel = supabase
      .channel('all-realtime')
      // --- Projects ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, (payload) => {
        const p = mapDbProject(payload.new);
        setProjectsState(prev => prev.some(x => x.id === p.id) ? prev : [...prev, p]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, (payload) => {
        const p = mapDbProject(payload.new);
        setProjectsState(prev => prev.map(x => x.id === p.id ? p : x));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, (payload) => {
        setProjectsState(prev => prev.filter(x => x.id !== (payload.old as any).id));
      })
      // --- Sections ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sections' }, (payload) => {
        const s = mapDbSection(payload.new);
        setSectionsState(prev => prev.some(x => x.id === s.id) ? prev : [...prev, s]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sections' }, (payload) => {
        const s = mapDbSection(payload.new);
        setSectionsState(prev => prev.map(x => x.id === s.id ? s : x));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sections' }, (payload) => {
        setSectionsState(prev => prev.filter(x => x.id !== (payload.old as any).id));
      })
      // --- Tasks ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        const row = payload.new as any;
        if (row.parent_task_id) {
          // Subtask inserted - add to parent's subtasks
          const sub: Subtask = {
            id: row.id, name: row.title, status: row.status as TaskStatus,
            priority: row.priority as Priority | undefined,
            description: row.description || undefined,
            dueDate: row.due_date || undefined,
            scheduledDate: row.scheduled_date || undefined,
            section: row.section_id, projectId: row.project_id,
            parentTaskId: row.parent_task_id,
          };
          setTasksState(prev => prev.map(t => {
            // Direct child
            if (t.id === row.parent_task_id) {
              const exists = (t.subtasks || []).some(s => s.id === sub.id);
              if (exists) return t; // Already exists via optimistic update — don't reorder
              return { ...t, subtasks: [...(t.subtasks || []), sub] };
            }
            // Level 2: child of a subtask
            return {
              ...t,
              subtasks: (t.subtasks || []).map(s => {
                if (s.id === row.parent_task_id) {
                  const exists = (s.subtasks || []).some(ss => ss.id === sub.id);
                  if (exists) return s;
                  return { ...s, subtasks: [...(s.subtasks || []), sub] };
                }
                return s;
              }),
            };
          }));
          return;
        }
        const t = mapDbTask(row);
        setTasksState(prev => prev.some(x => x.id === t.id) ? prev : [t, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload) => {
        const row = payload.new as any;
        if (row.parent_task_id) {
          // Subtask updated - update in parent's subtasks
          setTasksState(prev => prev.map(t => {
            const updateSub = (s: Subtask): Subtask => s.id === row.id ? {
              ...s, name: row.title, status: row.status as TaskStatus,
              priority: row.priority as Priority | undefined,
              position: row.position ?? s.position,
              description: row.description || undefined,
              dueDate: row.due_date || undefined,
              scheduledDate: row.scheduled_date || undefined,
              dayPeriod: row.day_period || s.dayPeriod,
            } : { ...s, subtasks: (s.subtasks || []).map(updateSub) };
            return { ...t, subtasks: (t.subtasks || []).map(updateSub) };
          }));
          return;
        }
        setTasksState(prev => prev.map(t => t.id === row.id ? {
          ...t,
          name: row.title,
          status: row.status,
          priority: row.priority,
          position: row.position ?? t.position,
          description: row.description || undefined,
          dueDate: row.due_date || undefined,
          scheduledDate: row.scheduled_date || undefined,
          assignee: row.assignee || undefined,
          dayPeriod: row.day_period || 'morning',
          recurrenceType: row.recurrence_type || null,
          recurrenceConfig: row.recurrence_config || undefined,
          section: row.section_id,
          projectId: row.project_id,
          serviceTagId: row.service_tag_id || undefined,
        } : t));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        const old = payload.old as any;
        // Try removing as subtask from any parent
        setTasksState(prev => {
          const updated = prev.map(t => ({
            ...t,
            subtasks: (t.subtasks || []).filter(s => s.id !== old.id).map(s => ({
              ...s,
              subtasks: (s.subtasks || []).filter(ss => ss.id !== old.id),
            })),
          }));
          return updated.filter(t => t.id !== old.id);
        });
      })
      // --- Task Members ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_members' }, async (payload) => {
        const m = payload.new as any;
        const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', m.user_id).single();
        const member: TaskMember = {
          id: m.id,
          userId: m.user_id,
          fullName: profile?.full_name || null,
          avatarUrl: profile?.avatar_url || null,
        };
        setTasksState(prev => {
          const task = prev.find(t => t.id === m.task_id) || prev.find(t => (t.subtasks || []).some(s => s.id === m.task_id));
          const subtask = task ? (task.subtasks || []).find(s => s.id === m.task_id) : null;
          const targetName = subtask ? subtask.name : task?.name;
          if (targetName) {
            const currentUserId = session?.user?.id;
            if (currentUserId && m.user_id !== currentUserId) {
              toast.info(`${profile?.full_name || 'Alguém'} foi adicionado à tarefa "${targetName}"`, { duration: 4000 });
            } else if (currentUserId && m.user_id === currentUserId) {
              toast.info(`Você foi adicionado à tarefa "${targetName}"`, { duration: 4000 });
            }
          }
          return prev.map(t => {
            if (t.id === m.task_id) return { ...t, members: [...(t.members || []).filter(x => x.userId !== m.user_id), member] };
            const updatedSubs = (t.subtasks || []).map(s =>
              s.id === m.task_id ? { ...s, members: [...(s.members || []).filter(x => x.userId !== m.user_id), member] } : s
            );
            return { ...t, subtasks: updatedSubs };
          });
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'task_members' }, (payload) => {
        const old = payload.old as any;
        setTasksState(prev => {
          const task = prev.find(t => t.id === old.task_id);
          const subtask = task ? null : (() => { for (const t of prev) { const s = (t.subtasks || []).find(s => s.id === old.task_id); if (s) return s; } return null; })();
          const target = task || subtask;
          if (target) {
            const removedMember = ('members' in target ? target.members || [] : []).find((x: TaskMember) => x.id === old.id);
            const currentUserId = session?.user?.id;
            if (removedMember && currentUserId) {
              if (removedMember.userId === currentUserId) {
                toast.info(`Você foi removido da tarefa "${target.name || (target as any).name}"`, { duration: 4000 });
              } else {
                toast.info(`${removedMember.fullName || 'Alguém'} foi removido da tarefa "${target.name || (target as any).name}"`, { duration: 4000 });
              }
            }
          }
          return prev.map(t => {
            if (t.id === old.task_id) return { ...t, members: (t.members || []).filter(x => x.id !== old.id) };
            const updatedSubs = (t.subtasks || []).map(s =>
              s.id === old.task_id ? { ...s, members: (s.members || []).filter(x => x.id !== old.id) } : s
            );
            return { ...t, subtasks: updatedSubs };
          });
        });
      })
      // --- Comments ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
        const c = payload.new as any;
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', c.user_id).single();
        const comment: Comment = {
          id: c.id,
          taskId: c.task_id,
          author: profile?.full_name || 'Usuário',
          authorId: c.user_id,
          text: c.content,
          date: c.created_at,
        };
        setCommentsState(prev => prev.some(x => x.id === c.id) ? prev : [...prev, comment]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload) => {
        setCommentsState(prev => prev.filter(c => c.id !== (payload.old as any).id));
      })
      // --- Attachments ---
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_attachments' }, (payload) => {
        const a = payload.new as any;
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const attachment: Attachment = {
          id: a.id, taskId: a.task_id, userId: a.user_id,
          fileName: a.file_name, filePath: a.file_path,
          fileSize: a.file_size, contentType: a.content_type,
          createdAt: a.created_at,
          url: `${SUPABASE_URL}/storage/v1/object/public/task-attachments/${a.file_path}`,
        };
        setAttachmentsState(prev => prev.some(x => x.id === a.id) ? prev : [...prev, attachment]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'task_attachments' }, (payload) => {
        setAttachmentsState(prev => prev.filter(a => a.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // Project operations
  const createProject = useCallback(async (name: string, color: string): Promise<string> => {
    if (!planLimits.canCreateProject) {
      setShowUpgradeModal(true);
      throw new Error('Limite de projetos atingido');
    }
    if (!activeWorkspaceId) throw new Error('Nenhum workspace ativo');
    const { data, error } = await supabase.from('projects').insert({ name, color, workspace_id: activeWorkspaceId }).select().single();
    if (error) throw error;
    const project = mapDbProject(data);
    setProjectsState(prev => prev.some(x => x.id === project.id) ? prev : [...prev, project]);
    return project.id;
  }, [activeWorkspaceId]);

  const renameProject = useCallback(async (id: string, name: string) => {
    await supabase.from('projects').update({ name }).eq('id', id);
    setProjectsState(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    // Delete tasks and sections first (cascade might handle, but be explicit)
    await supabase.from('tasks').delete().eq('project_id', id);
    await supabase.from('sections').delete().eq('project_id', id);
    await supabase.from('projects').delete().eq('id', id);
    setProjectsState(prev => prev.filter(p => p.id !== id));
    setSectionsState(prev => prev.filter(s => s.projectId !== id));
    setTasksState(prev => prev.filter(t => t.projectId !== id));
  }, []);

  const changeProjectColor = useCallback(async (id: string, color: string) => {
    await supabase.from('projects').update({ color }).eq('id', id);
    setProjectsState(prev => prev.map(p => p.id === id ? { ...p, color } : p));
  }, []);

  const reorderProjects = useCallback(async (reordered: Project[]) => {
    setProjectsState(reordered);
    // Persist position to DB
    await Promise.all(reordered.map((p, i) =>
      supabase.from('projects').update({ position: i }).eq('id', p.id)
    ));
  }, []);

  // Section operations
  const createSection = useCallback(async (title: string, projectId: string, displayMonth?: string): Promise<string> => {
    if (!activeWorkspaceId) throw new Error('Nenhum workspace ativo');
    const position = sectionsState.filter(s => s.projectId === projectId).length;
    const { data, error } = await supabase.from('sections').insert({ 
      name: title, 
      project_id: projectId, 
      position,
      workspace_id: activeWorkspaceId,
      ...(displayMonth ? { display_month: displayMonth } : {}),
    }).select().single();
    if (error) throw error;
    const section = mapDbSection(data);
    setSectionsState(prev => prev.some(x => x.id === section.id) ? prev : [...prev, section]);
    return section.id;
  }, [sectionsState, activeWorkspaceId]);

  const renameSection = useCallback(async (id: string, title: string) => {
    await supabase.from('sections').update({ name: title }).eq('id', id);
    setSectionsState(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  }, []);

  const deleteSection = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('section_id', id);
    await supabase.from('sections').delete().eq('id', id);
    setSectionsState(prev => prev.filter(s => s.id !== id));
    setTasksState(prev => prev.filter(t => t.section !== id));
  }, []);

  // DB-only delete (no state update) — used when UI is already updated optimistically
  const deleteSectionFromDb = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('section_id', id);
    await supabase.from('sections').delete().eq('id', id);
  }, []);

  // Task operations
  const createTask = useCallback(async (taskData: Partial<Task> & { name: string; section: string; projectId: string }): Promise<string> => {
    if (!planLimits.canCreateTaskInProject(taskData.projectId)) {
      setShowUpgradeModal(true);
      throw new Error('Limite de tarefas no projeto atingido');
    }
    if (!activeWorkspaceId) throw new Error('Nenhum workspace ativo');
    const position = tasksState.filter(t => t.section === taskData.section && t.projectId === taskData.projectId).length;
    const { data, error } = await supabase.from('tasks').insert({
      title: taskData.name,
      section_id: taskData.section,
      project_id: taskData.projectId,
      status: taskData.status || 'pending',
      priority: taskData.priority || 'low',
      description: taskData.description || null,
      due_date: taskData.dueDate || null,
      scheduled_date: taskData.scheduledDate || null,
      assignee: taskData.assignee || null,
      day_period: taskData.dayPeriod || 'morning',
      service_tag_id: taskData.serviceTagId || null,
      display_month: taskData.displayMonth || null,
      position,
      created_by: session?.user?.id || null,
      workspace_id: activeWorkspaceId,
    }).select().single();
    if (error) throw error;
    const task = { ...mapDbTask(data), members: [], subtasks: [] };
    setTasksState(prev => prev.some(x => x.id === task.id) ? prev : [task, ...prev]);
    return task.id;
  }, [tasksState, session, activeWorkspaceId]);

  const updateTask = useCallback(async (task: Task) => {
    const updates: Record<string, any> = {
      title: task.name,
      status: task.status,
      priority: task.priority || 'low',
      description: task.description || null,
      due_date: task.dueDate || null,
      scheduled_date: task.scheduledDate || null,
      assignee: task.assignee || null,
      section_id: task.section,
      day_period: task.dayPeriod || 'morning',
      recurrence_type: task.recurrenceType || null,
      recurrence_config: (task.recurrenceConfig as any) || null,
      service_tag_id: task.serviceTagId || null,
      parent_task_id: task.parentTaskId || null,
    };
    // Only include display_month if defined (column is NOT NULL)
    if (task.displayMonth) updates.display_month = task.displayMonth;
    // Persist position if provided
    if (task.position !== undefined) updates.position = task.position;
    await supabase.from('tasks').update(updates).eq('id', task.id);

    if (task.parentTaskId) {
      // Update subtask inside parent's subtasks array
      setTasksState(prev => prev.map(t => {
        if (t.id !== task.parentTaskId) return t;
        return {
          ...t,
          subtasks: (t.subtasks || []).map(s => s.id === task.id ? {
            ...s,
            ...task,
          } : s),
        };
      }));
    } else {
      // Check if this was previously a subtask being promoted to independent task
      setTasksState(prev => {
        const wasSubtask = prev.some(t => (t.subtasks || []).some(s => s.id === task.id));
        if (wasSubtask) {
          // Remove from parent's subtasks and add as top-level task
          return [
            ...prev.map(t => ({
              ...t,
              subtasks: (t.subtasks || []).filter(s => s.id !== task.id),
            })),
            task,
          ];
        }
        return prev.map(t => t.id === task.id ? task : t);
      });
    }
  }, []);

  /** Batch update positions for multiple tasks in a single state update */
  const batchUpdatePositions = useCallback(async (updates: { id: string; position: number }[]) => {
    if (updates.length === 0) return;
    const posMap = new Map(updates.map(u => [u.id, u.position]));
    // Optimistic: update local state — top-level AND nested subtasks
    setTasksState(prev => {
      const updateSubtasks = (subs: Subtask[]): Subtask[] =>
        subs.map(s => ({
          ...s,
          position: posMap.has(s.id) ? posMap.get(s.id)! : (s as any).position,
          subtasks: s.subtasks ? updateSubtasks(s.subtasks) : undefined,
        }));
      return prev.map(t => ({
        ...t,
        position: posMap.has(t.id) ? posMap.get(t.id)! : t.position,
        subtasks: t.subtasks ? updateSubtasks(t.subtasks) : t.subtasks,
      }));
    });
    // Persist to DB in parallel
    await Promise.all(
      updates.map(u => supabase.from('tasks').update({ position: u.position }).eq('id', u.id))
    );
  }, []);

  const deleteTaskFn = useCallback(async (id: string) => {
    await supabase.from('task_members').delete().eq('task_id', id);
    await supabase.from('tasks').delete().eq('id', id);
    setTasksState(prev => {
      // Remove from top-level or from parent's subtasks
      return prev
        .filter(t => t.id !== id)
        .map(t => ({
          ...t,
          subtasks: (t.subtasks || []).filter(s => s.id !== id),
        }));
    });
  }, []);

  /** Re-insert a previously deleted task with its original ID and position */
  const restoreTaskFn = useCallback(async (snapshot: Task) => {
    if (!activeWorkspaceId) return;
    const { error } = await supabase.from('tasks').insert({
      id: snapshot.id,
      title: snapshot.name,
      section_id: snapshot.section,
      project_id: snapshot.projectId,
      status: snapshot.status,
      priority: snapshot.priority || 'low',
      description: snapshot.description || null,
      due_date: snapshot.dueDate || null,
      scheduled_date: snapshot.scheduledDate || null,
      assignee: snapshot.assignee || null,
      day_period: snapshot.dayPeriod || 'morning',
      service_tag_id: snapshot.serviceTagId || null,
      display_month: snapshot.displayMonth || undefined,
      recurrence_type: snapshot.recurrenceType || null,
      recurrence_config: (snapshot.recurrenceConfig as any) || null,
      parent_task_id: snapshot.parentTaskId || null,
      workspace_id: activeWorkspaceId,
      created_by: session?.user?.id || null,
    });
    if (error) {
      console.error('[restoreTask] Insert error:', error.message);
      return;
    }
    // Re-add members
    if (snapshot.members && snapshot.members.length > 0) {
      for (const m of snapshot.members) {
        await supabase.from('task_members').insert({ task_id: snapshot.id, user_id: m.userId });
      }
    }
    // Re-add to local state — if subtask, nest back inside parent
    if (snapshot.parentTaskId) {
      setTasksState(prev => prev.map(t => {
        if (t.id !== snapshot.parentTaskId) return t;
        const alreadyExists = (t.subtasks || []).some(s => s.id === snapshot.id);
        if (alreadyExists) return t;
        return { ...t, subtasks: [...(t.subtasks || []), snapshot as any] };
      }));
    } else {
      setTasksState(prev => prev.some(t => t.id === snapshot.id) ? prev : [snapshot, ...prev]);
    }
  }, [activeWorkspaceId, session]);

  const updateTaskStatus = useCallback(async (id: string, status: TaskStatus) => {
    const completedAt = status === 'done' ? new Date().toISOString() : null;
    await supabase.from('tasks').update({ status, completed_at: completedAt }).eq('id', id);
    setTasksState(prev => prev.map(t => {
      if (t.id === id) return { ...t, status, completedAt: completedAt || undefined };
      // Also update if it's a nested subtask
      if (t.subtasks) {
        const updatedSubs = t.subtasks.map(s => {
          if (s.id === id) return { ...s, status };
          if (s.subtasks) {
            return { ...s, subtasks: s.subtasks.map(ss => ss.id === id ? { ...ss, status } : ss) };
          }
          return s;
        });
        return { ...t, subtasks: updatedSubs };
      }
      return t;
    }));

    // Auto-create next occurrence for recurring tasks when marked done
    if (status === 'done') {
      const task = tasksState.find(t => t.id === id);
      if (task?.recurrenceType) {
        const { calculateNextOccurrence } = await import('@/lib/recurrence');
        const baseDate = task.scheduledDate || task.dueDate;
        const nextDate = calculateNextOccurrence(baseDate, task.recurrenceType, task.recurrenceConfig);
        if (nextDate) {
          // Anti-duplicate check
          const { data: existing } = await supabase
            .from('tasks')
            .select('id')
            .eq('title', task.name)
            .eq('project_id', task.projectId)
            .eq('scheduled_date', nextDate)
            .not('status', 'eq', 'done')
            .limit(1);

          if (!existing || existing.length === 0) {
            const { data } = await supabase.from('tasks').insert({
              title: task.name,
              section_id: task.section,
              project_id: task.projectId,
              status: 'pending',
              priority: task.priority || 'low',
              description: task.description || null,
              scheduled_date: nextDate,
              due_date: null,
              day_period: task.dayPeriod || 'morning',
              recurrence_type: task.recurrenceType,
              recurrence_config: (task.recurrenceConfig as any) || null,
              assignee: task.assignee || null,
              service_tag_id: task.serviceTagId || null,
              position: 0,
              created_by: session?.user?.id || null,
              workspace_id: activeWorkspaceId,
            }).select().single();
            if (data) {
              const newTask = { ...mapDbTask(data), members: [], subtasks: [] };
              setTasksState(prev => prev.some(x => x.id === newTask.id) ? prev : [newTask, ...prev]);
            }
          }
        }
      }
    }
  }, [tasksState, session, activeWorkspaceId]);
  // Duplicate task
  const duplicateTaskFn = useCallback(async (taskId: string): Promise<string> => {
    const task = tasksState.find(t => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada');

    const { data, error } = await supabase.from('tasks').insert({
      title: `${task.name} (cópia)`,
      section_id: task.section,
      project_id: task.projectId,
      status: task.status,
      priority: task.priority || 'low',
      description: task.description || null,
      due_date: task.dueDate || null,
      display_month: task.displayMonth || null,
      position: tasksState.filter(t => t.section === task.section).length,
      created_by: session?.user?.id || null,
      workspace_id: activeWorkspaceId,
    }).select().single();
    if (error) throw error;

    const newTask = { ...mapDbTask(data), members: [], subtasks: [] };
    setTasksState(prev => prev.some(x => x.id === newTask.id) ? prev : [...prev, newTask]);

    // Duplicate subtasks (level 1)
    for (const sub of (task.subtasks || [])) {
      const { data: newSub } = await supabase.from('tasks').insert({
        title: sub.name, parent_task_id: data.id, section_id: task.section,
        project_id: task.projectId, status: sub.status, priority: sub.priority || 'low',
        description: sub.description || null, due_date: sub.dueDate || null,
        position: (task.subtasks || []).indexOf(sub), workspace_id: activeWorkspaceId,
      }).select().single();
      if (!newSub) continue;

      // Level 2
      for (const sub2 of (sub.subtasks || [])) {
        await supabase.from('tasks').insert({
          title: sub2.name, parent_task_id: newSub.id, section_id: task.section,
          project_id: task.projectId, status: sub2.status, priority: sub2.priority || 'low',
          description: sub2.description || null, due_date: sub2.dueDate || null,
          position: (sub.subtasks || []).indexOf(sub2), workspace_id: activeWorkspaceId,
        });
      }
    }

    toast.success(`Tarefa duplicada com sucesso!`);
    return data.id;
  }, [tasksState, session]);

  // Task member operations
  const addTaskMember = useCallback(async (taskId: string, userId: string) => {
    const { data, error } = await supabase.from('task_members').insert({
      task_id: taskId,
      user_id: userId,
    }).select().single();
    if (error) throw error;
    const profile = profilesState.find(p => p.id === userId);
    const member: TaskMember = {
      id: data.id,
      userId: data.user_id,
      fullName: profile?.fullName || null,
      avatarUrl: profile?.avatarUrl || null,
    };
    setTasksState(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, members: [...(t.members || []).filter(x => x.userId !== userId), member] };
      // Check subtasks
      const updatedSubs = (t.subtasks || []).map(s =>
        s.id === taskId ? { ...s, members: [...(s.members || []).filter(x => x.userId !== userId), member] } : s
      );
      return { ...t, subtasks: updatedSubs };
    }));
  }, [profilesState]);

  const removeTaskMember = useCallback(async (taskId: string, userId: string) => {
    await supabase.from('task_members').delete().eq('task_id', taskId).eq('user_id', userId);
    setTasksState(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, members: (t.members || []).filter(m => m.userId !== userId) };
      const updatedSubs = (t.subtasks || []).map(s =>
        s.id === taskId ? { ...s, members: (s.members || []).filter(m => m.userId !== userId) } : s
      );
      return { ...t, subtasks: updatedSubs };
    }));
  }, []);

  // Comment operations
  const addCommentFn = useCallback(async (taskId: string, text: string) => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase.from('comments').insert({
      task_id: taskId,
      content: text,
      user_id: session.user.id,
    }).select().single();
    if (error) throw error;
    const profile = profilesState.find(p => p.id === session.user.id);
    const comment: Comment = {
      id: data.id,
      taskId: data.task_id,
      author: profile?.fullName || 'Você',
      authorId: data.user_id,
      text: data.content,
      date: data.created_at,
    };
    setCommentsState(prev => {
      if (prev.some(c => c.id === data.id)) return prev;
      return [...prev, comment];
    });
  }, [session, profilesState]);

  const deleteCommentFn = useCallback(async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
    setCommentsState(prev => prev.filter(c => c.id !== commentId));
  }, []);

  // Duplicate project
  const duplicateProjectFn = useCallback(async (projectId: string, mode: 'sections' | 'tasks' | 'both'): Promise<string> => {
    const project = projectsState.find(p => p.id === projectId);
    if (!project) throw new Error('Projeto não encontrado');

    // Create new project
    const { data: newProj, error: projErr } = await supabase.from('projects')
      .insert({ name: `${project.name} (cópia)`, color: project.color, workspace_id: activeWorkspaceId })
      .select().single();
    if (projErr) throw projErr;

    const newProjectId = newProj.id;
    setProjectsState(prev => prev.some(x => x.id === newProjectId) ? prev : [...prev, mapDbProject(newProj)]);

    if (mode === 'sections' || mode === 'both') {
      const projSections = sectionsState.filter(s => s.projectId === projectId);
      const sectionIdMap: Record<string, string> = {};

      for (const sec of projSections) {
        const { data: newSec, error: secErr } = await supabase.from('sections')
          .insert({ name: sec.title, project_id: newProjectId, position: projSections.indexOf(sec), workspace_id: activeWorkspaceId })
          .select().single();
        if (secErr) throw secErr;
        sectionIdMap[sec.id] = newSec.id;
        setSectionsState(prev => prev.some(x => x.id === newSec.id) ? prev : [...prev, mapDbSection(newSec)]);
      }

      if (mode === 'both') {
        const projTasks = tasksState.filter(t => t.projectId === projectId && !t.parentTaskId);
        for (const task of projTasks) {
          const newSectionId = sectionIdMap[task.section];
          if (!newSectionId) continue;
          const { data: newTask, error: taskErr } = await supabase.from('tasks').insert({
            title: task.name,
            section_id: newSectionId,
            project_id: newProjectId,
            status: task.status,
            priority: task.priority || 'low',
            description: task.description || null,
            due_date: task.dueDate || null,
            position: projTasks.indexOf(task),
            created_by: session?.user?.id || null,
            workspace_id: activeWorkspaceId,
          }).select().single();
          if (taskErr) continue;
          const mappedTask = { ...mapDbTask(newTask), members: [], subtasks: [] };
          setTasksState(prev => prev.some(x => x.id === newTask.id) ? prev : [...prev, mappedTask]);

          // Duplicate subtasks (level 1)
          for (const sub of (task.subtasks || [])) {
            const { data: newSub } = await supabase.from('tasks').insert({
              title: sub.name, parent_task_id: newTask.id, section_id: newSectionId,
              project_id: newProjectId, status: sub.status, priority: sub.priority || 'low',
              description: sub.description || null, due_date: sub.dueDate || null,
              position: (task.subtasks || []).indexOf(sub), workspace_id: activeWorkspaceId,
            }).select().single();
            if (!newSub) continue;

            // Duplicate level 2 subtasks
            for (const sub2 of (sub.subtasks || [])) {
              await supabase.from('tasks').insert({
                title: sub2.name, parent_task_id: newSub.id, section_id: newSectionId,
                project_id: newProjectId, status: sub2.status, priority: sub2.priority || 'low',
                description: sub2.description || null, due_date: sub2.dueDate || null,
                position: (sub.subtasks || []).indexOf(sub2), workspace_id: activeWorkspaceId,
              });
            }
          }
        }
      }
    }

    toast.success(`Projeto "${project.name}" duplicado com sucesso!`);
    return newProjectId;
  }, [projectsState, sectionsState, tasksState, session]);

  // Subtask operations
  const addSubtaskFn = useCallback(async (parentTaskId: string, name: string) => {
    // Find parent - could be top-level task or a subtask
    let section = '';
    let projectId = '';
    let existingSubtasks: Subtask[] = [];

    const topLevel = tasksState.find(t => t.id === parentTaskId);
    if (topLevel) {
      section = topLevel.section;
      projectId = topLevel.projectId;
      existingSubtasks = topLevel.subtasks || [];
    } else {
      // Search in subtasks (level 2)
      for (const t of tasksState) {
        const sub = (t.subtasks || []).find(s => s.id === parentTaskId);
        if (sub) {
          section = sub.section;
          projectId = sub.projectId;
          existingSubtasks = sub.subtasks || [];
          break;
        }
      }
    }
    if (!section || !projectId) {
      console.error('[addSubtask] Could not find parent task:', parentTaskId);
      return;
    }

    const position = existingSubtasks.length;
    try {
      const { data, error } = await supabase.from('tasks').insert({
        title: name,
        parent_task_id: parentTaskId,
        section_id: section,
        project_id: projectId,
        status: 'pending',
        priority: 'low',
        position,
        workspace_id: activeWorkspaceId,
      }).select().single();
      if (error) {
        console.error('[addSubtask] Insert error:', error.message);
        return;
      }
      const sub: Subtask = {
        id: data.id,
        name: data.title,
        status: data.status as TaskStatus,
        priority: data.priority as Priority | undefined,
        description: data.description || undefined,
        dueDate: data.due_date || undefined,
        section: data.section_id,
        projectId: data.project_id,
        parentTaskId: data.parent_task_id,
      };

      setTasksState(prev => prev.map(t => {
        // Direct child of top-level task
        if (t.id === parentTaskId) {
          return { ...t, subtasks: [...(t.subtasks || []).filter(s => s.id !== sub.id), sub] };
        }
        // Child of a subtask (level 2)
        return {
          ...t,
          subtasks: (t.subtasks || []).map(s => s.id === parentTaskId
            ? { ...s, subtasks: [...(s.subtasks || []).filter(ss => ss.id !== sub.id), sub] }
            : s
          ),
        };
      }));
    } catch (err) {
      console.error('[addSubtask] Unexpected error:', err);
    }
  }, [tasksState, activeWorkspaceId]);

  const updateSubtaskFn = useCallback(async (subtaskId: string, updates: { name?: string; status?: TaskStatus }) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.title = updates.name;
    if (updates.status !== undefined) {
      dbUpdates.status = updates.status;
      dbUpdates.completed_at = updates.status === 'done' ? new Date().toISOString() : null;
    }
    await supabase.from('tasks').update(dbUpdates).eq('id', subtaskId);
    setTasksState(prev => prev.map(t => ({
      ...t,
      subtasks: (t.subtasks || []).map(s => {
        if (s.id === subtaskId) {
          return { ...s, ...(updates.name !== undefined ? { name: updates.name } : {}), ...(updates.status !== undefined ? { status: updates.status } : {}) };
        }
        // Check level 2
        return {
          ...s,
          subtasks: (s.subtasks || []).map(ss => ss.id === subtaskId
            ? { ...ss, ...(updates.name !== undefined ? { name: updates.name } : {}), ...(updates.status !== undefined ? { status: updates.status } : {}) }
            : ss
          ),
        };
      }),
    })));
  }, []);

  const scheduleSubtaskFn = useCallback(async (subtaskId: string, scheduledDate: string | null) => {
    await supabase.from('tasks').update({ scheduled_date: scheduledDate }).eq('id', subtaskId);
    setTasksState(prev => prev.map(t => ({
      ...t,
      subtasks: (t.subtasks || []).map(s => {
        if (s.id === subtaskId) return { ...s, scheduledDate: scheduledDate || undefined };
        return {
          ...s,
          subtasks: (s.subtasks || []).map(ss =>
            ss.id === subtaskId ? { ...ss, scheduledDate: scheduledDate || undefined } : ss
          ),
        };
      }),
    })));
  }, []);

  const deleteSubtaskFn = useCallback(async (parentTaskId: string, subtaskId: string) => {
    await supabase.from('tasks').delete().eq('id', subtaskId);
    setTasksState(prev => prev.map(t => {
      if (t.id === parentTaskId) {
        return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId) };
      }
      return {
        ...t,
        subtasks: (t.subtasks || []).map(s => s.id === parentTaskId
          ? { ...s, subtasks: (s.subtasks || []).filter(ss => ss.id !== subtaskId) }
          : s
        ),
      };
    }));
  }, []);

  const reorderSubtasksFn = useCallback(async (parentTaskId: string, subtaskIds: string[]) => {
    setTasksState(prev => prev.map(t => {
      if (t.id === parentTaskId) {
        const subs = t.subtasks || [];
        const reordered = subtaskIds.map(id => subs.find(s => s.id === id)).filter(Boolean) as Subtask[];
        return { ...t, subtasks: reordered };
      }
      return {
        ...t,
        subtasks: (t.subtasks || []).map(s => {
          if (s.id === parentTaskId) {
            const subs = s.subtasks || [];
            const reordered = subtaskIds.map(id => subs.find(ss => ss.id === id)).filter(Boolean) as Subtask[];
            return { ...s, subtasks: reordered };
          }
          return s;
        }),
      };
    }));
    await Promise.all(subtaskIds.map((id, idx) =>
      supabase.from('tasks').update({ position: idx }).eq('id', id)
    ));
  }, []);

  // Legacy setters for compatibility with existing DnD code
  const setProjects = useCallback((fn: (prev: Project[]) => Project[]) => {
    setProjectsState(prev => fn(prev));
  }, []);

  const setSections = useCallback((fn: (prev: Section[]) => Section[]) => {
    setSectionsState(prev => fn(prev));
  }, []);

  const setTasks = useCallback((fn: (prev: Task[]) => Task[]) => {
    setTasksState(prev => fn(prev));
  }, []);

  const exportData = useCallback(() => {
    const json = JSON.stringify({ projects: projectsState, sections: sectionsState, tasks: tasksState }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meufluxo_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectsState, sectionsState, tasksState]);

  const importData = useCallback((_file: File) => {
    alert('Importação via arquivo não disponível no modo online. Use a interface para criar projetos e tarefas.');
  }, []);

  // Attachment operations
  const uploadAttachment = useCallback(async (taskId: string, file: File) => {
    if (!session?.user?.id) return;
    const ext = file.name.split('.').pop() || 'bin';
    const filePath = `${taskId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, { contentType: file.type });
    if (uploadError) { toast.error('Erro ao enviar arquivo'); throw uploadError; }
    const { error: dbError } = await (supabase.from('task_attachments' as any) as any).insert({
      task_id: taskId,
      user_id: session.user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      content_type: file.type || null,
    });
    if (dbError) { toast.error('Erro ao salvar anexo'); throw dbError; }
    // Refetch to update UI immediately (don't rely solely on realtime)
    const { data: newAtt } = await (supabase.from('task_attachments' as any) as any)
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (newAtt) {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const attachment: Attachment = {
        id: newAtt.id,
        taskId: newAtt.task_id,
        userId: newAtt.user_id,
        fileName: newAtt.file_name,
        filePath: newAtt.file_path,
        fileSize: newAtt.file_size,
        contentType: newAtt.content_type,
        createdAt: newAtt.created_at,
        url: `${SUPABASE_URL}/storage/v1/object/public/task-attachments/${newAtt.file_path}`,
      };
      setAttachmentsState(prev => prev.some(x => x.id === attachment.id) ? prev : [...prev, attachment]);
    }
    toast.success('Anexo enviado');
  }, [session]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    const att = attachmentsState.find(a => a.id === attachmentId);
    if (!att) return;
    await supabase.storage.from('task-attachments').remove([att.filePath]);
    await (supabase.from('task_attachments' as any) as any).delete().eq('id', attachmentId);
    setAttachmentsState(prev => prev.filter(a => a.id !== attachmentId));
    toast.success('Anexo removido');
  }, [attachmentsState]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    // Re-fetch data for new workspace
    setLoading(true);
    Promise.all([
      supabase.from('projects').select('*').eq('archived', false).order('position').order('created_at'),
      supabase.from('sections').select('*').order('position'),
      supabase.from('tasks').select('*').is('parent_task_id', null).order('position'),
      supabase.from('tasks').select('*').not('parent_task_id', 'is', null).order('position'),
    ]).then(([projectsRes, sectionsRes, tasksRes, subtasksRes]) => {
      // Filter to workspace
      const wsProjects = (projectsRes.data || []).filter((p: any) => p.workspace_id === workspaceId);
      setProjectsState(wsProjects.map(mapDbProject));
      const wsSections = (sectionsRes.data || []).filter((s: any) => s.workspace_id === workspaceId);
      setSectionsState(wsSections.map(mapDbSection));
      const wsTasks = (tasksRes.data || []).filter((t: any) => t.workspace_id === workspaceId);
      const wsSubtasks = (subtasksRes.data || []).filter((t: any) => t.workspace_id === workspaceId);
      const mappedTasks = wsTasks.map(mapDbTask);
      const mappedSubtasks = wsSubtasks.map(mapDbTask);
      // Attach subtasks
      const taskMap = new Map<string, Task>();
      mappedTasks.forEach(t => taskMap.set(t.id, { ...t, subtasks: [], members: [] }));
      mappedSubtasks.forEach(sub => {
        const parentId = (subtasksRes.data || []).find((r: any) => r.id === sub.id)?.parent_task_id;
        if (parentId) {
          const parent = taskMap.get(parentId);
          if (parent) parent.subtasks = [...(parent.subtasks || []), sub as any];
        }
      });
      setTasksState(Array.from(taskMap.values()));
      setLoading(false);
    });
  }, []);

  const inviteToWorkspace = useCallback(async (email: string) => {
    if (!planLimits.canInviteMember) {
      setShowUpgradeModal(true);
      throw new Error('Limite de membros atingido');
    }
    if (!activeWorkspaceId || !session) throw new Error('Nenhum workspace ativo');
    
    const { data, error } = await supabase.functions.invoke('invite-member', {
      body: { email, workspace_id: activeWorkspaceId },
    });
    
    if (error) { toast.error('Erro ao convidar membro'); throw error; }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    
    if (data?.member) {
      const m = data.member;
      setWorkspaceMembersState(prev => [...prev.filter(x => x.userId !== m.userId), {
        id: m.id,
        userId: m.userId,
        fullName: m.fullName,
        avatarUrl: m.avatarUrl,
        role: m.role,
        acceptedAt: m.acceptedAt,
      }]);
    }
    toast.success('Convite enviado com sucesso!');
  }, [activeWorkspaceId, session]);

  const generateInviteLink = useCallback(async (): Promise<string> => {
    if (!activeWorkspaceId || !session) throw new Error('Nenhum workspace ativo');
    
    const inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    
    const { error } = await supabase
      .from('workspace_invites' as any)
      .insert({
        workspace_id: activeWorkspaceId,
        invite_code: inviteCode,
        created_by: session.user.id,
      });
    
    if (error) { toast.error('Erro ao gerar link de convite'); throw error; }
    
    return `${window.location.origin}/invite/${inviteCode}`;
  }, [activeWorkspaceId, session]);

  const acceptWorkspaceInvite = useCallback(async (workspaceId: string) => {
    if (!session) return;
    await supabase
      .from('workspace_members')
      .update({ accepted_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('user_id', session.user.id);
    toast.success('Convite aceito!');
    switchWorkspace(workspaceId);
  }, [session, switchWorkspace]);

  const addProjectMember = useCallback(async (projectId: string, userId: string) => {
    const { error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId });
    if (error) { toast.error('Erro ao adicionar membro ao projeto'); throw error; }
    setProjectMembersState(prev => [...prev, { projectId, userId }]);
    toast.success('Membro adicionado ao projeto!');
  }, []);

  const removeProjectMember = useCallback(async (projectId: string, userId: string) => {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);
    if (error) { toast.error('Erro ao remover membro do projeto'); throw error; }
    setProjectMembersState(prev => prev.filter(pm => !(pm.projectId === projectId && pm.userId === userId)));
    toast.success('Membro removido do projeto!');
  }, []);

  const getProjectMembers = useCallback((projectId: string): WorkspaceMember[] => {
    const memberUserIds = new Set(projectMembersState.filter(pm => pm.projectId === projectId).map(pm => pm.userId));
    return workspaceMembersState.filter(wm => memberUserIds.has(wm.userId));
  }, [projectMembersState, workspaceMembersState]);

  const createWorkspace = useCallback(async (name: string): Promise<string> => {
    if (!planLimits.canCreateWorkspace) {
      setShowUpgradeModal(true);
      throw new Error('Limite de workspaces atingido');
    }
    if (!session) throw new Error('Não autenticado');
    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name, owner_id: session.user.id })
      .select()
      .single();
    if (error) { toast.error('Erro ao criar workspace'); throw error; }
    // Add self as owner member
    await supabase
      .from('workspace_members')
      .insert({ workspace_id: data.id, user_id: session.user.id, role: 'owner', accepted_at: new Date().toISOString() });
    const newWs: Workspace = { id: data.id, name: data.name, ownerId: data.owner_id };
    setWorkspacesState(prev => [...prev, newWs]);
    setActiveWorkspaceId(data.id);
    toast.success('Workspace criado!');
    return data.id;
  }, [session]);

  const renameWorkspace = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', id);
    if (error) { toast.error('Erro ao renomear workspace'); throw error; }
    setWorkspacesState(prev => prev.map(w => w.id === id ? { ...w, name } : w));
    toast.success('Workspace renomeado!');
  }, []);

  const deleteWorkspace = useCallback(async (id: string) => {
    if (workspacesState.length <= 1) { toast.error('Você precisa ter ao menos um workspace.'); return; }
    const { error } = await supabase.from('workspaces').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir workspace'); throw error; }
    setWorkspacesState(prev => prev.filter(w => w.id !== id));
    if (activeWorkspaceId === id) {
      const remaining = workspacesState.filter(w => w.id !== id);
      if (remaining.length > 0) switchWorkspace(remaining[0].id);
    }
    toast.success('Workspace excluído!');
  }, [workspacesState, activeWorkspaceId, switchWorkspace]);

  // Service tag operations
  const createServiceTag = useCallback(async (name: string, icon: string) => {
    if (!activeWorkspaceId) return;
    const position = serviceTagsState.length;
    const { data, error } = await supabase.from('service_tags').insert({
      name, icon, workspace_id: activeWorkspaceId, position,
    }).select().single();
    if (error) { toast.error('Erro ao criar tag'); return; }
    setServiceTagsState(prev => [...prev, { id: data.id, name: data.name, icon: data.icon, workspaceId: data.workspace_id, position: data.position }]);
  }, [activeWorkspaceId, serviceTagsState]);

  const renameServiceTag = useCallback(async (id: string, name: string) => {
    await supabase.from('service_tags').update({ name }).eq('id', id);
    setServiceTagsState(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  }, []);

  const changeServiceTagIcon = useCallback(async (id: string, icon: string) => {
    await supabase.from('service_tags').update({ icon }).eq('id', id);
    setServiceTagsState(prev => prev.map(t => t.id === id ? { ...t, icon } : t));
  }, []);

  const deleteServiceTag = useCallback(async (id: string) => {
    // Clear tag from tasks that use it
    await supabase.from('tasks').update({ service_tag_id: null }).eq('service_tag_id', id);
    await supabase.from('service_tags').delete().eq('id', id);
    setServiceTagsState(prev => prev.filter(t => t.id !== id));
    setTasksState(prev => prev.map(t => t.serviceTagId === id ? { ...t, serviceTagId: undefined } : t));
  }, []);

  const autoTagTask = useAutoTagTask(serviceTagsState, sectionsState, tasksState, setTasksState);

  return {
    projects: projectsState,
    sections: sectionsState,
    tasks: tasksState,
    profiles: profilesState,
    comments: commentsState,
    attachments: attachmentsState,
    serviceTags: serviceTagsState,
    loading,
    session,
    workspaces: workspacesState,
    activeWorkspaceId,
    workspaceMembers: workspaceMembersState,
    switchWorkspace,
    inviteToWorkspace,
    generateInviteLink,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    acceptWorkspaceInvite,
    addProjectMember,
    removeProjectMember,
    getProjectMembers,
    setProjects,
    setSections,
    setTasks,
    exportData,
    importData,
    createProject,
    renameProject,
    deleteProject,
    changeProjectColor,
    createSection,
    renameSection,
    deleteSection,
    deleteSectionFromDb,
    createTask,
    updateTask,
    batchUpdatePositions,
    deleteTask: deleteTaskFn,
    restoreTask: restoreTaskFn,
    duplicateTask: duplicateTaskFn,
    updateTaskStatus,
    reorderProjects,
    addTaskMember,
    removeTaskMember,
    addComment: addCommentFn,
    deleteComment: deleteCommentFn,
    duplicateProject: duplicateProjectFn,
    addSubtask: addSubtaskFn,
    updateSubtask: updateSubtaskFn,
    scheduleSubtask: scheduleSubtaskFn,
    deleteSubtask: deleteSubtaskFn,
    reorderSubtasks: reorderSubtasksFn,
    uploadAttachment,
    deleteAttachment,
    createServiceTag,
    renameServiceTag,
    changeServiceTagIcon,
    deleteServiceTag,
    planLimits,
    showUpgradeModal,
    setShowUpgradeModal,
    autoTagTask,
  };
}

/**
 * Fire-and-forget: calls AI to suggest a service tag for a task based on context.
 * Updates the task in DB and local state if a match is found.
 * Gracefully fails silently — never blocks the user.
 */
function useAutoTagTask(
  serviceTagsState: ServiceTag[],
  sectionsState: Section[],
  tasksState: Task[],
  setTasksState: React.Dispatch<React.SetStateAction<Task[]>>,
) {
  return useCallback(async (taskId: string, taskName: string, sectionId: string) => {
    try {
      if (serviceTagsState.length === 0) return;

      // Respect manual choice: only auto-tag if no tag is set ("nenhum")
      const existing = tasksState.find(t => t.id === taskId)
        || tasksState.flatMap(t => t.subtasks || []).find(s => s.id === taskId);
      if (existing?.serviceTagId) return;

      const section = sectionsState.find(s => s.id === sectionId);
      const sectionName = section?.title || '';

      const { data, error } = await supabase.functions.invoke('auto-service-tag', {
        body: {
          taskName,
          sectionName,
          serviceTags: serviceTagsState.map(t => ({ id: t.id, name: t.name })),
        },
      });

      if (error || !data?.serviceTagId) return;

      // Update DB
      await supabase.from('tasks').update({ service_tag_id: data.serviceTagId }).eq('id', taskId);

      // Update local state
      setTasksState(prev => prev.map(t => {
        if (t.id === taskId) return { ...t, serviceTagId: data.serviceTagId };
        // Also check subtasks
        if (t.subtasks?.some(s => s.id === taskId)) {
          return {
            ...t,
            subtasks: t.subtasks.map(s => s.id === taskId ? { ...s, serviceTagId: data.serviceTagId } : s),
          };
        }
        return t;
      }));
    } catch (e) {
      // Silent fail — auto-tag is a convenience, not critical
      console.warn('Auto-tag failed:', e);
    }
  }, [serviceTagsState, sectionsState, tasksState, setTasksState]);
}
