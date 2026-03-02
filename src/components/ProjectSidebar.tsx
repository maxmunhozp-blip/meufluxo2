import { useState, useRef, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { GripVertical, Settings, LogOut, Sun, Moon, Monitor, CalendarDays, Users, Shield, HelpCircle, Tag, CreditCard, User, ChevronRight, StickyNote, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Project, Task, Section, ServiceTag } from '@/types/task';
import { ContextMenu } from './ContextMenu';
import { WorkspaceSelector } from './WorkspaceSelector';
import { ProjectMembersModal } from './ProjectMembersModal';
import type { Workspace, WorkspaceMember } from '@/hooks/useSupabaseData';
import { HowToUseModal } from './HowToUseModal';
import { ServiceTagsManager } from './ServiceTagsManager';

export const PROJECT_COLORS = ['#6C9CFC', '#FFB86C', '#FF79C6', '#50FA7B', '#BD93F9', '#8BE9FD', '#F1FA8C'];

const APPLE_EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
const SIDEBAR_EXPANSION_KEY = 'meufluxo_sidebar_expanded_projects';

function loadExpandedProjects(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SIDEBAR_EXPANSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function SortableProjectItem({
  project,
  isActive,
  isExpanded,
  sections,
  tasks,
  activeSectionId,
  isDraggingTask,
  onSelect,
  onSelectSection,
  onToggleExpand,
  onContextMenu,
  onColorClick,
  onSectionContextMenu,
  renamingSectionId,
  renameSectionValue,
  onRenameSectionValueChange,
  onConfirmSectionRename,
  onCancelSectionRename,
  sectionRenameRef,
  onDropTask,
  onDropTaskToSection,
}: {
  project: Project;
  isActive: boolean;
  isExpanded: boolean;
  sections: Section[];
  tasks: Task[];
  activeSectionId?: string | null;
  isDraggingTask?: boolean;
  onSelect: () => void;
  onSelectSection?: (sectionId: string) => void;
  onToggleExpand: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onColorClick: (e: React.MouseEvent) => void;
  onSectionContextMenu?: (e: React.MouseEvent, sectionId: string) => void;
  renamingSectionId?: string | null;
  renameSectionValue?: string;
  onRenameSectionValueChange?: (v: string) => void;
  onConfirmSectionRename?: () => void;
  onCancelSectionRename?: () => void;
  sectionRenameRef?: React.RefObject<HTMLInputElement>;
  onDropTask?: (taskId: string, sourceProjectId: string, targetProjectId: string, taskName: string) => void;
  onDropTaskToSection?: (taskId: string, sourceProjectId: string, targetProjectId: string, targetSectionId: string, taskName: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  const handleNativeDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-task-id') && !e.dataTransfer.types.includes('application/json')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverSectionId) setIsDragOver(true);
  };

  const handleNativeDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
    setDragOverSectionId(null);
  };

  const handleNativeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragOverSectionId(null);
    const taskId = e.dataTransfer.getData('application/x-task-id');
    const sourceProjectId = e.dataTransfer.getData('application/x-task-project');
    const taskName = e.dataTransfer.getData('application/x-task-name');
    if (!taskId || sourceProjectId === project.id) return;
    onDropTask?.(taskId, sourceProjectId, project.id, taskName);
  };

  const handleSectionDragOver = (e: React.DragEvent, sectionId: string) => {
    if (!e.dataTransfer.types.includes('application/x-task-id') && !e.dataTransfer.types.includes('application/json')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSectionId(sectionId);
    setIsDragOver(false);
  };

  const handleSectionDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverSectionId(null);
  };

  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSectionId(null);
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('application/x-task-id');
    const sourceProjectId = e.dataTransfer.getData('application/x-task-project');
    const taskName = e.dataTransfer.getData('application/x-task-name');
    if (!taskId) return;
    if (onDropTaskToSection) {
      onDropTaskToSection(taskId, sourceProjectId, project.id, sectionId, taskName);
    } else if (sourceProjectId !== project.id) {
      onDropTask?.(taskId, sourceProjectId, project.id, taskName);
    }
  };

  const showDragHint = isDraggingTask && !isDragOver && !dragOverSectionId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onDragOver={handleNativeDragOver}
      onDragLeave={handleNativeDragLeave}
      onDrop={handleNativeDrop}
    >
      <div
        className="group w-full flex items-center gap-2 cursor-pointer relative select-none"
        onContextMenu={onContextMenu}
        style={{
          height: 36,
          paddingLeft: 8,
          paddingRight: 12,
          borderRadius: 8,
          border: isDragOver
            ? '2px solid var(--accent-blue)'
            : showDragHint
              ? '2px dashed var(--text-placeholder)'
              : '2px solid transparent',
          background: isDragOver ? 'var(--accent-subtle)' : undefined,
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontWeight: isActive ? 500 : 400,
          fontSize: 14,
          transition: 'all 150ms ease-out',
          transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        }}
        onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.background = isDragOver ? 'var(--accent-subtle)' : 'transparent'; }}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--text-placeholder)' }} />
        </div>
        {/* Chevron — 24×24 touch target */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, borderRadius: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronRight
            className="w-3 h-3"
            style={{
              color: 'var(--text-tertiary)',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease-out',
            }}
          />
        </button>
        {/* Color dot — 6px with 8px margin-right */}
        <button
          onClick={(e) => { e.stopPropagation(); onColorClick(e); }}
          className="flex-shrink-0 hover:scale-125 transition-transform"
          style={{ width: 6, height: 6, borderRadius: '50%', background: project.color, marginRight: 4 }}
        />
        <span className="truncate flex-1 text-left" style={{ lineHeight: 1.5 }} onClick={onSelect}>{project.name}</span>
        {/* Drop hint */}
        {isDragOver && (
          <span className="text-[10px] font-medium whitespace-nowrap flex-shrink-0" style={{ color: 'var(--accent-blue)' }}>
            → Entrada
          </span>
        )}
      </div>

      {/* Expandable sections */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: isExpanded ? `${sections.length * 32 + 4}px` : '0px',
          opacity: isExpanded ? 1 : 0,
          transition: 'max-height 150ms ease-out, opacity 150ms ease-out',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          paddingTop: isExpanded ? 4 : 0,
        }}
      >
        {sections.map(section => {
          const isSectionActive = activeSectionId === section.id;
          const isRenaming = renamingSectionId === section.id;
          const isSectionDragOver = dragOverSectionId === section.id;
          const showSectionHint = isDraggingTask && !isSectionDragOver;
          if (isRenaming) {
            return (
              <div key={section.id} className="flex items-center" style={{ height: 28, paddingLeft: 32, paddingRight: 12 }}>
                <input
                  ref={sectionRenameRef}
                  value={renameSectionValue || ''}
                  onChange={e => onRenameSectionValueChange?.(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') onConfirmSectionRename?.(); if (e.key === 'Escape') onCancelSectionRename?.(); }}
                  onBlur={() => onConfirmSectionRename?.()}
                  className="w-full h-6 px-2 text-[12px] rounded border focus:outline-none"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-focus)' }}
                />
              </div>
            );
          }
          return (
            <button
              key={section.id}
              onClick={() => onSelectSection?.(section.id)}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onSectionContextMenu?.(e, section.id); }}
              onDragOver={(e) => handleSectionDragOver(e, section.id)}
              onDragLeave={handleSectionDragLeave}
              onDrop={(e) => handleSectionDrop(e, section.id)}
              className="w-full flex items-center gap-2 select-none"
              style={{
                height: 28,
                paddingLeft: 32,
                paddingRight: 12,
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 400,
                lineHeight: 1.5,
                color: isSectionDragOver ? 'var(--accent-blue)' : isSectionActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: isSectionDragOver
                  ? '2px solid var(--accent-blue)'
                  : showSectionHint
                    ? '1px dashed var(--text-placeholder)'
                    : '2px solid transparent',
                background: isSectionDragOver ? 'var(--accent-subtle)' : undefined,
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={e => { if (!isSectionDragOver) { e.currentTarget.style.background = 'var(--bg-elevated)'; if (!isSectionActive) e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { if (!isSectionDragOver) { e.currentTarget.style.background = isSectionDragOver ? 'var(--accent-subtle)' : 'transparent'; if (!isSectionActive) e.currentTarget.style.color = 'var(--text-secondary)'; } }}
            >
              <span className="truncate flex-1 text-left">{section.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ProjectSidebarProps {
  projects: Project[];
  sections?: Section[];
  projectMonths?: Record<string, string>;
  activeProjectId: string;
  activeSectionId?: string | null;
  onSelectProject: (id: string) => void;
  onSelectSection?: (sectionId: string) => void;
  onCreateProject: (name: string, color: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onReorderProjects: (projects: Project[]) => void;
  onDuplicateProject: (id: string, mode: 'sections' | 'tasks' | 'both') => Promise<string>;
  onExport: () => void;
  onImport: (file: File) => void;
  onLogout: () => void;
  isMyDayView?: boolean;
  onToggleMyDay?: () => void;
  isMyTasksView?: boolean;
  onToggleMyTasks?: () => void;
  isMyWeekView?: boolean;
  onToggleMyWeek?: () => void;
  isNotesView?: boolean;
  onToggleNotes?: () => void;
  tasks?: Task[];
  workspaces?: Workspace[];
  activeWorkspaceId?: string | null;
  workspaceMembers?: WorkspaceMember[];
  onSwitchWorkspace?: (id: string) => void;
  onInviteToWorkspace?: (email: string) => Promise<void>;
  onCreateWorkspace?: (name: string) => Promise<string>;
  onRenameWorkspace?: (id: string, name: string) => Promise<void>;
  onDeleteWorkspace?: (id: string) => Promise<void>;
  onAcceptInvite?: (workspaceId: string) => Promise<void>;
  onGenerateInviteLink?: () => Promise<string>;
  onAddProjectMember?: (projectId: string, userId: string) => Promise<void>;
  onRemoveProjectMember?: (projectId: string, userId: string) => Promise<void>;
  getProjectMembers?: (projectId: string) => WorkspaceMember[];
  isSuperAdmin?: boolean;
  serviceTags?: ServiceTag[];
  onCycleTheme?: () => void;
  themePreference?: 'dark' | 'light' | 'system';
  onCreateServiceTag?: (name: string, icon: string) => Promise<void>;
  onRenameServiceTag?: (id: string, name: string) => Promise<void>;
  onChangeServiceTagIcon?: (id: string, icon: string) => Promise<void>;
  onDeleteServiceTag?: (id: string) => Promise<void>;
  onRenameSection?: (id: string, title: string) => void;
  onDeleteSection?: (id: string) => void;
  onMoveTaskToProject?: (taskId: string, sourceProjectId: string, targetProjectId: string, taskName: string) => void;
  onMoveTaskToSection?: (taskId: string, sourceProjectId: string, targetProjectId: string, targetSectionId: string, taskName: string) => void;
  isPro?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSearch?: () => void;
}

export function ProjectSidebar({
  projects, sections: allSections = [], projectMonths = {}, activeProjectId, activeSectionId, onSelectProject, onSelectSection,
  onCreateProject, onRenameProject, onDeleteProject,
  onChangeColor, onReorderProjects, onDuplicateProject, onExport, onImport, onLogout,
  isMyDayView, onToggleMyDay, isMyTasksView, onToggleMyTasks, isMyWeekView, onToggleMyWeek,
  isNotesView, onToggleNotes,
  tasks = [], workspaces = [], activeWorkspaceId, workspaceMembers = [],
  onSwitchWorkspace, onInviteToWorkspace, onCreateWorkspace, onRenameWorkspace, onDeleteWorkspace,
  onAcceptInvite, onGenerateInviteLink, onAddProjectMember, onRemoveProjectMember, getProjectMembers,
  isSuperAdmin, serviceTags = [], onCreateServiceTag, onRenameServiceTag, onChangeServiceTagIcon, onDeleteServiceTag,
  onCycleTheme, themePreference,
  onRenameSection, onDeleteSection, onMoveTaskToProject, onMoveTaskToSection, isPro,
  collapsed, onToggleCollapse, onOpenSearch,
}: ProjectSidebarProps) {
  const navigate = useNavigate();
  const [projectMembersModal, setProjectMembersModal] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<string | null>(null);
  const [colorPicker, setColorPicker] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showServiceTags, setShowServiceTags] = useState(false);
  const [sectionContextMenu, setSectionContextMenu] = useState<{ sectionId: string; x: number; y: number } | null>(null);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renameSectionValue, setRenameSectionValue] = useState('');
  const sectionRenameRef = useRef<HTMLInputElement>(null);
  // Default: collapsed. Active project auto-expands.
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    const stored = loadExpandedProjects();
    // If nothing stored, all collapsed by default
    return stored;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for cross-area task drag events with global cleanup
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  useEffect(() => {
    const handleDragStart = () => setIsDraggingTask(true);
    const handleGlobalDragEnd = () => setIsDraggingTask(false);

    window.addEventListener('meufluxo:task-drag-start', handleDragStart);
    window.addEventListener('meufluxo:task-drag-end', handleGlobalDragEnd);
    // These fire even when drop happens outside the window or browser cancels
    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('drop', handleGlobalDragEnd);
    // Safety net: mouseup means drag is over
    const handleMouseUp = () => setTimeout(handleGlobalDragEnd, 100);
    document.addEventListener('mouseup', handleMouseUp);
    // Reset when drag leaves the viewport entirely
    const handleDragLeaveDocument = (e: DragEvent) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        handleGlobalDragEnd();
      }
    };
    document.addEventListener('dragleave', handleDragLeaveDocument);

    return () => {
      window.removeEventListener('meufluxo:task-drag-start', handleDragStart);
      window.removeEventListener('meufluxo:task-drag-end', handleGlobalDragEnd);
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('drop', handleGlobalDragEnd);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('dragleave', handleDragLeaveDocument);
    };
  }, []);

  // Safety timeout: force-reset drag state after 5s
  useEffect(() => {
    if (!isDraggingTask) return;
    const safetyTimer = setTimeout(() => {
      console.warn('Drag state safety timeout - forcing reset');
      setIsDraggingTask(false);
    }, 5000);
    return () => clearTimeout(safetyTimer);
  }, [isDraggingTask]);

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = { ...prev, [projectId]: !prev[projectId] };
      localStorage.setItem(SIDEBAR_EXPANSION_KEY, JSON.stringify(next));
      return next;
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dayCount = useMemo(() => {
    let count = 0;
    const scheduledIds = new Set<string>();

    // First pass: count tasks scheduled for today
    const countScheduledSubtasks = (subs: any[]) => {
      subs.forEach(sub => {
        if (sub.status !== 'done' && sub.scheduledDate === todayStr) {
          count++;
          scheduledIds.add(sub.id);
        }
        if (sub.subtasks) countScheduledSubtasks(sub.subtasks);
      });
    };
    tasks.forEach(t => {
      if (t.parentTaskId) return;
      if (t.status !== 'done') {
        if (t.scheduledDate === todayStr) { count++; scheduledIds.add(t.id); }
        else if (t.dueDate === todayStr && !t.scheduledDate) { count++; scheduledIds.add(t.id); }
      }
      if (t.subtasks) countScheduledSubtasks(t.subtasks);
    });

    // Second pass: count overdue tasks (only for Pro users, matching MyDayView)
    if (isPro) {
      const countOverdueSubtasks = (subs: any[]) => {
        subs.forEach(sub => {
          if (sub.status === 'done' || scheduledIds.has(sub.id)) return;
          if (sub.scheduledDate && sub.scheduledDate < todayStr) count++;
          if (sub.subtasks) countOverdueSubtasks(sub.subtasks);
        });
      };
      tasks.forEach(t => {
        if (t.parentTaskId || t.status === 'done') return;
        if (scheduledIds.has(t.id)) return;
        if (t.scheduledDate && t.scheduledDate < todayStr) count++;
        else if (!t.scheduledDate && t.dueDate && t.dueDate < todayStr) count++;
        if (t.subtasks) countOverdueSubtasks(t.subtasks);
      });
    }

    return count;
  }, [tasks, todayStr, isPro]);
  const weekCount = useMemo(() => {
    const end = new Date(); end.setDate(end.getDate() + 7);
    const endStr = format(end, 'yyyy-MM-dd');
    return tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate >= todayStr && t.dueDate <= endStr).length;
  }, [tasks, todayStr]);

  const handleCreate = () => {
    if (!newProjectName.trim()) { setCreatingProject(false); return; }
    const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    onCreateProject(newProjectName.trim(), color);
    setNewProjectName('');
    setCreatingProject(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = projects.findIndex(p => p.id === active.id);
    const newIdx = projects.findIndex(p => p.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) onReorderProjects(arrayMove(projects, oldIdx, newIdx));
  };

  const startRename = (id: string) => {
    const p = projects.find(p => p.id === id);
    if (!p) return;
    setRenamingId(id);
    setRenameValue(p.name);
    setTimeout(() => renameRef.current?.focus(), 0);
  };

  const confirmRename = () => {
    if (renamingId && renameValue.trim()) onRenameProject(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  const NavButton = ({ active, onClick, icon: Icon, label, count }: {
    active: boolean; onClick?: () => void; icon: typeof Sun; label: string; count?: number;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 cursor-pointer select-none"
      style={{
        height: 36,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 'var(--radius-md)',
        fontSize: 14,
        fontWeight: 400,
        color: active ? 'var(--accent-blue)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-subtle)' : 'transparent',
        transition: 'all 150ms ease-out',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? 'var(--accent-blue)' : 'var(--text-secondary)', transition: 'color 150ms ease-out' }} />
      <span className="truncate flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: active ? 'var(--accent-blue)' : 'var(--text-tertiary)', fontWeight: 400 }}>{count}</span>
      )}
    </button>
  );

  // Collapsed mini sidebar
  if (collapsed) {
    return (
      <aside
        className="h-screen flex flex-col z-30 sticky top-0 overflow-hidden"
        style={{ width: 48, minWidth: 48, maxWidth: 48, transition: 'width 200ms ease-out', background: 'hsl(var(--sidebar-background))' }}
      >
        <div className="flex flex-col items-center gap-1 pt-3 px-1">
          {/* Expand button */}
          <button
            onClick={onToggleCollapse}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            title="Expandir menu"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="w-5 h-px my-1" style={{ background: 'var(--border-subtle)' }} />

          {/* Nav icons */}
          <button
            onClick={onToggleMyDay}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            title="Meu Dia"
            style={{ color: isMyDayView ? 'var(--accent-blue)' : 'var(--text-secondary)', background: isMyDayView ? 'var(--accent-subtle)' : 'transparent' }}
            onMouseEnter={e => { if (!isMyDayView) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={e => { if (!isMyDayView) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleMyWeek}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            title="Minha Semana"
            style={{ color: isMyWeekView ? 'var(--accent-blue)' : 'var(--text-secondary)', background: isMyWeekView ? 'var(--accent-subtle)' : 'transparent' }}
            onMouseEnter={e => { if (!isMyWeekView) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={e => { if (!isMyWeekView) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            <CalendarDays className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleNotes}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            title="Notas"
            style={{ color: isNotesView ? 'var(--accent-blue)' : 'var(--text-secondary)', background: isNotesView ? 'var(--accent-subtle)' : 'transparent' }}
            onMouseEnter={e => { if (!isNotesView) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={e => { if (!isNotesView) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <div className="w-5 h-px my-1" style={{ background: 'var(--border-subtle)' }} />

          {/* Project dots */}
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              title={p.name}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: activeProjectId === p.id && !isMyDayView && !isMyWeekView && !isMyTasksView && !isNotesView ? 'var(--accent-subtle)' : 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = activeProjectId === p.id && !isMyDayView && !isMyWeekView && !isMyTasksView && !isNotesView ? 'var(--accent-subtle)' : 'transparent'; }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="h-screen flex flex-col z-30 sticky top-0 overflow-hidden"
      style={{ width: 260, minWidth: 260, maxWidth: 260, transition: 'width 200ms ease-out', background: 'hsl(var(--sidebar-background))' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingTask(false);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingTask(false);
        }
      }}
    >
      {/* NAVEGAÇÃO — flex-shrink-0 */}
      <div style={{ flexShrink: 0, padding: 16, paddingBottom: 0 }}>
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 1, lineHeight: 1.3, textTransform: 'uppercase' as const }}>
            Navegação
          </span>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-6 h-6 flex items-center justify-center rounded-md"
              title="Recolher menu"
              style={{ color: 'var(--text-tertiary)', transition: 'all 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavButton active={!!isMyDayView} onClick={onToggleMyDay} icon={Sun} label="Meu Dia" count={dayCount} />
          <NavButton active={!!isMyWeekView} onClick={onToggleMyWeek} icon={CalendarDays} label="Minha Semana" />
          <NavButton active={!!isNotesView} onClick={onToggleNotes} icon={StickyNote} label="Notas" />
        </div>

        {/* Separator — 24px gap above and below */}
        <div style={{ margin: '24px 0' }}>
          <div style={{ height: 1, background: 'var(--border-subtle)' }} />
        </div>
      </div>

      {/* CLIENTES — flex: 1, overflow-y: auto */}
      <div className="flex-1 overflow-y-auto sidebar-scroll" style={{ padding: '0 16px 16px 16px' }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: 1, lineHeight: 1.3, textTransform: 'uppercase' as const }}>
            Clientes
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map((project) => (
                renamingId === project.id ? (
                  <div key={project.id} className="flex items-center gap-2.5" style={{ height: 40, paddingLeft: 10, paddingRight: 10 }}>
                    <span className="flex-shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: project.color }} />
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null); }}
                      onBlur={confirmRename}
                      className="flex-1 h-7 px-2 text-[13px] rounded border focus:outline-none"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderColor: 'var(--border-focus)' }}
                    />
                  </div>
                ) : (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    isActive={activeProjectId === project.id && !isMyDayView && !isMyWeekView && !isMyTasksView && !isNotesView}
                    isExpanded={!!expandedProjects[project.id]}
                    sections={allSections.filter(s => {
                      if (s.projectId !== project.id) return false;
                      if (!s.displayMonth) return true;
                      const storedIso = projectMonths[project.id];
                      if (!storedIso) {
                        // Default to current month
                        const now = new Date();
                        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                        return s.displayMonth === key;
                      }
                      const d = new Date(storedIso);
                      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                      return s.displayMonth === key;
                    })}
                    tasks={tasks}
                    activeSectionId={activeSectionId}
                    onSelect={() => onSelectProject(project.id)}
                    onSelectSection={onSelectSection}
                    onToggleExpand={() => toggleProjectExpand(project.id)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ projectId: project.id, x: e.clientX, y: e.clientY }); }}
                    onColorClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setColorPicker({ projectId: project.id, x: rect.right + 8, y: rect.top }); }}
                    onSectionContextMenu={(e, sectionId) => { setSectionContextMenu({ sectionId, x: e.clientX, y: e.clientY }); }}
                    renamingSectionId={renamingSectionId}
                    renameSectionValue={renameSectionValue}
                    onRenameSectionValueChange={setRenameSectionValue}
                    onConfirmSectionRename={() => { if (renamingSectionId && renameSectionValue.trim()) onRenameSection?.(renamingSectionId, renameSectionValue.trim()); setRenamingSectionId(null); }}
                    onCancelSectionRename={() => setRenamingSectionId(null)}
                    sectionRenameRef={sectionRenameRef}
                    onDropTask={onMoveTaskToProject}
                    onDropTaskToSection={onMoveTaskToSection}
                    isDraggingTask={isDraggingTask}
                  />
                )
              ))}
            </div>
          </SortableContext>
        </DndContext>

      </div>

      {/* "+ Novo Cliente" sticky bottom */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', padding: '0 16px' }}>
        {creatingProject ? (
          <div className="flex items-center" style={{ height: 36 }}>
            <input
              ref={inputRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreatingProject(false); setNewProjectName(''); } }}
              onBlur={() => { if (newProjectName.trim()) handleCreate(); else setCreatingProject(false); }}
              autoFocus
              placeholder="Nome do cliente..."
              className="w-full h-7 px-2 text-[14px] rounded-md border focus:outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-focus)' }}
            />
          </div>
        ) : (
          <button
            onClick={() => { setCreatingProject(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="w-full flex items-center select-none"
            style={{
              height: 36,
              fontSize: 14,
              color: 'var(--text-tertiary)',
              fontWeight: 400,
              transition: 'all 150ms ease-out',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            + Novo Cliente
          </button>
        )}
        {/* Search — quiet affordance below client list */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 select-none"
          style={{
            height: 30,
            paddingLeft: 10,
            paddingRight: 10,
            marginTop: 6,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 400,
            color: 'var(--text-placeholder)',
            background: 'var(--bg-elevated)',
            border: '1px solid transparent',
            transition: 'all 150ms ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-placeholder)'; }}
        >
          <Search style={{ width: 13, height: 13, flexShrink: 0, opacity: 0.6 }} />
          <span className="flex-1 text-left truncate">Buscar</span>
          <kbd className="hidden md:inline text-[10px] px-1 py-0.5 rounded" style={{ color: 'var(--text-placeholder)', background: 'var(--bg-surface)', fontFamily: 'system-ui', opacity: 0.6 }}>⌘K</kbd>
        </button>
      </div>

      <div className="relative" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="px-3 py-2 flex items-center gap-1" style={{ opacity: 1 }}>
          <div style={{ opacity: 0.4, transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          >
            <WorkspaceSelector
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId || null}
              onSwitch={onSwitchWorkspace || (() => {})}
              onInvite={onInviteToWorkspace || (async () => {})}
              onCreate={onCreateWorkspace || (async () => '')}
              onRename={onRenameWorkspace || (async () => {})}
              onDelete={onDeleteWorkspace || (async () => {})}
              onGenerateInviteLink={onGenerateInviteLink || (async () => '')}
              direction="up"
            />
          </div>
          <div className="flex-1" />

          {/* Theme toggle icon */}
          {onCycleTheme && (
            <button
              onClick={onCycleTheme}
              className="w-7 h-7 flex items-center justify-center rounded-md"
              title={themePreference === 'dark' ? 'Escuro' : themePreference === 'light' ? 'Claro' : 'Sistema'}
              style={{ color: 'var(--text-tertiary)', transition: 'all 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              {themePreference === 'dark' ? <Moon className="w-4 h-4" strokeWidth={1.5} /> :
               themePreference === 'light' ? <Sun className="w-4 h-4" strokeWidth={1.5} /> :
               <Monitor className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          )}

          {isSuperAdmin && (
            <a href="/admin" className="w-7 h-7 flex items-center justify-center rounded-md" title="Admin"
              style={{ opacity: 0.4, color: 'var(--text-primary)', transition: 'opacity 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
            ><Shield className="w-3.5 h-3.5" /></a>
          )}
          <button onClick={() => navigate('/profile')} className="w-7 h-7 flex items-center justify-center rounded-md" title="Perfil"
            style={{ opacity: 0.4, color: 'var(--text-primary)', transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          ><User className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowSettings(!showSettings)} className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ opacity: 0.4, color: 'var(--text-primary)', transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          ><Settings className="w-3.5 h-3.5" /></button>
          <button onClick={onLogout} className="w-7 h-7 flex items-center justify-center rounded-md" title="Sair da conta"
            style={{ opacity: 0.4, color: 'var(--text-primary)', transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          ><LogOut className="w-3.5 h-3.5" /></button>
        </div>

        {showSettings && (
          <div className="absolute bottom-full left-3 mb-1 py-1 rounded-lg border z-[100]"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-md)', minWidth: 180 }}
          >
            <button onClick={() => { onExport(); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors" style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              Exportar dados (JSON)
            </button>
            <button onClick={() => { fileInputRef.current?.click(); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors" style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              Importar dados (JSON)
            </button>
            <div className="h-px mx-2 my-1" style={{ background: 'var(--border-subtle)' }} />
            <button onClick={() => { navigate('/plans'); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <CreditCard className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /> Planos
            </button>
            <button onClick={() => { setShowServiceTags(true); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Tag className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /> Tipos de trabalho
            </button>
            <button onClick={() => { setShowHowToUse(true); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <HelpCircle className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /> Como usar
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = '';
        }} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Renomear', onClick: () => startRename(contextMenu.projectId) },
            { label: 'Membros', onClick: () => setProjectMembersModal(contextMenu.projectId) },
            { label: 'Duplicar', onClick: () => setDuplicateDialog(contextMenu.projectId) },
            { label: 'Mudar cor', onClick: () => setColorPicker({ projectId: contextMenu.projectId, x: contextMenu.x, y: contextMenu.y }) },
            { label: 'Excluir', danger: true, onClick: () => { onDeleteProject(contextMenu.projectId); } },
          ]}
        />
      )}

      {/* Section context menu */}
      {sectionContextMenu && (
        <ContextMenu
          position={{ x: sectionContextMenu.x, y: sectionContextMenu.y }}
          onClose={() => setSectionContextMenu(null)}
          items={[
            {
              label: 'Renomear',
              onClick: () => {
                const section = allSections.find(s => s.id === sectionContextMenu.sectionId);
                if (section) {
                  setRenamingSectionId(section.id);
                  setRenameSectionValue(section.title);
                  setTimeout(() => sectionRenameRef.current?.focus(), 0);
                }
              },
            },
            {
              label: 'Excluir',
              danger: true,
              onClick: () => {
                onDeleteSection?.(sectionContextMenu.sectionId);
              },
            },
          ]}
        />
      )}

      {colorPicker && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setColorPicker(null)} />
          <div className="fixed z-[100] p-2.5 rounded-lg border flex gap-2" style={{ left: colorPicker.x, top: colorPicker.y, background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}>
            {PROJECT_COLORS.map(color => (
              <button key={color} onClick={() => { onChangeColor(colorPicker.projectId, color); setColorPicker(null); }}
                className="w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform"
                style={{ background: color, borderColor: projects.find(p => p.id === colorPicker.projectId)?.color === color ? 'white' : 'transparent' }}
              />
            ))}
          </div>
        </>
      )}

      {/* Duplicate dialog */}
      {duplicateDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--overlay-bg)' }}>
          <div className="rounded-xl border p-5 w-[320px]" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-lg)' }}>
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Duplicar Cliente</h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)' }}>O que deseja duplicar?</p>
            <div className="flex flex-col gap-2">
              {([
                { mode: 'sections' as const, label: 'Apenas Seções' },
                { mode: 'tasks' as const, label: 'Apenas Tarefas (sem seções)' },
                { mode: 'both' as const, label: 'Seções e Tarefas' },
              ]).map(({ mode, label }) => (
                <button key={mode} onClick={async () => { const id = duplicateDialog; setDuplicateDialog(null); const newId = await onDuplicateProject(id, mode); onSelectProject(newId); }}
                  className="w-full h-9 px-3 text-left text-[13px] rounded-md border transition-colors"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setDuplicateDialog(null)} className="w-full mt-3 h-8 text-[13px] transition-colors" style={{ color: 'var(--text-tertiary)' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Project members modal */}
      {projectMembersModal && onAddProjectMember && onRemoveProjectMember && getProjectMembers && (
        <ProjectMembersModal
          projectId={projectMembersModal}
          projectName={projects.find(p => p.id === projectMembersModal)?.name || ''}
          workspaceMembers={workspaceMembers}
          projectMembers={getProjectMembers(projectMembersModal)}
          onAdd={onAddProjectMember}
          onRemove={onRemoveProjectMember}
          onClose={() => setProjectMembersModal(null)}
        />
      )}

      <HowToUseModal isOpen={showHowToUse} onClose={() => setShowHowToUse(false)} />

      {showServiceTags && onCreateServiceTag && onRenameServiceTag && onChangeServiceTagIcon && onDeleteServiceTag && (
        <ServiceTagsManager tags={serviceTags} onAdd={onCreateServiceTag} onRename={onRenameServiceTag} onChangeIcon={onChangeServiceTagIcon} onDelete={onDeleteServiceTag} onClose={() => setShowServiceTags(false)} />
      )}
    </aside>
  );
}
