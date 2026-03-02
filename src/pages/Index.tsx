import { useState, useMemo, useCallback, useEffect, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { useConfirmAction } from '@/components/ConfirmAction';
import { Subtask } from '@/types/task';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, pointerWithin, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Menu, Sun, CalendarDays, Settings, CalendarPlus } from 'lucide-react';
import { DeliveryTemplateModal } from '@/components/DeliveryTemplateModal';
import { GenerateMonthlyTasksButton } from '@/components/GenerateMonthlyTasksButton';
import { StatusCheckbox } from '@/components/StatusCheckbox';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { BottomNav } from '@/components/BottomNav';
import { TaskListHeader, FilterMode } from '@/components/TaskListHeader';
import { ColumnHeader } from '@/components/ColumnHeader';
import { TaskSection } from '@/components/TaskSection';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { ViewRouter } from '@/components/ViewRouter';
import { ProjectNotesView } from '@/components/ProjectNotesView';
import { QuickNoteModal } from '@/components/QuickNoteModal';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useTheme } from '@/hooks/useTheme';
import { useUndoStack } from '@/hooks/useUndoStack';
import { useSectionPreferences } from '@/hooks/useSectionPreferences';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, Project } from '@/types/task';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { ToastAction } from '@/components/ui/toast';
import { ensureEntradaSection } from '@/utils/ensureEntradaSection';
import { UpgradeModal } from '@/components/UpgradeModal';
import { GlobalSearch } from '@/components/GlobalSearch';
const MONTH_NAMES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function generateSectionTitle(projectName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const mm = String(month + 1).padStart(2, '0');
  const shortName = projectName.replace(/^\d+\s*/, '');
  return `${year} [${shortName}] - ${mm} - ${MONTH_NAMES[month]}`;
}

