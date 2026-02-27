import { useState, useMemo, useCallback, useEffect, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { Subtask } from '@/types/task';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, pointerWithin, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  CollisionDetection,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Menu } from 'lucide-react';
import { StatusCheckbox } from '@/components/StatusCheckbox';
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { BottomNav } from '@/components/BottomNav';
import { TaskListHeader, FilterMode } from '@/components/TaskListHeader';
import { ColumnHeader } from '@/components/ColumnHeader';
import { TaskSection } from '@/components/TaskSection';
import { TaskDetailPanel } from '@/components/TaskDetailPanel';
import { MyTasksView } from '@/components/MyTasksView';
import { MyWeekView } from '@/components/MyWeekView';
import { MyDayView } from '@/components/MyDayView';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useUndoStack } from '@/hooks/useUndoStack';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, Project } from '@/types/task';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

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
    projects, sections: sectionList, tasks: taskList, profiles, comments, attachments,
    setProjects, setSections, setTasks,
    exportData, importData,
    loading, session,
    createProject, renameProject, deleteProject: deleteProjectFn,
    changeProjectColor, reorderProjects,
    createSection: createSectionFn, renameSection: renameSectionFn, deleteSection: deleteSectionFn,
    createTask, updateTask, deleteTask: deleteTaskFn, duplicateTask, updateTaskStatus,
    addTaskMember, removeTaskMember,
    addComment, deleteComment,
    addSubtask, updateSubtask, deleteSubtask, reorderSubtasks,
    duplicateProject,
    uploadAttachment, deleteAttachment,
  } = useSupabaseData();

  const [activeProjectId, setActiveProjectId] = useState('');
  const [creatingSectionId, setCreatingSectionId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('meufluxo_expanded_sections');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
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
  const [detailWidth, setDetailWidth] = useState(() => Number(localStorage.getItem('meufluxo-detail-width')) || 580);
  const listRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ target: 'sidebar' | 'detail'; startX: number; startWidth: number } | null>(null);

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

  // Set active project when projects load
  useEffect(() => {
    if (projects.length > 0 && !projects.find(p => p.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectSections = useMemo(
    () => sectionList.filter(s => s.projectId === activeProjectId),
    [activeProjectId, sectionList]
  );

  const allProjectTasks = useMemo(
    () => taskList.filter(t => t.projectId === activeProjectId),
    [taskList, activeProjectId]
  );
  const pendingCount = allProjectTasks.filter(t => t.status !== 'done').length;

  const filterTasks = useCallback((tasks: Task[]) => {
    if (filter === 'pending') return tasks.filter(t => t.status !== 'done');
    if (filter === 'done') return tasks.filter(t => t.status === 'done');
    return tasks;
  }, [filter]);

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

  const handleStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
    const prev = taskList.find(t => t.id === taskId);
    const prevStatus = prev?.status || 'pending';
    updateTaskStatus(taskId, newStatus);
    pushUndo({
      label: 'Mudança de status',
      undo: () => updateTaskStatus(taskId, prevStatus),
    });
  }, [updateTaskStatus, taskList, pushUndo]);

  const handleUpdateTask = useCallback((updated: Task) => {
    const prev = taskList.find(t => t.id === updated.id);
    updateTask(updated);
    if (prev) {
      pushUndo({
        label: 'Edição de tarefa',
        undo: () => updateTask(prev),
      });
    }
  }, [updateTask, taskList, pushUndo]);

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    setSelectedTaskId(null);
    setFocusedTaskId(null);
    setMobileSidebarOpen(false);
  };

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [sectionId]: prev[sectionId] === false ? true : false };
      localStorage.setItem('meufluxo_expanded_sections', JSON.stringify(next));
      return next;
    });
  }, []);

  const isSectionExpanded = (sectionId: string) => expandedSections[sectionId] !== false;

  const handleDeleteTask = useCallback((taskId: string) => {
    const task = taskList.find(t => t.id === taskId);
    deleteTaskFn(taskId);
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    if (focusedTaskId === taskId) {
      const idx = visibleTaskIds.indexOf(taskId);
      const next = visibleTaskIds[idx + 1] || visibleTaskIds[idx - 1] || null;
      setFocusedTaskId(next);
    }
    if (task) {
      pushUndo({
        label: 'Excluir tarefa',
        undo: async () => {
          await createTask({
            name: task.name,
            status: task.status,
            section: task.section,
            projectId: task.projectId,
            priority: task.priority,
            description: task.description,
            dueDate: task.dueDate,
          });
        },
      });
      toast({
        title: 'Tarefa excluída',
        duration: 5000,
        action: <ToastAction altText="Desfazer" onClick={() => {
          createTask({
            name: task.name,
            status: task.status,
            section: task.section,
            projectId: task.projectId,
            priority: task.priority,
            description: task.description,
            dueDate: task.dueDate,
          });
        }}>Desfazer</ToastAction>,
      });
    }
  }, [deleteTaskFn, selectedTaskId, focusedTaskId, visibleTaskIds, taskList, createTask, pushUndo]);

  const createTaskInSection = useCallback(async (sectionId: string) => {
    const project = projects.find(p => p.id === activeProjectId);
    const shortName = project ? project.name.replace(/^\d+\s*/, '') : '';
    const prefix = `[${shortName}] Campanha - `;
    setCreatingSectionId(sectionId);
    try {
      const newId = await createTask({
        name: prefix,
        status: 'pending',
        section: sectionId,
        projectId: activeProjectId,
      });
      setFocusedTaskId(newId);
      setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
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
  }, [activeProjectId, projects, createTask, deleteTaskFn, pushUndo]);

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

  const handleCreateSection = useCallback(async () => {
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;
    const title = generateSectionTitle(project.name);
    try {
      const id = await createSectionFn(title, activeProjectId);
      setExpandedSections(prev => ({ ...prev, [id]: true }));
    } catch (err) {
      console.error('Erro ao criar seção:', err);
    }
  }, [activeProjectId, projects, createSectionFn]);

  const handleRenameSection = useCallback((id: string, title: string) => {
    renameSectionFn(id, title);
  }, [renameSectionFn]);

  const handleDeleteSection = useCallback((id: string) => {
    deleteSectionFn(id);
  }, [deleteSectionFn]);

  const handleDuplicateProject = useCallback(async (id: string, mode: 'sections' | 'tasks' | 'both') => {
    const newId = await duplicateProject(id, mode);
    setActiveProjectId(newId);
    return newId;
  }, [duplicateProject]);

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
        const task = taskList.find(t => t.id === focusedTaskId);
        if (task && window.confirm(`Deletar "${task.name || 'tarefa sem nome'}"?`)) handleDeleteTask(focusedTaskId);
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
        return data?.type === 'section-drop' || data?.type === 'task';
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
    if (over.data.current?.type === 'section-drop') {
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
      if (overData?.type === 'section-drop') targetSectionId = overData.sectionId;
      else if (overData?.type === 'task') targetSectionId = (overData.task as Task).section;

      setTasks(prev => {
        const sectionTasks = prev.filter(t => t.section === targetSectionId && t.projectId === activeProjectId);
        const otherTasks = prev.filter(t => !(t.section === targetSectionId && t.projectId === activeProjectId) && t.id !== activeTask.id);
        const filteredSection = sectionTasks.filter(t => t.id !== activeTask.id);
        const overTaskId = overData?.type === 'task' ? (overData.task as Task).id : null;
        let newIdx = filteredSection.length;
        if (overTaskId) {
          const idx = filteredSection.findIndex(t => t.id === overTaskId);
          if (idx !== -1) newIdx = idx;
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'hsl(var(--bg-app))' }}>
        <p className="text-nd-text-secondary animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!session) return null;

  const panelOpen = selectedTask !== null;
  const sectionIds = projectSections.map(s => `section-${s.id}`);



  const sidebarProps = {
    projects,
    activeProjectId,
    onSelectProject: (id: string) => { setIsMyTasksView(false); setIsMyWeekView(false); setIsMyDayView(false); handleSelectProject(id); },
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
    onToggleMyDay: () => { setIsMyDayView(true); setIsMyTasksView(false); setIsMyWeekView(false); },
    isMyTasksView,
    onToggleMyTasks: () => { setIsMyTasksView(prev => !prev); setIsMyWeekView(false); setIsMyDayView(false); },
    isMyWeekView,
    onToggleMyWeek: () => { setIsMyWeekView(true); setIsMyTasksView(false); setIsMyDayView(false); },
    tasks: taskList,
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

  if (!activeProject && !isMyDayView && !isMyWeekView && !isMyTasksView) {
    return (
      <div className="h-screen flex" style={{ background: 'hsl(var(--bg-app))' }}>
        <div className="hidden lg:block"><ProjectSidebar {...sidebarProps} /></div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-nd-text-secondary">Crie um projeto para começar.</p>
        </div>
        <BottomNav activeView="project" onNavigate={handleBottomNav} />
      </div>
    );
  }

  return (
    <div className="h-screen flex" style={{ background: 'hsl(var(--bg-app))' }}>
      {/* Desktop sidebar (always visible >1024px) */}
      <div className="hidden lg:block flex-shrink-0" style={{ width: Math.min(sidebarWidth, 240), minWidth: 120, maxWidth: '25vw' }}>
        <ProjectSidebar {...sidebarProps} />
      </div>
      {/* Sidebar resize handle (desktop only) */}
      <div
        className="hidden lg:flex items-stretch w-1 cursor-col-resize group hover:bg-primary/20 transition-colors relative z-20"
        onMouseDown={(e) => handleResizeMouseDown('sidebar', e)}
      >
        <div className="w-[2px] mx-auto h-full group-hover:bg-primary/40 transition-colors" />
      </div>

      {/* Tablet sidebar (collapsible overlay 768-1024px) + Mobile sidebar (overlay <768px) */}
      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 z-[90] lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[100] lg:hidden animate-slide-in-left" style={{ width: 240 }}>
            <ProjectSidebar {...sidebarProps} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 transition-none pb-14 md:pb-0">
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

        {isMyDayView ? (
          <MyDayView
            tasks={taskList}
            projects={projects}
            sections={sectionList}
            userName={profiles.find(p => p.id === session?.user?.id)?.fullName || session?.user?.email || 'Usuário'}
            onUpdateTask={handleUpdateTask}
            onStatusChange={handleStatusChange}
            onSelectTask={(task) => { setSelectedTaskId(task.id); setFocusedTaskId(task.id); }}
            selectedTaskId={selectedTaskId || undefined}
            onNavigateToWeek={() => { setIsMyWeekView(true); setIsMyDayView(false); setIsMyTasksView(false); }}
          />
        ) : isMyWeekView ? (
          <MyWeekView
            tasks={taskList}
            projects={projects}
            sections={sectionList}
            onUpdateTask={handleUpdateTask}
            onStatusChange={handleStatusChange}
            onSelectTask={(task) => { setSelectedTaskId(task.id); setFocusedTaskId(task.id); }}
            selectedTaskId={selectedTaskId || undefined}
          />
        ) : isMyTasksView ? (
          <>
            <div className="h-14 px-6 flex items-center border-b border-nd-border" style={{ background: 'hsl(var(--bg-app))' }}>
              <h1 className="text-[18px] font-bold text-nd-text">Minhas Tarefas</h1>
            </div>
            <MyTasksView
              tasks={taskList}
              sections={sectionList}
              currentUserId={session?.user?.id}
              profiles={profiles}
              onSelectTask={(task) => { setSelectedTaskId(task.id); setFocusedTaskId(task.id); }}
              selectedTaskId={selectedTaskId || undefined}
              onStatusChange={handleStatusChange}
            />
          </>
        ) : activeProject ? (
          <>
            <TaskListHeader
              projectName={activeProject.name}
              pendingCount={pendingCount}
              onNewTask={createNewTask}
              filter={filter}
              onFilterChange={setFilter}
            />
            <ColumnHeader />

        <div className="flex-1 overflow-y-auto" ref={listRef}>
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
                    onSubtaskStatusChange={(_taskId, subtaskId, status) => {
                      updateSubtask(subtaskId, { status });
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
                      if (t) updateTask({ ...t, name });
                    }}
                    onRenameSubtask={(subtaskId, name) => {
                      updateSubtask(subtaskId, { name });
                    }}
                    activeTaskId={activeTaskDragId}
                    overTaskId={overTaskDragId}
                    taskDropPosition={taskDropPosition}
                    allSections={projectSections}
                    projectColor={activeProject?.color}
                    onMoveToSection={(taskId, sectionId) => {
                      const t = taskList.find(t => t.id === taskId);
                      if (!t) return;
                      const originalSection = t.section;
                      const targetSectionObj = sectionList.find(s => s.id === sectionId);
                      updateTask({ ...t, section: sectionId });
                      toast({
                        title: `Movida para ${targetSectionObj?.title || 'seção'}`,
                        duration: 5000,
                        action: <ToastAction altText="Desfazer" onClick={() => updateTask({ ...t, section: originalSection })}>Desfazer</ToastAction>,
                      });
                    }}
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

          <button
            onClick={handleCreateSection}
            className="h-10 w-full px-6 flex items-center text-[13px] text-nd-text-muted hover:text-nd-text-secondary transition-colors mt-2"
          >
            + Nova Seção
          </button>

          {projectSections.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-[14px] text-nd-text-secondary">Crie uma seção para começar.</p>
            </div>
          )}
        </div>
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
                currentUserId={session?.user?.id}
                parentTaskName={parentTaskName}
                onClose={() => setSelectedTaskId(null)}
                onUpdateTask={handleUpdateTask}
                onAddMember={addTaskMember}
                onRemoveMember={removeTaskMember}
                onAddComment={addComment}
                onDeleteComment={deleteComment}
                onAddSubtask={addSubtask}
                onUpdateSubtask={updateSubtask}
                onDeleteSubtask={deleteSubtask}
                onReorderSubtasks={reorderSubtasks}
                onNavigateToParent={selectedTask.parentTaskId ? () => setSelectedTaskId(selectedTask.parentTaskId!) : undefined}
                onSelectSubtask={(sub) => setSelectedTaskId(sub.id)}
                onUploadAttachment={uploadAttachment}
                onDeleteAttachment={deleteAttachment}
              />
            </div>
          </>
        );
      })()}

      {/* Mobile bottom navigation */}
      <BottomNav activeView={activeBottomView} onNavigate={handleBottomNav} />
    </div>
  );
};

export default Index;
