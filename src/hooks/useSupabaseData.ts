import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Project, Section, Task, TaskStatus, Priority, TaskMember, Comment, Subtask, Attachment, ServiceTag } from '@/types/task';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { usePlanLimits, PlanLimits, PlanType } from './usePlanLimits';

// ─── Domain Hooks ──────────────────────────────────────────
import { Profile, WorkspaceMember, Workspace, mapDbProject, mapDbSection, mapDbTask, SharedState } from './supabase/types';
import { useAuth } from './supabase/useAuth';
import { useWorkspaceOps } from './supabase/useWorkspaceOps';
import { useProjectOps } from './supabase/useProjectOps';
import { useSectionOps } from './supabase/useSectionOps';
import { useTaskOps } from './supabase/useTaskOps';
import { useCommentAttachmentOps } from './supabase/useCommentAttachmentOps';
import { useServiceTagOps } from './supabase/useServiceTagOps';
import { useDataExport } from './supabase/useDataExport';

// Re-export types for consumers
export type { Profile, WorkspaceMember, Workspace };

// ─── Return Type (unchanged public API) ────────────────────

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
  moveTaskToSection: (taskId: string, targetSectionId: string) => Promise<void>;
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

// ─── Orchestrator ──────────────────────────────────────────

export function useSupabaseData(): UseSupabaseDataReturn {
  // ── Auth ──
  const { session, sessionChecked, isSuperAdmin } = useAuth();

  // ── Shared State ──
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ── Plan Limits ──
  const planLimits = usePlanLimits(workspacesState, activeWorkspaceId, projectsState, tasksState, workspaceMembersState, isSuperAdmin);

  // ── Shared deps object ──
  const shared: SharedState = {
    session, activeWorkspaceId, projectsState, sectionsState, tasksState,
    profilesState, commentsState, attachmentsState, serviceTagsState,
    workspacesState, workspaceMembersState, projectMembersState,
    setProjectsState, setSectionsState, setTasksState, setProfilesState,
    setCommentsState, setAttachmentsState, setServiceTagsState,
    setWorkspacesState, setWorkspaceMembersState, setProjectMembersState,
    setActiveWorkspaceId, setLoading, setShowUpgradeModal, planLimits,
  };

  // ── Domain Hooks ──
  const workspaceOps = useWorkspaceOps(shared);
  const projectOps = useProjectOps(shared);
  const sectionOps = useSectionOps(shared);
  const taskOps = useTaskOps(shared);
  const commentAttachmentOps = useCommentAttachmentOps(shared);
  const serviceTagOps = useServiceTagOps(shared);
  const { exportData, importData } = useDataExport(projectsState, sectionsState, tasksState);

  // ── Initial Data Fetch ──
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
        const { data: wsData } = await supabase.from('workspaces').select('*').in('id', wsIds);
        setWorkspacesState((wsData || []).map(w => ({ id: w.id, name: w.name, ownerId: w.owner_id, clientsLabel: (w as any).clients_label || 'Clientes' })));
      }

      const wsId = wsIds[0] || null;
      setActiveWorkspaceId(wsId);

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
            id: m.id, userId: m.user_id, fullName: p?.full_name || null,
            avatarUrl: p?.avatar_url || null, role: m.role as 'owner' | 'admin' | 'member',
            acceptedAt: m.accepted_at,
          };
        }));

        const { data: projMembers } = await supabase.from('project_members').select('project_id, user_id');
        setProjectMembersState((projMembers || []).map(pm => ({ projectId: pm.project_id, userId: pm.user_id })));

        const { data: tagsData } = await supabase.from('service_tags').select('*').eq('workspace_id', wsId).order('position');
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
        id: p.id, fullName: p.full_name, avatarUrl: p.avatar_url,
      }));
      setProfilesState(profiles);

      const membersByTask: Record<string, TaskMember[]> = {};
      for (const m of (membersRes.data || [])) {
        const profile = profiles.find(p => p.id === m.user_id);
        const member: TaskMember = { id: m.id, userId: m.user_id, fullName: profile?.fullName || null, avatarUrl: profile?.avatarUrl || null };
        if (!membersByTask[m.task_id]) membersByTask[m.task_id] = [];
        membersByTask[m.task_id].push(member);
      }

      // Build flat map of all subtasks by their parent_task_id
      const allSubsFlat: Record<string, Subtask> = {};
      const subtasksByParent: Record<string, Subtask[]> = {};
      for (const row of (subtasksRes.data || [])) {
        const sub: Subtask = {
          id: row.id, name: row.title, status: row.status as TaskStatus,
          priority: row.priority as Priority | undefined,
          description: row.description || undefined, dueDate: row.due_date || undefined,
          scheduledDate: row.scheduled_date || undefined, assignee: row.assignee || undefined,
          section: row.section_id, projectId: row.project_id, parentTaskId: row.parent_task_id,
          serviceTagId: row.service_tag_id || undefined, dayPeriod: row.day_period || 'morning',
          members: membersByTask[row.id] || [], position: row.position ?? 0,
          depth: row.depth ?? 1,
        };
        allSubsFlat[sub.id] = sub;
        if (!subtasksByParent[row.parent_task_id]) subtasksByParent[row.parent_task_id] = [];
        subtasksByParent[row.parent_task_id].push(sub);
      }

      // Recursively build subtask tree bottom-up (supports up to 4 levels)
      const buildSubtaskTree = (parentId: string): Subtask[] => {
        const children = subtasksByParent[parentId] || [];
        return children
          .map(sub => ({ ...sub, subtasks: buildSubtaskTree(sub.id) }))
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      };

      // Build nested tree for each top-level parent
      const nestedSubtasksByParent: Record<string, Subtask[]> = {};
      for (const parentId of Object.keys(subtasksByParent)) {
        // Only process direct children of top-level tasks (not sub-sub-tasks)
        if (!allSubsFlat[parentId]) {
          nestedSubtasksByParent[parentId] = buildSubtaskTree(parentId);
        }
      }

      const dbComments: Comment[] = (commentsRes.data || []).map((c: any) => {
        const profile = profiles.find(p => p.id === c.user_id);
        return { id: c.id, taskId: c.task_id, author: profile?.fullName || 'Usuário', authorId: c.user_id, text: c.content, date: c.created_at };
      });
      setCommentsState(dbComments);

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const dbAttachments: Attachment[] = (attachmentsRes.data || []).map((a: any) => ({
        id: a.id, taskId: a.task_id, userId: a.user_id, fileName: a.file_name,
        filePath: a.file_path, fileSize: a.file_size, contentType: a.content_type,
        createdAt: a.created_at,
        url: `${SUPABASE_URL}/storage/v1/object/public/task-attachments/${a.file_path}`,
      }));
      setAttachmentsState(dbAttachments);

      if (projectsRes.data) setProjectsState(projectsRes.data.map(mapDbProject));
      if (sectionsRes.data) {
        const allSections = sectionsRes.data.map(mapDbSection);
        setSectionsState(allSections);

        // Ensure fixed sections for projects that don't have them yet
        if (projectsRes.data && wsId) {
          const projectsWithFixed = new Set(
            allSections.filter(s => s.isFixed).map(s => s.projectId)
          );
          const projectsMissingFixed = projectsRes.data.filter(p => !projectsWithFixed.has(p.id));
          for (const proj of projectsMissingFixed) {
            try {
              const { ensureFixedSections } = await import('@/utils/ensureFixedSections');
              const fixedSections = await ensureFixedSections(proj.id, wsId);
              const mapped = fixedSections.map(s => mapDbSection(s));
              setSectionsState(prev => {
                const newOnes = mapped.filter(s => !prev.some(x => x.id === s.id));
                return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
              });
            } catch (err) {
              console.error('Error ensuring fixed sections for project', proj.id, err);
            }
          }
        }
      }
      if (tasksRes.data) {
        setTasksState(tasksRes.data.map((row: any) => ({
          ...mapDbTask(row), members: membersByTask[row.id] || [], subtasks: nestedSubtasksByParent[row.id] || [],
        })));
      }
      setLoading(false);
    };

    fetchAll();

    // ── Realtime Subscriptions ──
    const channel = supabase
      .channel('all-realtime')
      // Projects
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
      // Sections
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
      // Tasks
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
        const row = payload.new as any;
        if (row.parent_task_id) {
          const sub: Subtask = {
            id: row.id, name: row.title, status: row.status as TaskStatus,
            priority: row.priority as Priority | undefined,
            description: row.description || undefined, dueDate: row.due_date || undefined,
            scheduledDate: row.scheduled_date || undefined, section: row.section_id,
            projectId: row.project_id, parentTaskId: row.parent_task_id,
          };
          setTasksState(prev => prev.map(t => {
            if (t.id === row.parent_task_id) {
              const exists = (t.subtasks || []).some(s => s.id === sub.id);
              if (exists) return t;
              return { ...t, subtasks: [...(t.subtasks || []), sub] };
            }
            return {
              ...t, subtasks: (t.subtasks || []).map(s => {
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
        const old = payload.old as any;
        const parentChanged = row.parent_task_id !== old.parent_task_id;

        if (row.parent_task_id) {
          setTasksState(prev => {
            let updated = prev;

            // If parent changed, relocate: remove from old location, add to new parent
            if (parentChanged) {
              // Remove from top-level
              updated = updated.filter(t => t.id !== row.id);
              // Remove from all subtask trees
              const removeFromSubs = (subs: Subtask[]): Subtask[] =>
                subs.filter(s => s.id !== row.id).map(s => ({ ...s, subtasks: removeFromSubs(s.subtasks || []) }));
              updated = updated.map(t => ({ ...t, subtasks: removeFromSubs(t.subtasks || []) }));

              // Build the new subtask entry
              const newSub: Subtask = {
                id: row.id, name: row.title, status: row.status as TaskStatus,
                priority: row.priority as Priority | undefined,
                position: row.position ?? 0,
                description: row.description || undefined, dueDate: row.due_date || undefined,
                scheduledDate: row.scheduled_date || undefined, dayPeriod: row.day_period || 'morning',
                depth: row.depth ?? 1, section: row.section_id, projectId: row.project_id,
                parentTaskId: row.parent_task_id, subtasks: [],
              };

              // Check if it's already in the target (optimistic update already placed it)
              let alreadyPlaced = false;
              const checkPlaced = (subs: Subtask[]): boolean => subs.some(s => s.id === row.id || checkPlaced(s.subtasks || []));
              for (const t of updated) {
                if (t.id === row.parent_task_id && checkPlaced(t.subtasks || [])) { alreadyPlaced = true; break; }
                if (checkPlaced(t.subtasks || [])) { alreadyPlaced = true; break; }
              }

              if (!alreadyPlaced) {
                // Add to new parent
                const addToParent = (subs: Subtask[]): Subtask[] =>
                  subs.map(s => s.id === row.parent_task_id
                    ? { ...s, subtasks: [...(s.subtasks || []), newSub] }
                    : { ...s, subtasks: addToParent(s.subtasks || []) });
                updated = updated.map(t => t.id === row.parent_task_id
                  ? { ...t, subtasks: [...(t.subtasks || []), newSub] }
                  : { ...t, subtasks: addToParent(t.subtasks || []) });
              }

              return updated;
            }

            // Same parent — just update properties in-place
            const updateSub = (s: Subtask): Subtask => s.id === row.id ? {
              ...s, name: row.title, status: row.status as TaskStatus,
              priority: row.priority as Priority | undefined,
              position: row.position ?? s.position,
              description: row.description || undefined, dueDate: row.due_date || undefined,
              scheduledDate: row.scheduled_date || undefined, dayPeriod: row.day_period || s.dayPeriod,
              depth: row.depth ?? s.depth,
              section: row.section_id ?? s.section,
              projectId: row.project_id ?? s.projectId,
              parentTaskId: row.parent_task_id ?? s.parentTaskId,
            } : { ...s, subtasks: (s.subtasks || []).map(updateSub) };
            return updated.map(t => ({ ...t, subtasks: (t.subtasks || []).map(updateSub) }));
          });
          return;
        }
        setTasksState(prev => prev.map(t => t.id === row.id ? {
          ...t, name: row.title, status: row.status, priority: row.priority,
          position: row.position ?? t.position, description: row.description || undefined,
          dueDate: row.due_date || undefined, scheduledDate: row.scheduled_date || undefined,
          assignee: row.assignee || undefined, dayPeriod: row.day_period || t.dayPeriod || 'morning',
          recurrenceType: row.recurrence_type || null, recurrenceConfig: row.recurrence_config || undefined,
          section: row.section_id, projectId: row.project_id, serviceTagId: row.service_tag_id || undefined,
          manuallyMoved: row.manually_moved ?? false, completedAt: row.completed_at || undefined,
        } : t));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
        const old = payload.old as any;
        setTasksState(prev => {
          const updated = prev.map(t => ({
            ...t, subtasks: (t.subtasks || []).filter(s => s.id !== old.id).map(s => ({
              ...s, subtasks: (s.subtasks || []).filter(ss => ss.id !== old.id),
            })),
          }));
          return updated.filter(t => t.id !== old.id);
        });
      })
      // Task Members
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_members' }, async (payload) => {
        const m = payload.new as any;
        const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', m.user_id).single();
        const member: TaskMember = { id: m.id, userId: m.user_id, fullName: profile?.full_name || null, avatarUrl: profile?.avatar_url || null };
        setTasksState(prev => {
          const task = prev.find(t => t.id === m.task_id) || prev.find(t => (t.subtasks || []).some(s => s.id === m.task_id));
          const subtask = task ? (task.subtasks || []).find(s => s.id === m.task_id) : null;
          const targetName = subtask ? subtask.name : task?.name;
          if (targetName) {
            const currentUserId = session?.user?.id;
            if (currentUserId && m.user_id !== currentUserId) {
              toast.info(`${profile?.full_name || 'Alguém'} foi adicionado à tarefa \\\"${targetName}\\\"`, { duration: 4000 });
            } else if (currentUserId && m.user_id === currentUserId) {
              toast.info(`Você foi adicionado à tarefa \\\"${targetName}\\\"`, { duration: 4000 });
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
                toast.info(`Você foi removido da tarefa \\\"${target.name || (target as any).name}\\\"`, { duration: 4000 });
              } else {
                toast.info(`${removedMember.fullName || 'Alguém'} foi removido da tarefa \\\"${target.name || (target as any).name}\\\"`, { duration: 4000 });
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
      // Comments
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
        const c = payload.new as any;
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', c.user_id).single();
        const comment: Comment = { id: c.id, taskId: c.task_id, author: profile?.full_name || 'Usuário', authorId: c.user_id, text: c.content, date: c.created_at };
        setCommentsState(prev => prev.some(x => x.id === c.id) ? prev : [...prev, comment]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload) => {
        setCommentsState(prev => prev.filter(c => c.id !== (payload.old as any).id));
      })
      // Attachments
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_attachments' }, (payload) => {
        const a = payload.new as any;
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const attachment: Attachment = {
          id: a.id, taskId: a.task_id, userId: a.user_id, fileName: a.file_name,
          filePath: a.file_path, fileSize: a.file_size, contentType: a.content_type,
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
  }, [session, sessionChecked]);

  // ── Legacy Setters (DnD compatibility) ──
  const setProjects = useCallback((fn: (prev: Project[]) => Project[]) => setProjectsState(prev => fn(prev)), []);
  const setSections = useCallback((fn: (prev: Section[]) => Section[]) => setSectionsState(prev => fn(prev)), []);
  const setTasks = useCallback((fn: (prev: Task[]) => Task[]) => setTasksState(prev => fn(prev)), []);

  // ── Public API ──
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
    // Workspace
    ...workspaceOps,
    // Projects
    ...projectOps,
    // Sections
    ...sectionOps,
    // Tasks
    ...taskOps,
    // Comments & Attachments
    addComment: commentAttachmentOps.addComment,
    deleteComment: commentAttachmentOps.deleteComment,
    uploadAttachment: commentAttachmentOps.uploadAttachment,
    deleteAttachment: commentAttachmentOps.deleteAttachment,
    // Service Tags
    ...serviceTagOps,
    // Data
    setProjects,
    setSections,
    setTasks,
    exportData,
    importData,
    // Plan
    planLimits,
    showUpgradeModal,
    setShowUpgradeModal,
  };
}
