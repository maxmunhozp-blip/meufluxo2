import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { GripVertical, Settings, LogOut, Sun, Moon, Monitor, CalendarDays, Users, Shield, HelpCircle, Tag, CreditCard, User, ChevronRight, StickyNote, PanelLeftClose, PanelLeft, Type, Pencil } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import meufluxoXDark from '@/assets/meufluxo-x-dark.svg';

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
       className="group w-full flex items-center gap-2 cursor-pointer relative select-none sidebar-hover-item"
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
          color: isActive ? 'var(--sidebar-text-primary, var(--text-primary))' : 'var(--sidebar-text-tertiary, var(--text-secondary))',
          fontWeight: isActive ? 500 : 400,
          fontSize: 14,
          transition: 'all 150ms ease-out',
          transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
        }}
        onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-elevated))'; }}
        onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.background = isDragOver ? 'var(--accent-subtle)' : 'transparent'; }}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--sidebar-text-placeholder, var(--text-placeholder))' }} />
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
              color: 'var(--sidebar-text-tertiary, var(--text-tertiary))',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease-out',
            }}
          />
        </button>
        {/* Color dot — 6px with 8px margin-right */}
        <button
          onClick={(e) => { e.stopPropagation(); onColorClick(e); }}
          className="flex-shrink-0 hover:scale-125 transition-transform"
          style={{ width: 6, height: 6, borderRadius: '50%', background: project.color, marginRight: 4, opacity: 'var(--project-dot-opacity, 1)' as any }}
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
                color: isSectionDragOver ? 'var(--accent-blue)' : isSectionActive ? 'var(--sidebar-text-primary, var(--text-primary))' : 'var(--sidebar-text-tertiary, var(--text-secondary))',
                border: isSectionDragOver
                  ? '2px solid var(--accent-blue)'
                  : showSectionHint
                    ? '1px dashed var(--sidebar-text-placeholder, var(--text-placeholder))'
                    : '2px solid transparent',
                background: isSectionDragOver ? 'var(--accent-subtle)' : undefined,
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={e => { if (!isSectionDragOver) { e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-elevated))'; if (!isSectionActive) e.currentTarget.style.color = 'var(--sidebar-text-primary, var(--text-primary))'; } }}
              onMouseLeave={e => { if (!isSectionDragOver) { e.currentTarget.style.background = isSectionDragOver ? 'var(--accent-subtle)' : 'transparent'; if (!isSectionActive) e.currentTarget.style.color = 'var(--sidebar-text-tertiary, var(--text-secondary))'; } }}
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
  onCreateWorkspace?: (name: string, clientsLabel?: string) => Promise<string>;
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
  themePreference?: 'dark' | 'light' | 'light-contrast';
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
  onAddSection?: (projectId: string) => void;
  onUpdateClientsLabel?: (id: string, label: string) => Promise<void>;
  sidebarWidth?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
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
  collapsed, onToggleCollapse, onOpenSearch, onAddSection, onUpdateClientsLabel,
  sidebarWidth = 260, onResizeStart,
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
  const [showClientsLabelEditor, setShowClientsLabelEditor] = useState(false);
  const [editingClientsLabel, setEditingClientsLabel] = useState('');
  const [showWsRenameEditor, setShowWsRenameEditor] = useState(false);
  const [editingWsName, setEditingWsName] = useState('');
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
        color: active ? 'var(--accent-blue)' : 'var(--sidebar-text-tertiary, var(--text-secondary))',
        background: active ? 'var(--accent-subtle)' : 'transparent',
        transition: 'all 150ms ease-out',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-elevated))'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? 'var(--accent-blue)' : 'var(--sidebar-text-tertiary, var(--text-secondary))', transition: 'color 150ms ease-out' }} />
      <span className="truncate flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: active ? 'var(--accent-blue)' : 'var(--sidebar-text-tertiary, var(--text-tertiary))', fontWeight: 400 }}>{count}</span>
      )}
    </button>
  );

  // All logo variants — preloaded, toggled by visibility (no flash on theme switch)
  const activeLogoSrc = themePreference === 'light-contrast'
    ? '/meufluxo-logo-blue-bg.svg'
    : themePreference === 'dark'
      ? '/meufluxo-logo-dark.svg'
      : '/meufluxo-logo.svg';

  // Shine on click, theme change, and page load
  const [shineActive, setShineActive] = useState(false);
  const shineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerShine = useCallback(() => {
    setShineActive(false);
    if (shineTimerRef.current) clearTimeout(shineTimerRef.current);
    requestAnimationFrame(() => {
      setShineActive(true);
      shineTimerRef.current = setTimeout(() => setShineActive(false), 1600);
    });
  }, []);

  // Trigger on page load
  const shineLoadedRef = useRef(false);
  useEffect(() => {
    if (shineLoadedRef.current) return;
    shineLoadedRef.current = true;
    const t = setTimeout(triggerShine, 500);
    return () => clearTimeout(t);
  }, [triggerShine]);

  // Trigger on theme change
  const prevThemeRef = useRef(themePreference);
  useEffect(() => {
    if (prevThemeRef.current !== themePreference) {
      prevThemeRef.current = themePreference;
      const t = setTimeout(triggerShine, 400);
      return () => clearTimeout(t);
    }
  }, [themePreference, triggerShine]);

  // Unified sidebar — no mount/unmount, just CSS transitions
  const visualWidth = collapsed ? 48 : sidebarWidth;
  const widthTransition = 'width 350ms cubic-bezier(0.25, 0.1, 0.25, 1), min-width 350ms cubic-bezier(0.25, 0.1, 0.25, 1), max-width 350ms cubic-bezier(0.25, 0.1, 0.25, 1)';
  const contentTransition = 'opacity 250ms ease-out, transform 250ms ease-out';


  // No early return for collapsed — unified sidebar below

  // Golden ratio: φ ≈ 1.618 — brand header ~38.2% of top zone, nav ~61.8%
  return (
    <aside
      className="h-screen flex flex-col z-30 sticky top-0 overflow-hidden sidebar-container relative"
      style={{
        width: visualWidth, minWidth: visualWidth, maxWidth: visualWidth,
        transition: widthTransition,
        background: 'hsl(var(--sidebar-background))',
        borderRight: '1px solid var(--sidebar-right-border, transparent)',
        borderRadius: 'var(--sidebar-container-radius, 0)',
      }}
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
      {/* Resize handle — right edge, draggable */}
      <div
        className="sidebar-resize-handle"
        title="Arrastar para redimensionar"
        onMouseDown={(e) => onResizeStart?.(e)}
      />
      {/* BRAND HEADER — unified: both X icon and full logo always in DOM */}
      <div style={{ flexShrink: 0, padding: collapsed ? '28px 4px 0 4px' : '28px 16px 0 16px', transition: 'padding 350ms cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
        <div style={{ marginBottom: collapsed ? 8 : 24, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', paddingLeft: collapsed ? 0 : 12, transition: 'margin-bottom 350ms cubic-bezier(0.25, 0.1, 0.25, 1), padding-left 350ms cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
          {/* X icon — visible when collapsed */}
          <button
            onClick={collapsed ? onToggleCollapse : () => { triggerShine(); onToggleMyDay?.(); }}
            className="flex items-center justify-center"
            title={collapsed ? 'Expandir menu' : 'Meu Dia'}
            style={{ 
              width: collapsed ? 36 : 0, 
              height: collapsed ? 36 : 0,
              overflow: 'hidden',
              opacity: collapsed ? 1 : 0,
              transform: collapsed ? 'scale(1)' : 'scale(0)',
              transition: 'width 350ms cubic-bezier(0.25, 0.1, 0.25, 1), height 350ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 300ms ease-out, transform 300ms ease-out',
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <img
              src={themePreference === 'dark' ? meufluxoXDark : themePreference === 'light' ? '/meufluxo-x-light.png' : '/meufluxo-icon.svg'}
              alt="MeuFluxo"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
          </button>
          {/* Full logo — visible when expanded */}
          <div
            className="logo-shine-wrapper"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 120,
              height: collapsed ? 0 : 20,
              overflow: 'hidden',
              transform: collapsed ? 'scale(0.5)' : 'scale(1)',
              transformOrigin: 'left center',
              transition: 'opacity 300ms ease-out, width 350ms cubic-bezier(0.25, 0.1, 0.25, 1), height 350ms cubic-bezier(0.25, 0.1, 0.25, 1), transform 300ms ease-out',
              flexShrink: 0,
            }}
            onClick={() => { triggerShine(); onToggleMyDay?.(); }}
          >
            <div style={{ height: 20, width: 120, position: 'relative' }}>
              {(['light', 'dark', 'light-contrast'] as const).map(t => {
                const src = t === 'light-contrast' ? '/meufluxo-logo-blue-bg.svg' : t === 'dark' ? '/meufluxo-logo-dark.svg' : '/meufluxo-logo.svg';
                return (
                  <img
                    key={t}
                    src={src}
                    alt="MeuFluxo"
                    style={{
                      height: 20,
                      objectFit: 'contain',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      opacity: src === activeLogoSrc ? 1 : 0,
                      pointerEvents: src === activeLogoSrc ? 'auto' : 'none',
                      transition: 'opacity 250ms ease-out',
                    }}
                  />
                );
              })}
              <div
                className={`logo-shine-overlay ${shineActive ? 'shine-active' : ''}`}
                style={{
                  maskImage: `url(${activeLogoSrc})`,
                  WebkitMaskImage: `url(${activeLogoSrc})`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'left center',
                  WebkitMaskPosition: 'left center',
                }}
              />
            </div>
          </div>
          {/* Collapse button — only when expanded */}
          {onToggleCollapse && !collapsed && (
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 flex items-center justify-center rounded-md group/collapse"
              title="Recolher menu"
              style={{ color: 'var(--sidebar-text-tertiary, hsl(var(--sidebar-label)))', transition: 'all 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--sidebar-text-primary, hsl(var(--sidebar-foreground)))'; e.currentTarget.style.background = 'hsl(var(--sidebar-accent))'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--sidebar-text-tertiary, hsl(var(--sidebar-label)))'; e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Apple Finder-style sidebar toggle: 3 horizontal lines with varying widths */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="3.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
                <rect x="2" y="7.25" width="9" height="1.5" rx="0.75" fill="currentColor" />
                <rect x="2" y="11" width="6" height="1.5" rx="0.75" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>

        {/* NAV — hidden when collapsed via overflow + height */}
        <div style={{ 
          display: 'flex', flexDirection: 'column', gap: 4,
          opacity: collapsed ? 0 : 1,
          maxHeight: collapsed ? 0 : 200,
          overflow: 'hidden',
          transition: 'opacity 200ms ease-out, max-height 350ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}>
          <NavButton active={!!isMyDayView} onClick={onToggleMyDay} icon={Sun} label="Meu Dia" count={dayCount} />
          <NavButton active={!!isMyWeekView} onClick={onToggleMyWeek} icon={CalendarDays} label="Minha Semana" />
          <NavButton active={!!isNotesView} onClick={onToggleNotes} icon={StickyNote} label="Notas" />
        </div>

        {/* Separator */}
        <div style={{ margin: collapsed ? '0' : '16px 0 12px 0', height: collapsed ? 0 : 'auto', overflow: 'hidden', transition: 'margin 350ms cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
          <div style={{ height: 1, background: 'hsl(var(--sidebar-separator))' }} />
        </div>

        {/* Collapsed nav icons — only visible when collapsed */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          opacity: collapsed ? 1 : 0,
          maxHeight: collapsed ? 500 : 0,
          overflow: 'hidden',
          transition: 'opacity 250ms ease-out 100ms, max-height 350ms cubic-bezier(0.25, 0.1, 0.25, 1)',
          padding: collapsed ? '0 2px' : '0',
        }}>
          <div className="w-5 h-px my-1" style={{ background: 'hsl(var(--sidebar-separator))' }} />
          <button onClick={onToggleMyDay} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors" title="Meu Dia"
            style={{ color: isMyDayView ? 'hsl(var(--sidebar-primary))' : 'var(--sidebar-text-secondary, var(--text-secondary))', background: isMyDayView ? 'hsl(var(--sidebar-accent))' : 'transparent' }}
            onMouseEnter={e => { if (!isMyDayView) { e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-hover))'; e.currentTarget.style.color = 'var(--sidebar-text-primary, var(--text-primary))'; } }}
            onMouseLeave={e => { if (!isMyDayView) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text-secondary, var(--text-secondary))'; } }}
          ><Sun className="w-4 h-4" /></button>
          <button onClick={onToggleMyWeek} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors" title="Minha Semana"
            style={{ color: isMyWeekView ? 'hsl(var(--sidebar-primary))' : 'var(--sidebar-text-secondary, var(--text-secondary))', background: isMyWeekView ? 'hsl(var(--sidebar-accent))' : 'transparent' }}
            onMouseEnter={e => { if (!isMyWeekView) { e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-hover))'; e.currentTarget.style.color = 'var(--sidebar-text-primary, var(--text-primary))'; } }}
            onMouseLeave={e => { if (!isMyWeekView) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text-secondary, var(--text-secondary))'; } }}
          ><CalendarDays className="w-4 h-4" /></button>
          <button onClick={onToggleNotes} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors" title="Notas"
            style={{ color: isNotesView ? 'hsl(var(--sidebar-primary))' : 'var(--sidebar-text-secondary, var(--text-secondary))', background: isNotesView ? 'hsl(var(--sidebar-accent))' : 'transparent' }}
            onMouseEnter={e => { if (!isNotesView) { e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-hover))'; e.currentTarget.style.color = 'var(--sidebar-text-primary, var(--text-primary))'; } }}
            onMouseLeave={e => { if (!isNotesView) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text-secondary, var(--text-secondary))'; } }}
          ><StickyNote className="w-4 h-4" /></button>
          <div className="w-5 h-px my-1" style={{ background: 'hsl(var(--sidebar-separator, var(--border)))' }} />
          {/* Project dots */}
          <TooltipProvider delayDuration={200}>
            {projects.map(p => {
              const isActive = activeProjectId === p.id && !isMyDayView && !isMyWeekView && !isMyTasksView && !isNotesView;
              return (
                <Tooltip key={p.id}>
                  <TooltipTrigger asChild>
                    <button onClick={() => onSelectProject(p.id)} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
                      style={{ background: isActive ? 'hsl(var(--sidebar-accent))' : 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-hover))'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'hsl(var(--sidebar-accent))' : 'transparent'; }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color, opacity: 'var(--project-dot-opacity, 1)' as any }} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="border-0 px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--bg-elevated, hsl(var(--popover)))', color: 'var(--text-primary, hsl(var(--popover-foreground)))', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', borderLeft: `3px solid ${p.color}` }}
                  >{p.name}</TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
      </div>

      {/* CLIENTES — flex: 1, hidden when collapsed */}
      <div className="flex-1 overflow-y-auto sidebar-scroll" style={{ 
        padding: collapsed ? '0' : '0 16px 8px 16px',
        opacity: collapsed ? 0 : 1,
        pointerEvents: collapsed ? 'none' : 'auto',
        transition: 'opacity 200ms ease-out, padding 350ms cubic-bezier(0.25, 0.1, 0.25, 1)',
      }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sidebar-text-tertiary, var(--text-tertiary))', letterSpacing: 1, lineHeight: 1.3, textTransform: 'uppercase' as const }}>
            {(workspaces.find(w => w.id === activeWorkspaceId) as any)?.clientsLabel || 'Clientes'}
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map((project) => (
                renamingId === project.id ? (
                  <div key={project.id} className="flex items-center gap-2.5" style={{ height: 40, paddingLeft: 10, paddingRight: 10 }}>
                    <span className="flex-shrink-0" style={{ width: 6, height: 6, borderRadius: '50%', background: project.color, opacity: 'var(--project-dot-opacity, 1)' as any }} />
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

      {/* BOTTOM ZONE — sticky, with proper padding */}
      <div style={{ flexShrink: 0, padding: '0 16px 16px 16px' }}>
        <div style={{ height: 1, background: 'hsl(var(--sidebar-separator))', marginBottom: 8 }} />
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
              style={{ background: 'var(--sidebar-input-bg, var(--bg-input))', color: 'var(--sidebar-text-primary, var(--text-primary))', borderColor: 'var(--sidebar-input-border, var(--border-focus))' }}
            />
          </div>
        ) : (
          <button
            onClick={() => { setCreatingProject(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="w-full flex items-center select-none"
            style={{
              height: 32,
              fontSize: 13,
              color: 'var(--sidebar-text-tertiary, var(--text-tertiary))',
              fontWeight: 400,
              transition: 'all 150ms ease-out',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--sidebar-text-secondary, var(--text-secondary))'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--sidebar-text-tertiary, var(--text-tertiary))'; }}
          >
            + {(() => {
              const label = (workspaces.find(w => w.id === activeWorkspaceId) as any)?.clientsLabel || 'Clientes';
              // Singularize: remove trailing 's' for Portuguese plural, or use as-is
              const singular = label.endsWith('s') && label.length > 1 ? label.slice(0, -1) : label;
              return `Nov${singular.match(/[aã]$/i) ? 'a' : 'o'} ${singular}`;
            })()}
          </button>
        )}
        {/* Search — tone-on-tone with sidebar */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 select-none"
          style={{
            opacity: 'var(--search-btn-opacity, 1)' as any,
            height: 30,
            paddingLeft: 10,
            paddingRight: 10,
            marginTop: 4,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 400,
            color: 'var(--sidebar-input-text, var(--text-placeholder))',
            background: 'var(--sidebar-input-bg, var(--bg-elevated))',
            border: '1px solid var(--sidebar-input-border, transparent)',
            transition: 'all 150ms ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--sidebar-accent))'; e.currentTarget.style.color = 'var(--sidebar-text-secondary, var(--text-tertiary))'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sidebar-input-border, transparent)'; e.currentTarget.style.color = 'var(--sidebar-input-text, var(--text-placeholder))'; }}
        >
          <Search style={{ width: 13, height: 13, flexShrink: 0, opacity: 0.5 }} />
          <span className="flex-1 text-left truncate">Buscar</span>
        </button>
      </div>

      {/* FOOTER — workspace & actions (hidden when collapsed) */}
      <div className="relative" style={{ flexShrink: 0, padding: '0 4px', opacity: collapsed ? 0 : 1, maxHeight: collapsed ? 0 : 200, overflow: collapsed ? 'hidden' : 'visible', pointerEvents: collapsed ? 'none' : 'auto', transition: 'opacity 200ms ease-out, max-height 350ms cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
        <div style={{ height: 1, background: 'hsl(var(--sidebar-separator))', margin: '0 12px' }} />
        <div className="py-2.5 flex items-center gap-1" style={{ paddingLeft: 12, paddingRight: 8 }}>
          <div style={{ opacity: 0.5, transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
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
              title={themePreference === 'dark' ? 'Escuro' : themePreference === 'light' ? 'Claro' : 'Contraste'}
              style={{ color: 'var(--sidebar-text-tertiary, var(--text-tertiary))', transition: 'all 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--sidebar-text-primary, var(--text-primary))'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--sidebar-text-tertiary, var(--text-tertiary))'; }}
            >
              {themePreference === 'dark' ? <Moon className="w-4 h-4" strokeWidth={1.5} /> :
               themePreference === 'light' ? <Sun className="w-4 h-4" strokeWidth={1.5} /> :
               <PanelLeft className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          )}

          {isSuperAdmin && (
            <a href="/admin" className="w-7 h-7 flex items-center justify-center rounded-md" title="Admin"
              style={{ opacity: 0.4, color: 'var(--sidebar-text-primary, var(--text-primary))', transition: 'opacity 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
            ><Shield className="w-3.5 h-3.5" /></a>
          )}
          <button onClick={() => navigate('/profile')} className="w-7 h-7 flex items-center justify-center rounded-md" title="Perfil"
            style={{ opacity: 0.4, color: 'var(--sidebar-text-primary, var(--text-primary))', transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          ><User className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowSettings(!showSettings)} className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ opacity: 0.4, color: 'var(--sidebar-text-primary, var(--text-primary))', transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          ><Settings className="w-3.5 h-3.5" /></button>
          <button onClick={onLogout} className="w-7 h-7 flex items-center justify-center rounded-md" title="Sair da conta"
            style={{ opacity: 0.4, color: 'var(--sidebar-text-primary, var(--text-primary))', transition: 'opacity 150ms ease-out' }}
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
            <div className="h-px mx-2 my-1" style={{ background: 'var(--border-subtle)' }} />
            <button onClick={() => {
              const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
              setEditingClientsLabel((activeWs as any)?.clientsLabel || 'Clientes');
              setShowClientsLabelEditor(true);
              setShowSettings(false);
            }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Type className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /> Título dos projetos
            </button>
            <button onClick={() => {
              const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
              setEditingWsName(activeWs?.name || '');
              setShowWsRenameEditor(true);
              setShowSettings(false);
            }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /> Renomear Workspace
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImport(file);
          e.target.value = '';
        }} />
      </div>

      {/* Collapsed footer — theme + expand (only visible when collapsed) */}
      <div style={{
        marginTop: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 4px 16px',
        opacity: collapsed ? 1 : 0,
        maxHeight: collapsed ? 100 : 0,
        overflow: 'hidden',
        pointerEvents: collapsed ? 'auto' : 'none',
        transition: 'opacity 250ms ease-out 100ms, max-height 350ms cubic-bezier(0.25, 0.1, 0.25, 1)',
      }}>
        {onCycleTheme && (
          <button onClick={onCycleTheme} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            title={themePreference === 'dark' ? 'Escuro' : themePreference === 'light' ? 'Claro' : 'Contraste'}
            style={{ color: 'var(--sidebar-text-secondary, var(--text-secondary))' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-hover))'; e.currentTarget.style.color = 'var(--sidebar-text-primary, var(--text-primary))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text-secondary, var(--text-secondary))'; }}
          >
            {themePreference === 'dark' ? <Moon className="w-4 h-4" strokeWidth={1.5} /> :
             themePreference === 'light' ? <Sun className="w-4 h-4" strokeWidth={1.5} /> :
             <Type className="w-4 h-4" strokeWidth={1.5} />}
          </button>
        )}
        <button onClick={onToggleCollapse} className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
          title="Expandir menu"
          style={{ color: 'var(--sidebar-text-secondary, var(--text-secondary))' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-hover-bg, var(--bg-hover))'; e.currentTarget.style.color = 'var(--sidebar-text-primary, var(--text-primary))'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text-secondary, var(--text-secondary))'; }}
        >
          <PanelLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {showClientsLabelEditor && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--overlay-bg)' }}>
          <div className="rounded-xl border border-border p-5 w-[360px]" style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Título dos projetos</h3>
            <p className="text-[13px] text-muted-foreground mb-4">Como você quer chamar a lista de projetos na sidebar?</p>
            <input
              type="text"
              value={editingClientsLabel}
              onChange={(e) => setEditingClientsLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && activeWorkspaceId && onUpdateClientsLabel) {
                  onUpdateClientsLabel(activeWorkspaceId, editingClientsLabel.trim());
                  setShowClientsLabelEditor(false);
                }
              }}
              placeholder="Ex: Clientes, Projetos, Marcas..."
              autoFocus
              className="w-full h-10 px-3 text-[14px] text-foreground bg-input rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground mb-1"
            />
            <p className="text-[11px] text-muted-foreground mb-3">Deixe em branco para usar "Clientes".</p>
            <div className="flex gap-2">
              <button onClick={() => setShowClientsLabelEditor(false)} className="flex-1 h-9 text-[13px] text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors">Cancelar</button>
              <button
                onClick={() => {
                  if (activeWorkspaceId && onUpdateClientsLabel) {
                    onUpdateClientsLabel(activeWorkspaceId, editingClientsLabel.trim());
                  }
                  setShowClientsLabelEditor(false);
                }}
                className="flex-1 h-9 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >Salvar</button>
            </div>
          </div>
        </div>
      )}
      {/* Workspace rename modal */}
      {showWsRenameEditor && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--overlay-bg)' }}>
          <div className="rounded-xl border border-border p-5 w-[360px]" style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <h3 className="text-[15px] font-semibold text-foreground mb-1">Renomear Workspace</h3>
            <p className="text-[13px] text-muted-foreground mb-4">Digite o novo nome para o workspace.</p>
            <input
              type="text"
              value={editingWsName}
              onChange={(e) => setEditingWsName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && activeWorkspaceId && onRenameWorkspace && editingWsName.trim()) {
                  onRenameWorkspace(activeWorkspaceId, editingWsName.trim());
                  setShowWsRenameEditor(false);
                }
              }}
              placeholder="Nome do workspace"
              autoFocus
              className="w-full h-10 px-3 text-[14px] text-foreground bg-input rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowWsRenameEditor(false)} className="flex-1 h-9 text-[13px] text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors">Cancelar</button>
              <button
                onClick={() => {
                  if (activeWorkspaceId && onRenameWorkspace && editingWsName.trim()) {
                    onRenameWorkspace(activeWorkspaceId, editingWsName.trim());
                  }
                  setShowWsRenameEditor(false);
                }}
                disabled={!editingWsName.trim()}
                className="flex-1 h-9 text-[13px] font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >Salvar</button>
            </div>
          </div>
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Renomear', onClick: () => startRename(contextMenu.projectId) },
            { label: 'Adicionar Seção', onClick: () => { onAddSection?.(contextMenu.projectId); setContextMenu(null); } },
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
          items={(() => {
            const sec = allSections.find(s => s.id === sectionContextMenu.sectionId);
            const isFixed = sec?.isFixed;
            return [
              ...(!isFixed ? [{
                label: 'Renomear',
                onClick: () => {
                  if (sec) {
                    setRenamingSectionId(sec.id);
                    setRenameSectionValue(sec.title);
                    setTimeout(() => sectionRenameRef.current?.focus(), 0);
                  }
                },
              }] : []),
              ...(!isFixed ? [{
                label: 'Excluir',
                danger: true,
                onClick: () => {
                  onDeleteSection?.(sectionContextMenu.sectionId);
                },
              }] : []),
            ];
          })()}
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