const Index = () => {
  const navigate = useNavigate();
  const { push: pushUndo } = useUndoStack();
  const {
    projects, sections: sectionList, tasks: taskList, profiles, comments, attachments, serviceTags,
    setProjects, setSections, setTasks,
    exportData, importData,
    loading, session,
    workspaces, activeWorkspaceId, workspaceMembers, switchWorkspace, inviteToWorkspace, createWorkspace, renameWorkspace, deleteWorkspace,
    acceptWorkspaceInvite, generateInviteLink, addProjectMember, removeProjectMember, getProjectMembers,
    createProject, renameProject, deleteProject: deleteProjectFn,
    changeProjectColor, reorderProjects,
    createSection: createSectionFn, renameSection: renameSectionFn, deleteSection: deleteSectionFn, deleteSectionFromDb,
    createTask, updateTask, batchUpdatePositions, deleteTask: deleteTaskFn, restoreTask: restoreTaskFn, duplicateTask, updateTaskStatus,
    addTaskMember, removeTaskMember,
    addComment, deleteComment,
    addSubtask, updateSubtask, deleteSubtask, reorderSubtasks, scheduleSubtask,
    duplicateProject,
    uploadAttachment, deleteAttachment,
    createServiceTag, renameServiceTag, changeServiceTagIcon, deleteServiceTag,
    planLimits, showUpgradeModal, setShowUpgradeModal, autoTagTask,
  } = useSupabaseData();

  const { preference, cycleTheme } = useTheme();
  const [confirmDialog, confirm] = useConfirmAction();
  const deleteSectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeProjectId, setActiveProjectId] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [creatingSectionId, setCreatingSectionId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [isTimelineActive, setIsTimelineActive] = useState(false);
  const [projectViewTab, setProjectViewTab] = useState<'tasks' | 'notes'>('tasks');
  const [isNotesView, setIsNotesView] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const { expandedSections, toggleSection, expandSection, isSectionExpanded } = useSectionPreferences(session?.user?.id);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [activeTaskDragId, setActiveTaskDragId] = useState<string | null>(null);
  const [overTaskDragId, setOverTaskDragId] = useState<string | null>(null);
  const [taskDropPosition, setTaskDropPosition] = useState<'top' | 'bottom' | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMyTasksView, setIsMyTasksView] = useState(false);
  const [isMyWeekView, setIsMyWeekView] = useState(false);
  const [isMyDayView, setIsMyDayView] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem('meufluxo-sidebar-width')) || 200);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('meufluxo-sidebar-collapsed') === 'true');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  // Per-project active month map
  const [projectMonths, setProjectMonths] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('meufluxo_project_months');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const defaultMonth = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1), []);

  const activeMonth = useMemo(() => {
    const stored = projectMonths[activeProjectId];
    if (stored) {
      const d = new Date(stored);
      if (!isNaN(d.getTime())) return d;
    }
    return defaultMonth;
  }, [activeProjectId, projectMonths, defaultMonth]);

  const setActiveMonth = useCallback((month: Date) => {
    setProjectMonths(prev => {
      const next = { ...prev, [activeProjectId]: month.toISOString() };
      localStorage.setItem('meufluxo_project_months', JSON.stringify(next));
      return next;
    });
  }, [activeProjectId]);

  const [fadingOutTaskId, setFadingOutTaskId] = useState<string | null>(null);

  // Check super_admin role
  useEffect(() => {
    if (!session) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'super_admin')
      .maybeSingle()
      .then(({ data }) => setIsSuperAdmin(!!data));
  }, [session]);
  const [detailWidth, setDetailWidth] = useState(() => Number(localStorage.getItem('meufluxo-detail-width')) || 580);
  const listRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ target: 'sidebar' | 'detail'; startX: number; startWidth: number } | null>(null);

  // Ctrl+Shift+N quick note shortcut + Cmd+K search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowQuickNote(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleResizeMouseDown = useCallback((target: 'sidebar' | 'detail', e: ReactMouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      target,
      startX: e.clientX,
      startWidth: target === 'sidebar' ? sidebarWidth : detailWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      if (resizingRef.current.target === 'sidebar') {
        setSidebarWidth(Math.max(120, Math.min(320, resizingRef.current.startWidth + delta)));
      } else {
        setDetailWidth(Math.max(360, Math.min(800, resizingRef.current.startWidth - delta)));
      }
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarWidth(w => { localStorage.setItem('meufluxo-sidebar-width', String(w)); return w; });
      setDetailWidth(w => { localStorage.setItem('meufluxo-detail-width', String(w)); return w; });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth, detailWidth]);

  // Auth guard
  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth', { replace: true });
    }
  }, [loading, session, navigate]);

  // Failsafe timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!session) navigate('/auth', { replace: true });
    }, 5000);
    return () => clearTimeout(timeout);
  }, [session, navigate]);

  // Set active project when projects load
  useEffect(() => {
    if (projects.length > 0 && !projects.find(p => p.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Month key for filtering — uses display_month column
  const activeMonthKey = useMemo(() => {
    const d = new Date(activeMonth);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, [activeMonth]);

  const projectSections = useMemo(
    () => {
      const all = sectionList.filter(s => s.projectId === activeProjectId);
      const monthFiltered = all.filter(s => !s.displayMonth || s.displayMonth === activeMonthKey);
      if (activeSectionId) return monthFiltered.filter(s => s.id === activeSectionId);
      return monthFiltered;
    },
    [activeProjectId, sectionList, activeSectionId, activeMonthKey]
  );

  const allProjectTasks = useMemo(
    () => taskList.filter(t => t.projectId === activeProjectId),
    [taskList, activeProjectId]
  );

  // Filter by display_month: the permanent month a task belongs to
  const isInMonth = useCallback((t: Task) => {
    if (!t.displayMonth) return true; // legacy tasks without display_month
    return t.displayMonth === activeMonthKey;
  }, [activeMonthKey]);

  const monthFilteredTasks = useMemo(
    () => allProjectTasks.filter(isInMonth),
    [allProjectTasks, isInMonth]
  );

  const pendingCount = monthFilteredTasks.filter(t => t.status !== 'done').length;

  const filterTasks = useCallback((tasks: Task[]) => {
    const monthFiltered = tasks.filter(isInMonth);
    if (filter === 'pending') return monthFiltered.filter(t => t.status !== 'done');
    if (filter === 'done') return monthFiltered.filter(t => t.status === 'done');
    return monthFiltered;
  }, [filter, isInMonth]);

  const visibleTaskIds = useMemo(() => {
    const ids: string[] = [];
    for (const section of projectSections) {
      if (expandedSections[section.id] === false) continue;
      const sectionTasks = filterTasks(taskList.filter(t => t.section === section.id && t.projectId === activeProjectId));
      ids.push(...sectionTasks.map(t => t.id));
    }
    return ids;
  }, [projectSections, taskList, activeProjectId, expandedSections, filterTasks]);

  // Find selected task - could be a top-level task or a subtask
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    // Check top-level tasks first
    const topLevel = taskList.find(t => t.id === selectedTaskId);
    if (topLevel) return topLevel;
    // Search in subtasks (level 1 and 2)
    for (const t of taskList) {
      if (t.subtasks) {
        for (const sub of t.subtasks) {
          if (sub.id === selectedTaskId) {
            return { ...sub } as Task;
          }
          // Level 2
          if (sub.subtasks) {
            const sub2 = sub.subtasks.find(s => s.id === selectedTaskId);
            if (sub2) {
              return { ...sub2 } as Task;
            }
          }
        }
      }
    }
    return null;
  }, [selectedTaskId, taskList]);

  // For subtask reorder on complete/uncomplete in project view
  const subtaskOriginalPositionsRef = useRef<Map<string, number>>(new Map());

  const handleStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
    // Find if it's a subtask
    let isSubtask = false;
    let parentTaskId: string | undefined;
    const prev = taskList.find(t => t.id === taskId);
    const prevStatus = prev?.status || 'pending';

    if (!prev) {
      for (const t of taskList) {
        if (t.subtasks) {
          const sub = t.subtasks.find(s => s.id === taskId);
          if (sub) {
            isSubtask = true;
            parentTaskId = t.id;
            break;
          }
        }
      }
    }

    // ONLY flip the status. No position changes. No dayPeriod changes.
    // Visual ordering (pending first, done last) is handled in the render layer.
    if (isSubtask && parentTaskId) {
      updateSubtask(taskId, { status: newStatus });
    } else {
      updateTaskStatus(taskId, newStatus);
    }

    pushUndo({
      label: 'Mudança de status',
      undo: () => {
        if (isSubtask && parentTaskId) {
          updateSubtask(taskId, { status: prevStatus });
        } else {
          updateTaskStatus(taskId, prevStatus);
        }
      },
    });
  }, [updateTaskStatus, updateSubtask, taskList, pushUndo]);

  const handleUpdateTask = useCallback((updated: Task) => {
    const prev = taskList.find(t => t.id === updated.id);
    updateTask(updated);
    if (prev) {
      // If name or section changed, re-evaluate service tag via AI
      if (prev.name !== updated.name || prev.section !== updated.section) {
        autoTagTask(updated.id, updated.name, updated.section);
      }
      pushUndo({
        label: 'Edição de tarefa',
        undo: () => updateTask(prev),
      });
    }
  }, [updateTask, taskList, pushUndo, autoTagTask]);

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setSelectedTaskId(null);
    setProjectViewTab('tasks');
    setFocusedTaskId(null);
    setMobileSidebarOpen(false);
  };


  const handleDeleteTask = useCallback((taskId: string) => {
    // Find task — could be top-level or a subtask nested inside a parent
    let task = taskList.find(t => t.id === taskId);
    if (!task) {
      for (const t of taskList) {
        const sub = (t.subtasks || []).find(s => s.id === taskId);
        if (sub) {
          task = {
            id: sub.id,
            name: sub.name,
            status: sub.status,
            priority: sub.priority,
            section: sub.section,
            projectId: sub.projectId,
            parentTaskId: sub.parentTaskId,
            dayPeriod: sub.dayPeriod as any,
            description: sub.description,
            dueDate: sub.dueDate,
            scheduledDate: sub.scheduledDate,
            assignee: sub.assignee,
            members: sub.members,
            serviceTagId: sub.serviceTagId,
          } as Task;
          break;
        }
      }
    }
    deleteTaskFn(taskId);
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    if (focusedTaskId === taskId) {
      const idx = visibleTaskIds.indexOf(taskId);
      const next = visibleTaskIds[idx + 1] || visibleTaskIds[idx - 1] || null;
      setFocusedTaskId(next);
    }
    if (task) {
      const snapshot = { ...task };
      const doRestore = async () => {
        await restoreTaskFn(snapshot);
        setActiveProjectId(snapshot.projectId);
        setIsMyDayView(false);
        setIsMyTasksView(false);
        setIsMyWeekView(false);
        setIsNotesView(false);
      };
      pushUndo({
        label: 'Excluir tarefa',
        undo: doRestore,
      });
      toast({
        title: 'Tarefa excluída',
        duration: 5000,
        action: <ToastAction altText="Desfazer" onClick={doRestore}>Desfazer</ToastAction>,
      });
    }
  }, [deleteTaskFn, restoreTaskFn, selectedTaskId, focusedTaskId, visibleTaskIds, taskList, pushUndo]);

  const handleDeleteSubtask = useCallback(async (parentTaskId: string, subtaskId: string) => {
    // Find subtask snapshot before deleting
    let subtaskSnapshot: any = null;
    for (const t of taskList) {
      if (t.id === parentTaskId) {
        subtaskSnapshot = (t.subtasks || []).find(s => s.id === subtaskId);
        break;
      }
    }
    deleteSubtask(parentTaskId, subtaskId);
    if (subtaskSnapshot) {
      const snapshot = { ...subtaskSnapshot };
      const doRestore = async () => {
        await restoreTaskFn({
          id: snapshot.id,
          name: snapshot.name,
          status: snapshot.status,
          priority: snapshot.priority,
          section: snapshot.section,
          projectId: snapshot.projectId,
          parentTaskId: snapshot.parentTaskId || parentTaskId,
          dayPeriod: snapshot.dayPeriod,
          description: snapshot.description,
          dueDate: snapshot.dueDate,
          scheduledDate: snapshot.scheduledDate,
          assignee: snapshot.assignee,
          members: snapshot.members,
          serviceTagId: snapshot.serviceTagId,
        } as Task);
      };
      pushUndo({ label: 'Excluir subtarefa', undo: doRestore });
      toast({
        title: 'Subtarefa excluída',
        duration: 5000,
        action: <ToastAction altText="Desfazer" onClick={doRestore}>Desfazer</ToastAction>,
      });
    }
  }, [taskList, deleteSubtask, restoreTaskFn, pushUndo]);

  const createTaskInSection = useCallback(async (sectionId: string, taskName?: string) => {
    const project = projects.find(p => p.id === activeProjectId);
    const shortName = project ? project.name.replace(/^\d+\s*/, '') : '';
    const name = taskName || `[${shortName}] Campanha - `;
    setCreatingSectionId(sectionId);
    try {
      const newId = await createTask({
        name,
        status: 'pending',
        section: sectionId,
        projectId: activeProjectId,
        displayMonth: activeMonthKey,
       });
      setFocusedTaskId(newId);
      expandSection(sectionId);

      // AI auto-tag: fire-and-forget (non-blocking)
      autoTagTask(newId, name, sectionId);

      pushUndo({
        label: 'Criar tarefa',
        undo: () => { deleteTaskFn(newId); },
      });
      toast({
        title: 'Tarefa criada',
        duration: 5000,
        action: <ToastAction altText="Desfazer" onClick={() => deleteTaskFn(newId)}>Desfazer</ToastAction>,
      });
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
    } finally {
      setCreatingSectionId(null);
    }
  }, [activeProjectId, activeMonthKey, projects, createTask, deleteTaskFn, pushUndo, autoTagTask]);

  const createNewTask = useCallback(() => {
    let sectionId: string | undefined;
    if (focusedTaskId) {
      const t = taskList.find(t => t.id === focusedTaskId);
      if (t) sectionId = t.section;
    }
    if (!sectionId) sectionId = projectSections[projectSections.length - 1]?.id;
    if (!sectionId) return;
    createTaskInSection(sectionId);
  }, [focusedTaskId, taskList, projectSections, createTaskInSection]);

  const handleCreateProject = useCallback(async (name: string, color: string) => {
    try {
      const id = await createProject(name, color);
      setActiveProjectId(id);
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
    }
  }, [createProject]);

  const handleRenameProject = useCallback((id: string, name: string) => {
    renameProject(id, name);
  }, [renameProject]);

  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProjectFn(id);
    if (activeProjectId === id) {
      const remaining = projects.filter(p => p.id !== id);
      setActiveProjectId(remaining[0]?.id || '');
    }
  }, [deleteProjectFn, activeProjectId, projects]);

  const handleChangeColor = useCallback((id: string, color: string) => {
    changeProjectColor(id, color);
  }, [changeProjectColor]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  }, [navigate]);

  const handleReorderProjects = useCallback((reordered: Project[]) => {
    reorderProjects(reordered);
  }, [reorderProjects]);

  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const newSectionInputRef = useRef<HTMLInputElement>(null);

  const handleCreateSection = useCallback(() => {
    setIsCreatingSection(true);
    setTimeout(() => newSectionInputRef.current?.focus(), 0);
  }, []);

  const confirmCreateSection = useCallback(async (name: string) => {
    setIsCreatingSection(false);
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const id = await createSectionFn(trimmed, activeProjectId, activeMonthKey);
      expandSection(id);
    } catch (err) {
      console.error('Erro ao criar seção:', err);
    }
  }, [activeProjectId, activeMonthKey, createSectionFn]);

  const handleRenameSection = useCallback((id: string, title: string) => {
    renameSectionFn(id, title);
  }, [renameSectionFn]);

  const handleDeleteSection = useCallback(async (id: string) => {
    const section = sectionList.find(s => s.id === id);
    if (!section) return;
    
    const sectionTasks = taskList.filter(t => t.section === id);
    const hasTasks = sectionTasks.length > 0;

    // If section has tasks, ask for confirmation first (neurodivergent-safe: non-punitive language)
    if (hasTasks) {
      const confirmed = await confirm(
        'Tem certeza?',
        'As tarefas desta seção também serão removidas.',
        'Excluir seção'
      );
      if (!confirmed) return;
    }

    // Snapshot for undo
    const snapshotSection = { ...section };
    const snapshotTasks = sectionTasks.map(t => ({ ...t }));

    // Optimistic UI removal
    setSections(prev => prev.filter(s => s.id !== id));
    setTasks(prev => prev.filter(t => t.section !== id));

    // Delayed real deletion with undo window (8s)
    let undone = false;

    // Clear any previous timer
    if (deleteSectionTimerRef.current) clearTimeout(deleteSectionTimerRef.current);

    const taskCount = sectionTasks.length;
    const description = taskCount > 0
      ? `"${section.title}" e ${taskCount} tarefa${taskCount > 1 ? 's' : ''} removida${taskCount > 1 ? 's' : ''}`
      : `Seção "${section.title}" removida`;

    sonnerToast(description, {
      duration: 8000,
      action: {
        label: 'Desfazer',
        onClick: () => {
          undone = true;
          if (deleteSectionTimerRef.current) clearTimeout(deleteSectionTimerRef.current);
          // Restore UI — insert back at original index
          setSections(prev => {
            const restored = [...prev];
            // Find the right position based on neighboring sections in the same project
            const projectSections = restored.filter(s => s.projectId === snapshotSection.projectId);
            const insertIdx = projectSections.length; // append at end
            restored.splice(restored.indexOf(projectSections[insertIdx - 1]) + 1 || restored.length, 0, snapshotSection);
            return restored.includes(snapshotSection) ? restored : [...prev, snapshotSection];
          });
          setTasks(prev => [...prev, ...snapshotTasks]);
          sonnerToast.dismiss();
        },
      },
    });

    deleteSectionTimerRef.current = setTimeout(async () => {
      if (undone) return;
      // Actually delete from database only (UI already updated)
      await deleteSectionFromDb(id);
    }, 8500);
  }, [sectionList, taskList, confirm, deleteSectionFromDb, setSections, setTasks]);

  const handleDuplicateProject = useCallback(async (id: string, mode: 'sections' | 'tasks' | 'both') => {
    const newId = await duplicateProject(id, mode);
    setActiveProjectId(newId);
    return newId;
  }, [duplicateProject]);

  // Move task (and subtasks) to another project via drag-drop to sidebar
  const handleMoveTaskToProject = useCallback(async (taskId: string, sourceProjectId: string, targetProjectId: string, taskName: string) => {
    if (sourceProjectId === targetProjectId) {
      sonnerToast.info('Tarefa já está neste cliente');
      return;
    }
    const targetProject = projects.find(p => p.id === targetProjectId);
    if (!targetProject) return;

    // Store previous state for undo — search top-level and nested subtasks
    let task = taskList.find(t => t.id === taskId);
    if (!task) {
      for (const t of taskList) {
        const sub = (t.subtasks || []).find(s => s.id === taskId);
        if (sub) {
          task = {
            id: sub.id, name: sub.name, status: sub.status,
            priority: sub.priority || 'low', description: sub.description,
            dueDate: sub.dueDate, scheduledDate: sub.scheduledDate,
            section: sub.section || t.section, projectId: sub.projectId || t.projectId,
            parentTaskId: sub.parentTaskId || t.id, members: sub.members,
            subtasks: sub.subtasks,
          };
          break;
        }
      }
    }
    const previousState = {
      project_id: sourceProjectId,
      section_id: task?.section || null,
      parent_task_id: task?.parentTaskId || null,
    };

    try {
      // Ensure "Entrada" section exists in target project
      const entradaSection = await ensureEntradaSection(targetProjectId, activeWorkspaceId || '');

      const updates: Record<string, unknown> = {
        project_id: targetProjectId,
        section_id: entradaSection.id,
        position: 0,
      };
      // If subtask, convert to independent task
      if (task?.parentTaskId) {
        updates.parent_task_id = null;
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;

      // Move all subtasks too
      await supabase.from('tasks').update({
        project_id: targetProjectId,
        section_id: entradaSection.id,
      }).eq('parent_task_id', taskId);

      // Fade-out animation
      setFadingOutTaskId(taskId);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Optimistically update local state
      setTasks(prev => {
        const isSubtask = task?.parentTaskId;
        if (isSubtask) {
          // Remove from parent's subtasks array and add as independent task
          const updated = prev.map(t => {
            if (t.id === task.parentTaskId) {
              return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== taskId) };
            }
            return t;
          });
          return [...updated, { ...task!, projectId: targetProjectId, section: entradaSection.id, parentTaskId: undefined }];
        }
        return prev.map(t => {
          if (t.id === taskId || t.parentTaskId === taskId) {
            return { ...t, projectId: targetProjectId, section: entradaSection.id, parentTaskId: t.id === taskId ? undefined : t.parentTaskId };
          }
          return t;
        });
      });
      setFadingOutTaskId(null);

      const message = task?.parentTaskId
        ? `Subtarefa convertida e movida para Entrada em ${targetProject.name}`
        : `Movido para Entrada em ${targetProject.name}`;

      sonnerToast.success(message, {
        duration: 5000,
        action: {
          label: 'Desfazer',
          onClick: async () => {
            try {
              await supabase.from('tasks').update(previousState).eq('id', taskId);
              if (!task?.parentTaskId) {
                await supabase.from('tasks').update({ project_id: sourceProjectId, section_id: previousState.section_id }).eq('parent_task_id', taskId);
              }
              setTasks(prev => {
                if (previousState.parent_task_id) {
                  // Re-insert as subtask: remove from top-level, add back to parent's subtasks
                  const withoutTask = prev.filter(t => t.id !== taskId);
                  return withoutTask.map(t => {
                    if (t.id === previousState.parent_task_id) {
                      const subtask = { ...task!, projectId: sourceProjectId, section: previousState.section_id || t.section, parentTaskId: previousState.parent_task_id || undefined };
                      return { ...t, subtasks: [...(t.subtasks || []), subtask] };
                    }
                    return t;
                  });
                }
                return prev.map(t => {
                  if (t.id === taskId) return { ...t, projectId: sourceProjectId, section: previousState.section_id || t.section, parentTaskId: previousState.parent_task_id || undefined };
                  if (t.parentTaskId === taskId) return { ...t, projectId: sourceProjectId, section: previousState.section_id || t.section };
                  return t;
                });
              });
              sonnerToast.success('Ação desfeita');
            } catch {
              sonnerToast.error('Erro ao desfazer');
            }
          },
        },
      });
    } catch (err) {
      console.error('Erro ao mover tarefa:', err);
      setFadingOutTaskId(null);
      sonnerToast.error('Erro ao mover tarefa');
    }
  }, [projects, taskList, sectionList, setTasks, activeWorkspaceId]);

  // Move task to a specific section (from sidebar section-level drop)
  const handleMoveTaskToSection = useCallback(async (taskId: string, sourceProjectId: string, targetProjectId: string, targetSectionId: string, taskName: string) => {
    // Search top-level first, then nested subtasks
    let task: Task | undefined = taskList.find(t => t.id === taskId);
    if (!task) {
      for (const parent of taskList) {
        const sub = (parent.subtasks || []).find(s => s.id === taskId);
        if (sub) {
          task = {
            id: sub.id, name: sub.name, status: sub.status,
            priority: sub.priority || 'low', description: sub.description,
            dueDate: sub.dueDate, scheduledDate: sub.scheduledDate,
            section: sub.section || parent.section, projectId: sub.projectId || parent.projectId,
            parentTaskId: sub.parentTaskId || parent.id, members: sub.members,
            subtasks: sub.subtasks,
          };
          break;
        }
      }
    }
    if (!task) return;
    if (task.section === targetSectionId && !task.parentTaskId) return;

    const targetSection = sectionList.find(s => s.id === targetSectionId);
    if (!targetSection) return;

    const previousState = {
      project_id: sourceProjectId,
      section_id: task.section || null,
      parent_task_id: task.parentTaskId || null,
    };

    try {
      const updates: Record<string, unknown> = {
        project_id: targetProjectId,
        section_id: targetSectionId,
        position: 0,
      };
      if (task?.parentTaskId) updates.parent_task_id = null;

      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;

      await supabase.from('tasks').update({ project_id: targetProjectId, section_id: targetSectionId }).eq('parent_task_id', taskId);

      setFadingOutTaskId(taskId);
      await new Promise(resolve => setTimeout(resolve, 150));

      setTasks(prev => {
        const isSubtask = task?.parentTaskId;
        if (isSubtask) {
          // Remove from parent's subtasks and add as independent task
          const updated = prev.map(t => {
            if (t.id === task.parentTaskId) {
              return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== taskId) };
            }
            return t;
          });
          return [...updated, { ...task!, projectId: targetProjectId, section: targetSectionId, parentTaskId: undefined }];
        }
        return prev.map(t => {
          if (t.id === taskId || t.parentTaskId === taskId) {
            return { ...t, projectId: targetProjectId, section: targetSectionId, parentTaskId: t.id === taskId ? undefined : t.parentTaskId };
          }
          return t;
        });
      });
      setFadingOutTaskId(null);

      // AI auto-tag based on new section context
      autoTagTask(taskId, taskName, targetSectionId);

      const message = task?.parentTaskId
        ? `Subtarefa convertida e movida para ${targetSection.title}`
        : `Movido para ${targetSection.title}`;

      sonnerToast.success(message, {
        duration: 5000,
        action: {
          label: 'Desfazer',
          onClick: async () => {
            try {
              await supabase.from('tasks').update(previousState).eq('id', taskId);
              if (!task?.parentTaskId) {
                await supabase.from('tasks').update({ project_id: sourceProjectId, section_id: previousState.section_id }).eq('parent_task_id', taskId);
              }
              setTasks(prev => {
                if (previousState.parent_task_id) {
                  const withoutTask = prev.filter(t => t.id !== taskId);
                  return withoutTask.map(t => {
                    if (t.id === previousState.parent_task_id) {
                      const subtask = { ...task!, projectId: sourceProjectId, section: previousState.section_id || t.section, parentTaskId: previousState.parent_task_id || undefined };
                      return { ...t, subtasks: [...(t.subtasks || []), subtask] };
                    }
                    return t;
                  });
                }
                return prev.map(t => {
                  if (t.id === taskId) return { ...t, projectId: sourceProjectId, section: previousState.section_id || t.section, parentTaskId: previousState.parent_task_id || undefined };
                  if (t.parentTaskId === taskId) return { ...t, projectId: sourceProjectId, section: previousState.section_id || t.section };
                  return t;
                });
              });
              sonnerToast.success('Ação desfeita');
            } catch {
              sonnerToast.error('Erro ao desfazer');
            }
          },
        },
      });
    } catch (err) {
      console.error('Erro ao mover tarefa:', err);
      setFadingOutTaskId(null);
      sonnerToast.error('Erro ao mover tarefa');
    }
  }, [taskList, sectionList, setTasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (selectedTaskId) { setSelectedTaskId(null); e.preventDefault(); }
        return;
      }
      if (isInput) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIdx = focusedTaskId ? visibleTaskIds.indexOf(focusedTaskId) : -1;
        let nextIdx: number;
        if (e.key === 'ArrowDown') nextIdx = currentIdx < visibleTaskIds.length - 1 ? currentIdx + 1 : 0;
        else nextIdx = currentIdx > 0 ? currentIdx - 1 : visibleTaskIds.length - 1;
        const nextId = visibleTaskIds[nextIdx];
        if (nextId) {
          setFocusedTaskId(nextId);
          setTimeout(() => {
            document.querySelector(`[data-task-id="${nextId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }, 0);
        }
        return;
      }

      if (e.key === 'Enter' && focusedTaskId) { e.preventDefault(); setSelectedTaskId(focusedTaskId); return; }

      if (e.key === ' ' && focusedTaskId) {
        e.preventDefault();
        const task = taskList.find(t => t.id === focusedTaskId);
        if (task) {
          const next: TaskStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending';
          handleStatusChange(focusedTaskId, next);
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && focusedTaskId) {
        e.preventDefault();
        handleDeleteTask(focusedTaskId);
        return;
      }

      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); createNewTask(); return; }

      if ((e.key === 's' || e.key === 'S') && focusedTaskId) {
        e.preventDefault();
        const task = taskList.find(t => t.id === focusedTaskId);
        if (task) toggleSection(task.section);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusedTaskId, visibleTaskIds, selectedTaskId, taskList, handleStatusChange, handleDeleteTask, createNewTask, toggleSection]);

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Custom collision detection: use pointerWithin first (better for cross-section), fall back to closestCenter
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const activeData = args.active.data.current;
    // For section dragging, use simple closestCenter to find other sections
    if (activeData?.type === 'section') {
      return closestCenter(args);
    }
    // For tasks: use pointerWithin first (better for cross-section), fall back to closestCenter
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      const preferred = pointerCollisions.filter(c => {
        const data = c.data?.droppableContainer?.data?.current;
        return data?.type === 'section-drop' || data?.type === 'task' || data?.type === 'section-end';
      });
      if (preferred.length > 0) return preferred;
      return pointerCollisions;
    }
    return closestCenter(args);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'task') {
      setActiveTaskDragId(event.active.id as string);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDragOverSectionId(null);
      setOverTaskDragId(null);
      setTaskDropPosition(null);
      return;
    }
    if (over.data.current?.type === 'section-drop' || over.data.current?.type === 'section-end') {
      setDragOverSectionId(over.data.current.sectionId);
      setOverTaskDragId(null);
      setTaskDropPosition(null);
    } else if (over.data.current?.type === 'task' && active.data.current?.type === 'task' && active.id !== over.id) {
      setDragOverSectionId(null);
      // Determine position based on index comparison
      const activeTask = active.data.current.task as Task;
      const overTask = over.data.current.task as Task;
      const allTasks = taskList.filter(t => t.projectId === activeProjectId);
      const activeIdx = allTasks.findIndex(t => t.id === activeTask.id);
      const overIdx = allTasks.findIndex(t => t.id === overTask.id);
      setOverTaskDragId(over.id as string);
      setTaskDropPosition(activeIdx < overIdx ? 'bottom' : 'top');
    } else {
      setDragOverSectionId(null);
      setOverTaskDragId(null);
      setTaskDropPosition(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragOverSectionId(null);
    setActiveTaskDragId(null);
    setOverTaskDragId(null);
    setTaskDropPosition(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'section' && overData?.type === 'section') {
      const activeId = (active.id as string).replace('section-', '');
      const overId = (over.id as string).replace('section-', '');
      setSections(prev => {
        const projectSecs = prev.filter(s => s.projectId === activeProjectId);
        const otherSecs = prev.filter(s => s.projectId !== activeProjectId);
        const oldIdx = projectSecs.findIndex(s => s.id === activeId);
        const newIdx = projectSecs.findIndex(s => s.id === overId);
        if (oldIdx === -1 || newIdx === -1) return prev;
        const reordered = arrayMove(projectSecs, oldIdx, newIdx);
        // Persist new positions to database
        reordered.forEach((s, i) => {
          supabase.from('sections').update({ position: i }).eq('id', s.id)
            .then(({ error }) => { if (error) console.error('Erro ao reordenar seção:', error); });
        });
        return [...otherSecs, ...reordered];
      });
      return;
    }

    if (activeData?.type === 'task') {
      const activeTask = activeData.task as Task;
      let targetSectionId = activeTask.section;
      if (overData?.type === 'section-drop' || overData?.type === 'section-end') targetSectionId = overData.sectionId;
      else if (overData?.type === 'task') targetSectionId = (overData.task as Task).section;

      setTasks(prev => {
        const sectionTasks = prev.filter(t => t.section === targetSectionId && t.projectId === activeProjectId);
        const otherTasks = prev.filter(t => !(t.section === targetSectionId && t.projectId === activeProjectId) && t.id !== activeTask.id);
        const filteredSection = sectionTasks.filter(t => t.id !== activeTask.id);
        const overTaskId = overData?.type === 'task' ? (overData.task as Task).id : null;
        let newIdx = filteredSection.length;
        if (overTaskId) {
          const idx = filteredSection.findIndex(t => t.id === overTaskId);
          if (idx !== -1) {
            // If dropping below the target task, insert after it
            newIdx = taskDropPosition === 'bottom' ? idx + 1 : idx;
          }
        }
        const movedTask = { ...activeTask, section: targetSectionId };
        filteredSection.splice(newIdx, 0, movedTask);
        const cleanOther = otherTasks.filter(t => t.id !== activeTask.id);
        // Persist new positions to database
        filteredSection.forEach((t, i) => {
          const updates: Record<string, unknown> = { position: i };
          if (t.id === activeTask.id && targetSectionId !== activeTask.section) {
            updates.section_id = targetSectionId;
          }
          supabase.from('tasks').update(updates).eq('id', t.id)
            .then(({ error }) => { if (error) console.error('Erro ao reordenar tarefa:', error); });
        });
        return [...cleanOther, ...filteredSection];
      });
    }
  };

  // Redirect to auth if no session — with timeout failsafe
  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth', { replace: true });
    }
  }, [loading, session, navigate]);

  // Failsafe: if loading takes more than 5 seconds, redirect to auth
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!session) {
        console.warn('Loading timeout — redirecting to /auth');
        navigate('/auth', { replace: true });
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [session, navigate]);

  if (loading || !session) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'hsl(var(--bg-app))' }}>
        <p className="text-nd-text-secondary animate-pulse">Carregando...</p>
      </div>
    );
  }

  const panelOpen = selectedTask !== null;
  const sectionIds = projectSections.map(s => `section-${s.id}`);
  const sidebarProps = {
    projects,
    sections: sectionList,
    projectMonths,
    activeProjectId,
    activeSectionId,
    onSelectProject: (id: string) => { setActiveSectionId(null); setIsTimelineActive(false); setIsNotesView(false); setIsMyTasksView(false); setIsMyWeekView(false); setIsMyDayView(false); handleSelectProject(id); },
    onSelectSection: (sectionId: string) => {
      const section = sectionList.find(s => s.id === sectionId);
      if (section) {
        setIsMyTasksView(false); setIsMyWeekView(false); setIsMyDayView(false);
        handleSelectProject(section.projectId);
        setActiveSectionId(sectionId);
      }
    },
    onCreateProject: handleCreateProject,
    onRenameProject: handleRenameProject,
    onDeleteProject: handleDeleteProject,
    onChangeColor: handleChangeColor,
    onReorderProjects: handleReorderProjects,
    onDuplicateProject: handleDuplicateProject,
    onExport: exportData,
    onImport: importData,
    onLogout: handleLogout,
    isMyDayView,
    onToggleMyDay: () => { setActiveSectionId(null); setIsTimelineActive(false); setIsNotesView(false); setIsMyDayView(true); setIsMyTasksView(false); setIsMyWeekView(false); },
    isMyTasksView,
    onToggleMyTasks: () => { setActiveSectionId(null); setIsTimelineActive(false); setIsNotesView(false); setIsMyTasksView(prev => !prev); setIsMyWeekView(false); setIsMyDayView(false); },
    isMyWeekView,
    onToggleMyWeek: () => { setActiveSectionId(null); setIsNotesView(false); setIsMyWeekView(true); setIsMyTasksView(false); setIsMyDayView(false); },
    isNotesView,
    onToggleNotes: () => { setActiveSectionId(null); setIsTimelineActive(false); setIsNotesView(true); setIsMyDayView(false); setIsMyTasksView(false); setIsMyWeekView(false); },
    tasks: taskList,
    workspaces,
    activeWorkspaceId,
    workspaceMembers,
    onSwitchWorkspace: switchWorkspace,
    onInviteToWorkspace: inviteToWorkspace,
    onCreateWorkspace: createWorkspace,
    onRenameWorkspace: renameWorkspace,
    onDeleteWorkspace: deleteWorkspace,
    onAcceptInvite: acceptWorkspaceInvite,
    onGenerateInviteLink: generateInviteLink,
    onAddProjectMember: addProjectMember,
    onRemoveProjectMember: removeProjectMember,
    getProjectMembers,
    isSuperAdmin,
    serviceTags,
    onCreateServiceTag: createServiceTag,
    onRenameServiceTag: renameServiceTag,
    onChangeServiceTagIcon: changeServiceTagIcon,
    onDeleteServiceTag: deleteServiceTag,
    onCycleTheme: cycleTheme,
    themePreference: preference,
    onRenameSection: handleRenameSection,
    onDeleteSection: handleDeleteSection,
    onMoveTaskToProject: handleMoveTaskToProject,
    onMoveTaskToSection: handleMoveTaskToSection,
    isPro: planLimits.isPro,
    collapsed: sidebarCollapsed,
    onToggleCollapse: () => setSidebarCollapsed(prev => { const next = !prev; localStorage.setItem('meufluxo-sidebar-collapsed', String(next)); return next; }),
    onOpenSearch: () => setShowGlobalSearch(true),
  };

  // Determine active view for bottom nav
  const activeBottomView = isMyDayView ? 'day' as const : isMyWeekView ? 'week' as const : isMyTasksView ? 'tasks' as const : 'project' as const;

  const handleBottomNav = (view: 'day' | 'tasks' | 'week' | 'project') => {
    setIsMyDayView(view === 'day');
    setIsMyTasksView(view === 'tasks');
    setIsMyWeekView(view === 'week');
    if (view === 'project') {
      setIsMyDayView(false);
      setIsMyTasksView(false);
      setIsMyWeekView(false);
      setMobileSidebarOpen(true);
    }
  };

  if (!activeProject && !isMyDayView && !isMyWeekView && !isMyTasksView && !isNotesView) {
    return (
      <div className="h-screen flex" style={{ background: 'var(--bg-base)' }}>
        <div className="hidden lg:block"><ProjectSidebar {...sidebarProps} /></div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-nd-text-secondary">Crie um projeto para começar.</p>
        </div>
        <BottomNav activeView="project" onNavigate={handleBottomNav} />
      </div>
    );
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* Desktop sidebar — collapses to mini mode during timeline */}
      {isMyWeekView && isTimelineActive ? (
         <div className="hidden lg:flex flex-shrink-0 flex-col h-screen" style={{ width: 48, background: 'var(--bg-sidebar)', transition: 'width 250ms ease-out' }}>
          <div className="flex flex-col items-center gap-1 pt-3 px-1">
            {/* Meu Dia */}
            <button
              onClick={sidebarProps.onToggleMyDay}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              title="Meu Dia"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Sun className="w-4 h-4" />
            </button>
            {/* Minha Semana */}
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg"
              title="Minha Semana"
              style={{ color: 'var(--text-primary)', background: 'var(--bg-active)' }}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
          <div className="mx-2 my-2" style={{ height: 1, background: 'var(--border-input)' }} />
          {/* Project dots */}
          <div className="flex flex-col items-center gap-1.5 px-1 flex-1 overflow-y-auto">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => { sidebarProps.onSelectProject(p.id); }}
                title={p.name}
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="hidden lg:block flex-shrink-0" style={{ width: sidebarCollapsed ? 48 : 260, minWidth: sidebarCollapsed ? 48 : 260, maxWidth: sidebarCollapsed ? 48 : 260, transition: 'width 200ms ease-out, min-width 200ms ease-out, max-width 200ms ease-out' }}>
          <ProjectSidebar {...sidebarProps} />
        </div>
      )}

      {/* Tablet sidebar (collapsible overlay 768-1024px) + Mobile sidebar (overlay <768px) */}
      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 z-[90] lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[100] lg:hidden animate-slide-in-left" style={{ width: 240 }}>
            <ProjectSidebar {...sidebarProps} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-none pb-14 md:pb-0" style={{ background: 'var(--bg-base)' }}>
        {/* Tablet hamburger (768-1024px) */}
        <div className="hidden md:flex lg:hidden items-center h-12 px-3 border-b border-nd-border" style={{ background: 'hsl(var(--bg-app))' }}>
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="w-11 h-11 flex items-center justify-center rounded-md text-nd-text-secondary hover:text-nd-text"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-2 text-[16px] font-bold text-nd-text">MeuFluxo</span>
        </div>

        {(isMyDayView || isMyWeekView || isMyTasksView || isNotesView) ? (
          <ViewRouter
            activeView={isMyDayView ? 'day' : isMyWeekView ? 'week' : isMyTasksView ? 'tasks' : 'notes'}
            tasks={taskList}
            projects={projects}
            sections={sectionList}
            profiles={profiles}
            serviceTags={serviceTags}
            activeWorkspaceId={activeWorkspaceId}
            session={session}
            selectedTaskId={selectedTaskId || undefined}
            isPro={planLimits.isPro}
            onStatusChange={handleStatusChange}
            onSelectTask={(task) => { setSelectedTaskId(task.id); setFocusedTaskId(task.id); }}
            onUpdateTask={handleUpdateTask}
            onBatchUpdatePositions={batchUpdatePositions}
            onScheduleSubtask={scheduleSubtask}
            onUpgrade={() => setShowUpgradeModal(true)}
            onNavigateToWeek={() => { setIsMyWeekView(true); setIsMyDayView(false); setIsMyTasksView(false); }}
            onViewModeChange={(mode) => setIsTimelineActive(mode === 'timeline')}
          />
        ) : activeProject ? (
          <>
            {/* Tabs: Tarefas / Notas */}
             <div style={{ padding: '32px 32px 0 32px' }}>
              <TaskListHeader
                projectName={activeProject.name}
                pendingCount={pendingCount}
                onNewTask={createNewTask}
                filter={filter}
                onFilterChange={setFilter}
                activeMonth={activeMonth}
                onMonthChange={setActiveMonth}
              />
            </div>
            <div style={{ height: 24 }} />
            <div className="flex items-center" style={{ padding: '0 32px', borderBottom: '1px solid var(--border-subtle)', gap: 16 }}>
              <button
                onClick={() => setProjectViewTab('tasks')}
                className="relative"
                style={{
                  height: 40,
                  fontSize: 14,
                  fontWeight: 500,
                  color: projectViewTab === 'tasks' ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                  transition: 'color 150ms ease-out',
                }}
                onMouseEnter={e => { if (projectViewTab !== 'tasks') e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { if (projectViewTab !== 'tasks') e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              >
                Tarefas
                {projectViewTab === 'tasks' && <div className="absolute bottom-0 left-0 right-0" style={{ height: 2, background: 'var(--accent-blue)' }} />}
              </button>
              <button
                onClick={() => setProjectViewTab('notes')}
                className="relative"
                style={{
                  height: 40,
                  fontSize: 14,
                  fontWeight: 500,
                  color: projectViewTab === 'notes' ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                  transition: 'color 150ms ease-out',
                }}
                onMouseEnter={e => { if (projectViewTab !== 'notes') e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { if (projectViewTab !== 'notes') e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              >
                Notas
                {projectViewTab === 'notes' && <div className="absolute bottom-0 left-0 right-0" style={{ height: 2, background: 'var(--accent-blue)' }} />}
              </button>
              {/* Spacer + actions */}
              <div className="flex-1" />
              <GenerateMonthlyTasksButton
                projectId={activeProjectId}
                workspaceId={activeWorkspaceId || ''}
                activeMonth={activeMonth}
                onTasksGenerated={async () => {
                  // Refresh sections and tasks from DB
                  const { data: secData } = await supabase
                    .from('sections')
                    .select('*')
                    .eq('project_id', activeProjectId)
                    .order('position');
                  if (secData) {
                    const newSecs = secData.map((s: any) => ({
                      id: s.id, title: s.name, projectId: s.project_id, workspaceId: s.workspace_id
                    }));
                    setSections(prev => {
                      const others = prev.filter(s => s.projectId !== activeProjectId);
                      return [...others, ...newSecs];
                    });
                  }
                  const { data: taskData } = await supabase
                    .from('tasks')
                    .select('*, task_members(*)')
                    .eq('project_id', activeProjectId)
                    .is('parent_task_id', null)
                    .order('position');
                  if (taskData) {
                    const newTasks = taskData.map((row: any) => ({
                      id: row.id,
                      name: row.title,
                      status: row.status as any,
                      priority: row.priority,
                      section: row.section_id,
                      projectId: row.project_id,
                      workspaceId: row.workspace_id,
                      dueDate: row.due_date || undefined,
                      scheduledDate: row.scheduled_date || undefined,
                      description: row.description || '',
                      assignee: row.assignee || undefined,
                      createdBy: row.created_by || undefined,
                      dayPeriod: (row.day_period as any) || 'morning',
                      recurrenceType: row.recurrence_type || undefined,
                      recurrenceConfig: row.recurrence_config || undefined,
                      serviceTagId: row.service_tag_id || undefined,
                      rolloverCount: row.rollover_count || 0,
                      originalDueDate: row.original_due_date || undefined,
                      position: row.position ?? 0,
                      subtasks: [],
                      members: (row.task_members || []).map((m: any) => ({
                        id: m.id, taskId: m.task_id, userId: m.user_id
                      })),
                    }));
                    setTasks(prev => {
                      const others = prev.filter(t => t.projectId !== activeProjectId);
                      return [...others, ...newTasks];
                    });
                  }
                }}
              />
              <button
                onClick={() => setShowTemplateModal(true)}
                className="flex items-center justify-center"
                style={{ width: 36, height: 36, borderRadius: 8, color: 'var(--text-tertiary)', transition: 'all 150ms ease-out' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
                title="Configurar template de entregas"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {projectViewTab === 'notes' ? (
              <ProjectNotesView
                projectId={activeProjectId}
                workspaceId={activeWorkspaceId}
                userId={session?.user?.id || ''}
                projects={projects}
                isPro={planLimits.isPro}
                onUpgrade={() => setShowUpgradeModal(true)}
              />
            ) : (
            <>
            <ColumnHeader />
        <div className="flex-1 overflow-y-auto sidebar-scroll section-list" style={{ padding: '16px 32px 32px 32px' }} ref={listRef}>
          <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              {projectSections.map(section => {
                const allSectionTasks = taskList.filter(t => t.section === section.id && t.projectId === activeProjectId);
                const filteredSectionTasks = filterTasks(allSectionTasks);
                return (
                  <TaskSection
                    key={section.id}
                    section={section}
                    tasks={filteredSectionTasks}
                    onSelectTask={(task) => { setSelectedTaskId(task.id); setFocusedTaskId(task.id); }}
                    selectedTaskId={selectedTaskId || undefined}
                    focusedTaskId={focusedTaskId || undefined}
                    onStatusChange={handleStatusChange}
                    onSubtaskStatusChange={(taskId, subtaskId, status) => {
                      const parentTask = taskList.find(t => t.id === taskId);
                      const prevSubtask = parentTask?.subtasks?.find(s => s.id === subtaskId);
                      const prevStatus = prevSubtask?.status || 'pending';

                      // Save original order index before moving to end
                      if (status === 'done' && parentTask?.subtasks) {
                        const idx = parentTask.subtasks.findIndex(s => s.id === subtaskId);
                        if (idx !== -1) subtaskOriginalPositionsRef.current.set(subtaskId, idx);
                      }

                      updateSubtask(subtaskId, { status }).then(() => {
                        if (parentTask?.subtasks) {
                          if (status === 'done') {
                            // Move completed subtask to end
                            const updated = parentTask.subtasks.map(s =>
                              s.id === subtaskId ? { ...s, status } : s
                            );
                            const pending = updated.filter(s => s.status !== 'done');
                            const done = updated.filter(s => s.status === 'done');
                            const reordered = [...pending, ...done];
                            reorderSubtasks(taskId, reordered.map(s => s.id));
                          } else if (prevStatus === 'done') {
                            // Restore original position
                            const originalIdx = subtaskOriginalPositionsRef.current.get(subtaskId);
                            if (originalIdx !== undefined) {
                              const current = parentTask.subtasks
                                .map(s => s.id === subtaskId ? { ...s, status } : s)
                                .filter(s => s.id !== subtaskId);
                              const restored = [...current];
                              const clampedIdx = Math.min(originalIdx, restored.length);
                              restored.splice(clampedIdx, 0, { ...prevSubtask!, status });
                              reorderSubtasks(taskId, restored.map(s => s.id));
                              subtaskOriginalPositionsRef.current.delete(subtaskId);
                            } else {
                              // No saved position — move to top of pending
                              const updated = parentTask.subtasks.map(s =>
                                s.id === subtaskId ? { ...s, status } : s
                              );
                              const pending = updated.filter(s => s.status !== 'done');
                              const done = updated.filter(s => s.status === 'done');
                              reorderSubtasks(taskId, [...pending, ...done].map(s => s.id));
                            }
                          }
                        }
                      });
                    }}
                    isExpanded={isSectionExpanded(section.id)}
                    onToggleExpand={() => toggleSection(section.id)}
                    isDropTarget={dragOverSectionId === section.id}
                    onRenameSection={handleRenameSection}
                    onDeleteSection={handleDeleteSection}
                    onAddTaskInSection={createTaskInSection}
                    isCreatingTask={creatingSectionId === section.id}
                    onSelectSubtask={(sub) => { setSelectedTaskId(sub.id); }}
                    onDeleteTask={handleDeleteTask}
                    onDuplicateTask={(taskId) => {
                      duplicateTask(taskId).then((newId) => {
                        toast({
                          title: 'Tarefa duplicada',
                          duration: 5000,
                          action: <ToastAction altText="Desfazer" onClick={() => deleteTaskFn(newId)}>Desfazer</ToastAction>,
                        });
                      });
                    }}
                    onReorderSubtasks={(taskId, subtaskIds) => { reorderSubtasks(taskId, subtaskIds); }}
                    onRenameTask={(taskId, name) => {
                      const t = taskList.find(t => t.id === taskId);
                      if (t) {
                        updateTask({ ...t, name });
                        autoTagTask(taskId, name, t.section);
                      }
                    }}
                    onRenameSubtask={(subtaskId, name) => {
                      updateSubtask(subtaskId, { name });
                      for (const t of taskList) {
                        const sub = (t.subtasks || []).find(s => s.id === subtaskId);
                        if (sub) { autoTagTask(subtaskId, name, sub.section); break; }
                      }
                    }}
                    activeTaskId={activeTaskDragId}
                    overTaskId={overTaskDragId}
                    taskDropPosition={taskDropPosition}
                    allSections={projectSections}
                    projectColor={activeProject?.color}
                    onMoveToSection={(taskId, sectionId) => {
                      // Search top-level first, then nested subtasks
                      let t: Task | Subtask | undefined = taskList.find(t => t.id === taskId);
                      if (!t) {
                        for (const parent of taskList) {
                          const found = (parent.subtasks || []).find(s => s.id === taskId);
                          if (found) { t = found; break; }
                        }
                      }
                      if (!t) return;
                      const originalSection = t.section;
                      const originalParentId = t.parentTaskId;
                      const originalServiceTagId = (t as Task).serviceTagId;
                      const targetSectionObj = sectionList.find(s => s.id === sectionId);
                      // When moving a subtask to a section, promote it to independent task
                      updateTask({ ...t, section: sectionId, parentTaskId: undefined } as Task);

                      // AI auto-tag based on new section context
                      autoTagTask(taskId, t.name, sectionId);

                      toast({
                        title: `Movida para ${targetSectionObj?.title || 'seção'}`,
                        duration: 5000,
                        action: <ToastAction altText="Desfazer" onClick={() => updateTask({ ...t!, section: originalSection, parentTaskId: originalParentId, serviceTagId: originalServiceTagId } as Task)}>Desfazer</ToastAction>,
                      });
                    }}
                    onMoveToMonth={async (taskId, year, month) => {
                      const t = taskList.find(t => t.id === taskId);
                      if (!t) return;
                      const originalDisplayMonth = t.displayMonth;
                      const newMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                      updateTask({ ...t, displayMonth: newMonth });
                      // Also update the section's display_month so it stays visible in the new month
                      const sectionId = t.section;
                      if (sectionId) {
                        try {
                          await supabase.from('sections').update({ display_month: newMonth }).eq('id', sectionId);
                          setSections(prev => prev.map(s => s.id === sectionId ? { ...s, displayMonth: newMonth } : s));
                        } catch (e) { console.error('Failed to update section month', e); }
                      }
                      toast({
                        title: `Movida para ${monthNames[month]} ${year}`,
                        duration: 5000,
                        action: <ToastAction altText="Desfazer" onClick={async () => {
                          updateTask({ ...t, displayMonth: originalDisplayMonth });
                          if (sectionId) {
                            await supabase.from('sections').update({ display_month: originalDisplayMonth }).eq('id', sectionId);
                            setSections(prev => prev.map(s => s.id === sectionId ? { ...s, displayMonth: originalDisplayMonth } : s));
                          }
                        }}>Desfazer</ToastAction>,
                      });
                    }}
                    onAddSubtask={async (parentTaskId, name) => {
                      await addSubtask(parentTaskId, name);
                      // Find the parent task to get section for auto-tag
                      const parent = taskList.find(t => t.id === parentTaskId)
                        || taskList.flatMap(t => t.subtasks || []).find(s => s.id === parentTaskId);
                      if (parent) {
                        // Find the newly created subtask
                        // We need to get it from DB since state may not have updated yet
                        const { data: newSub } = await supabase.from('tasks').select('id, section_id').eq('parent_task_id', parentTaskId).order('created_at', { ascending: false }).limit(1).single();
                        if (newSub) autoTagTask(newSub.id, name, newSub.section_id);
                      }
                    }}
                    onDeleteSubtask={(parentTaskId, subtaskId) => {
                      handleDeleteSubtask(parentTaskId, subtaskId);
                    }}
                    onConvertSubtaskToTask={(subtaskId) => {
                      // Search top-level first, then nested subtasks
                      let sub: Task | Subtask | undefined = taskList.find(t => t.id === subtaskId);
                      if (!sub) {
                        for (const t of taskList) {
                          const found = (t.subtasks || []).find(s => s.id === subtaskId);
                          if (found) { sub = found; break; }
                        }
                      }
                      if (!sub) return;
                      const originalParentId = sub.parentTaskId;
                      const originalSection = sub.section;
                      updateTask({ ...sub, parentTaskId: undefined, section: sub.section } as Task);
                      toast({
                        title: 'Convertida em tarefa independente',
                        duration: 5000,
                        action: <ToastAction altText="Desfazer" onClick={() => {
                          if (originalParentId) updateTask({ ...sub!, parentTaskId: originalParentId, section: originalSection } as Task);
                        }}>Desfazer</ToastAction>,
                      });
                    }}
                    onNestAsSubtask={async (draggedTaskId, targetTaskId) => {
                      // Prevent nesting a task into itself
                      if (draggedTaskId === targetTaskId) return;
                      // Find the dragged task/subtask
                      let dragged: Task | Subtask | undefined = taskList.find(t => t.id === draggedTaskId);
                      let draggedParentId: string | undefined;
                      if (!dragged) {
                        for (const parent of taskList) {
                          const sub = (parent.subtasks || []).find(s => s.id === draggedTaskId);
                          if (sub) {
                            dragged = sub;
                            draggedParentId = parent.id;
                            break;
                          }
                        }
                      }
                      if (!dragged) return;

                      // Prevent nesting target task into its own subtask
                      const targetTask = taskList.find(t => t.id === targetTaskId);
                      if (targetTask?.parentTaskId === draggedTaskId) return;

                      const originalParentId = dragged.parentTaskId;
                      const originalSection = dragged.section;

                      // Update in DB: set parent_task_id, match section/project of target
                      const target = taskList.find(t => t.id === targetTaskId);
                      if (!target) return;

                      try {
                        await supabase.from('tasks').update({
                          parent_task_id: targetTaskId,
                          section_id: target.section,
                          project_id: target.projectId,
                        }).eq('id', draggedTaskId);

                        setTasks(prev => {
                          let updated = prev;
                          // Remove from old parent's subtasks if it was a subtask
                          if (originalParentId) {
                            updated = updated.map(t =>
                              t.id === originalParentId
                                ? { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== draggedTaskId) }
                                : t
                            );
                          }
                          // Remove from top-level if it was a top-level task
                          updated = updated.filter(t => t.id !== draggedTaskId);
                          // Add as subtask of target
                          const newSub: Subtask = {
                            id: dragged!.id,
                            name: dragged!.name,
                            status: dragged!.status,
                            priority: dragged!.priority,
                            description: dragged!.description,
                            dueDate: dragged!.dueDate,
                            scheduledDate: dragged!.scheduledDate,
                            section: target.section,
                            projectId: target.projectId,
                            parentTaskId: targetTaskId,
                            subtasks: (dragged as Task).subtasks,
                          };
                          return updated.map(t =>
                            t.id === targetTaskId
                              ? { ...t, subtasks: [...(t.subtasks || []), newSub] }
                              : t
                          );
                        });

                        const targetName = target.name;
                        sonnerToast.success(`Movida como subtarefa de "${targetName}"`, {
                          duration: 5000,
                          action: {
                            label: 'Desfazer',
                            onClick: async () => {
                              await supabase.from('tasks').update({
                                parent_task_id: originalParentId || null,
                                section_id: originalSection,
                                project_id: dragged!.projectId,
                              }).eq('id', draggedTaskId);
                              // Restore state by refetching
                              setTasks(prev => {
                                // Remove from target's subtasks
                                let restored = prev.map(t =>
                                  t.id === targetTaskId
                                    ? { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== draggedTaskId) }
                                    : t
                                );
                                if (originalParentId) {
                                  // Add back as subtask of original parent
                                  const sub: Subtask = { id: draggedTaskId, name: dragged!.name, status: dragged!.status, priority: dragged!.priority, description: dragged!.description, dueDate: dragged!.dueDate, scheduledDate: dragged!.scheduledDate, section: originalSection, projectId: dragged!.projectId, parentTaskId: originalParentId };
                                  restored = restored.map(t =>
                                    t.id === originalParentId
                                      ? { ...t, subtasks: [...(t.subtasks || []), sub] }
                                      : t
                                  );
                                } else {
                                  // Add back as top-level task
                                  restored = [...restored, { ...dragged!, parentTaskId: undefined } as Task];
                                }
                                return restored;
                              });
                            },
                          },
                        });
                      } catch (err) {
                        console.error('Failed to nest task', err);
                        sonnerToast.error('Erro ao mover tarefa');
                      }
                    }}
                    onScheduleToday={(taskId) => {
                      const t = taskList.find(t => t.id === taskId);
                      if (!t) return;
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const originalDate = t.scheduledDate;
                      updateTask({ ...t, scheduledDate: todayStr });
                      toast({
                        title: 'Agendada para hoje',
                        duration: 5000,
                        action: <ToastAction altText="Desfazer" onClick={() => updateTask({ ...t, scheduledDate: originalDate })}>Desfazer</ToastAction>,
                      });
                    }}
                    onMoveSectionToMonth={async (sectionId, year, month) => {
                      const newMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                      const sec = sectionList.find(s => s.id === sectionId);
                      const originalMonth = sec?.displayMonth;
                      // Update section
                      await supabase.from('sections').update({ display_month: newMonth }).eq('id', sectionId);
                      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, displayMonth: newMonth } : s));
                      // Update all tasks in this section
                      const sectionTaskIds = taskList.filter(t => t.section === sectionId).map(t => t.id);
                      if (sectionTaskIds.length > 0) {
                        await supabase.from('tasks').update({ display_month: newMonth }).in('id', sectionTaskIds);
                        setTasks(prev => prev.map(t => sectionTaskIds.includes(t.id) ? { ...t, displayMonth: newMonth } : t));
                      }
                      toast({
                        title: `Seção movida para ${monthNames[month]} ${year}`,
                        duration: 5000,
                        action: <ToastAction altText="Desfazer" onClick={async () => {
                          if (originalMonth) {
                            await supabase.from('sections').update({ display_month: originalMonth }).eq('id', sectionId);
                            setSections(prev => prev.map(s => s.id === sectionId ? { ...s, displayMonth: originalMonth } : s));
                            if (sectionTaskIds.length > 0) {
                              await supabase.from('tasks').update({ display_month: originalMonth }).in('id', sectionTaskIds);
                              setTasks(prev => prev.map(t => sectionTaskIds.includes(t.id) ? { ...t, displayMonth: originalMonth } : t));
                            }
                          }
                        }}>Desfazer</ToastAction>,
                      });
                    }}
                    fadingOutTaskId={fadingOutTaskId}
                  />
                );
              })}
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
              {activeTaskDragId ? (() => {
                const dragTask = taskList.find(t => t.id === activeTaskDragId);
                if (!dragTask) return null;
                return (
                  <div
                    className="h-9 border border-primary/30 rounded-md px-6 flex items-center gap-2 shadow-lg"
                    style={{ background: 'hsl(var(--bg-surface))', opacity: 0.95 }}
                  >
                    <StatusCheckbox status={dragTask.status} onChange={() => {}} />
                    <span className="text-[14px] truncate text-nd-text">{dragTask.name}</span>
                  </div>
                );
              })() : null}
            </DragOverlay>
          </DndContext>

          {isCreatingSection ? (
            <div style={{ marginTop: 16, paddingLeft: 16, paddingRight: 16 }}>
              <input
                ref={newSectionInputRef}
                defaultValue=""
                placeholder="Nome da seção..."
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmCreateSection((e.target as HTMLInputElement).value);
                  if (e.key === 'Escape') setIsCreatingSection(false);
                }}
                onBlur={e => confirmCreateSection(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border focus:outline-none"
                style={{
                  fontSize: 14, fontWeight: 600,
                  background: 'var(--bg-input)', color: 'var(--text-primary)',
                  borderColor: 'var(--border-focus)',
                }}
              />
            </div>
          ) : (
            <button
              onClick={handleCreateSection}
              className="flex items-center transition-colors"
              style={{ height: 40, paddingLeft: 32, fontSize: 14, color: 'var(--text-tertiary)', marginTop: 16, transition: 'all 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              + Nova Seção
            </button>
          )}

          {projectSections.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-[14px] text-nd-text-secondary">Crie uma seção para começar.</p>
            </div>
          )}
        </div>
            </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[14px] text-muted-foreground">Selecione um projeto na sidebar.</p>
          </div>
        )}
      </div>

      {selectedTask && (() => {
        let parentTaskName: string | undefined;
        if (selectedTask.parentTaskId) {
          const parent = taskList.find(t => t.id === selectedTask.parentTaskId);
          if (parent) {
            parentTaskName = parent.name;
          } else {
            for (const t of taskList) {
              const sub = (t.subtasks || []).find(s => s.id === selectedTask.parentTaskId);
              if (sub) { parentTaskName = sub.name; break; }
            }
          }
        }
        return (
          <>
            {/* Detail panel resize handle */}
            <div
              className="hidden lg:flex items-stretch w-1 cursor-col-resize group hover:bg-primary/20 transition-colors relative z-20"
              onMouseDown={(e) => handleResizeMouseDown('detail', e)}
            >
              <div className="w-[2px] mx-auto h-full group-hover:bg-primary/40 transition-colors" />
            </div>
            <div className="hidden md:block flex-shrink-0" style={{ width: Math.min(detailWidth, window.innerWidth * 0.45), minWidth: 300 }}>
              <TaskDetailPanel
                task={selectedTask}
                sections={sectionList}
                profiles={profiles}
                comments={comments}
                attachments={attachments}
                serviceTags={serviceTags}
                currentUserId={session?.user?.id}
                parentTaskName={parentTaskName}
                isPro={planLimits.isPro}
                onUpgrade={() => setShowUpgradeModal(true)}
                onClose={() => setSelectedTaskId(null)}
                onUpdateTask={handleUpdateTask}
                onAddMember={addTaskMember}
                onRemoveMember={removeTaskMember}
                onAddComment={addComment}
                onDeleteComment={deleteComment}
                onAddSubtask={async (parentTaskId, name) => {
                  await addSubtask(parentTaskId, name);
                  const { data: newSub } = await supabase.from('tasks').select('id, section_id').eq('parent_task_id', parentTaskId).order('created_at', { ascending: false }).limit(1).single();
                  if (newSub) autoTagTask(newSub.id, name, newSub.section_id);
                }}
                onUpdateSubtask={async (subtaskId, updates) => {
                  await updateSubtask(subtaskId, updates);
                  if (updates.name) {
                    for (const t of taskList) {
                      const sub = (t.subtasks || []).find(s => s.id === subtaskId);
                      if (sub) { autoTagTask(subtaskId, updates.name, sub.section); break; }
                    }
                  }
                  if (updates.status !== undefined) {
                    // Find parent and reorder: pending first, done last
                    for (const t of taskList) {
                      const hasSub = (t.subtasks || []).some(s => s.id === subtaskId);
                      if (hasSub && t.subtasks) {
                        const updated = t.subtasks.map(s => s.id === subtaskId ? { ...s, ...updates } : s);
                        const pending = updated.filter(s => s.status !== 'done');
                        const done = updated.filter(s => s.status === 'done');
                        reorderSubtasks(t.id, [...pending, ...done].map(s => s.id));
                        break;
                      }
                    }
                  }
                }}
                onDeleteSubtask={handleDeleteSubtask}
                onReorderSubtasks={reorderSubtasks}
                onNavigateToParent={selectedTask.parentTaskId ? () => setSelectedTaskId(selectedTask.parentTaskId!) : undefined}
                onSelectSubtask={(sub) => setSelectedTaskId(sub.id)}
                onUploadAttachment={uploadAttachment}
                onDeleteAttachment={deleteAttachment}
                onCreateServiceTag={createServiceTag}
                onRenameServiceTag={renameServiceTag}
                onChangeServiceTagIcon={changeServiceTagIcon}
                onDeleteServiceTag={deleteServiceTag}
              />
            </div>
          </>
        );
      })()}

      {/* Mobile bottom navigation */}
      <BottomNav activeView={activeBottomView} onNavigate={handleBottomNav} />
      {/* Pro Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
      <QuickNoteModal
        open={showQuickNote}
        onClose={() => setShowQuickNote(false)}
        workspaceId={activeWorkspaceId}
        userId={session?.user?.id || ''}
        projects={projects}
        onSaved={() => {}}
        isPro={planLimits.isPro}
        onUpgrade={() => setShowUpgradeModal(true)}
      />
      {showTemplateModal && activeProject && (
        <DeliveryTemplateModal
          projectId={activeProjectId}
          workspaceId={activeWorkspaceId || ''}
          projectName={activeProject.name}
          serviceTags={serviceTags}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
      <GlobalSearch
        open={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        tasks={taskList}
        projects={projects}
        sections={sectionList}
        attachments={attachments.map(a => ({ id: a.id, taskId: a.taskId, fileName: a.fileName }))}
        onSelectTask={(taskId, projectId) => {
          setSelectedTaskId(taskId);
          setFocusedTaskId(taskId);
          if (projectId) {
            setActiveProjectId(projectId);
            setIsMyDayView(false);
            setIsMyWeekView(false);
            setIsMyTasksView(false);
            setIsNotesView(false);
          }
        }}
        onSelectProject={(projectId) => {
          setActiveProjectId(projectId);
          setIsMyDayView(false);
          setIsMyWeekView(false);
          setIsMyTasksView(false);
          setIsNotesView(false);
        }}
      />
      {confirmDialog}
    </div>
  );
};

export default Index;
