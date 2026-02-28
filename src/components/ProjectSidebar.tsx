import { useState, useRef, useMemo, useEffect } from 'react';
import { GripVertical, Settings, LogOut, Sun, Moon, Monitor, CalendarDays, Users, Shield, HelpCircle, Tag, CreditCard, User, ChevronRight, StickyNote } from 'lucide-react';
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
  onSelect,
  onSelectSection,
  onToggleExpand,
  onContextMenu,
  onColorClick,
}: {
  project: Project;
  isActive: boolean;
  isExpanded: boolean;
  sections: Section[];
  tasks: Task[];
  activeSectionId?: string | null;
  onSelect: () => void;
  onSelectSection?: (sectionId: string) => void;
  onToggleExpand: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onColorClick: (e: React.MouseEvent) => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="group w-full flex items-center gap-1.5 cursor-pointer relative select-none"
        onContextMenu={onContextMenu}
        style={{
          height: 40,
          paddingLeft: 6,
          paddingRight: 10,
          borderRadius: 8,
          color: isActive ? '#E5E5E5' : '#8A8A8A',
          fontWeight: isActive ? 500 : 400,
          fontSize: 14,
          transition: `color 150ms ease-out, background 150ms ease-out`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" style={{ color: '#555570' }} />
        </div>
        {/* Chevron */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          style={{ marginLeft: 4 }}
        >
          <ChevronRight
            className="w-3 h-3 transition-transform"
            style={{
              color: '#555570',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 150ms ease-out',
            }}
          />
        </button>
        {/* Color dot — 6px */}
        <button
          onClick={(e) => { e.stopPropagation(); onColorClick(e); }}
          className="flex-shrink-0 hover:scale-125 transition-transform"
          style={{ width: 6, height: 6, borderRadius: '50%', background: project.color }}
        />
        <span className="truncate flex-1 text-left" onClick={onSelect}>{project.name}</span>
      </div>

      {/* Expandable sections */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: isExpanded ? `${sections.length * 32 + 4}px` : '0px',
          opacity: isExpanded ? 1 : 0,
          transition: 'max-height 150ms ease-out, opacity 150ms ease-out',
        }}
      >
        {sections.map(section => {
          const sectionTasks = tasks.filter(t => t.section === section.id && !t.parentTaskId);
          const doneTasks = sectionTasks.filter(t => t.status === 'done').length;
          const totalTasks = sectionTasks.length;
          const isSectionActive = activeSectionId === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSelectSection?.(section.id)}
              className="w-full flex items-center gap-2 select-none"
              style={{
                height: 30,
                paddingLeft: 32,
                paddingRight: 10,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 400,
                color: isSectionActive ? '#E5E5E5' : '#8A8A8A',
                transition: `color 150ms ease-out, background 150ms ease-out`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; if (!isSectionActive) e.currentTarget.style.color = '#E5E5E5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (!isSectionActive) e.currentTarget.style.color = '#8A8A8A'; }}
            >
              <span className="truncate flex-1 text-left">{section.title}</span>
              {totalTasks > 0 && (
                <span className="text-[11px] tabular-nums flex-shrink-0" style={{ color: '#6B7280' }}>
                  {doneTasks}/{totalTasks}
                </span>
              )}
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
}

export function ProjectSidebar({
  projects, sections: allSections = [], activeProjectId, activeSectionId, onSelectProject, onSelectSection,
  onCreateProject, onRenameProject, onDeleteProject,
  onChangeColor, onReorderProjects, onDuplicateProject, onExport, onImport, onLogout,
  isMyDayView, onToggleMyDay, isMyTasksView, onToggleMyTasks, isMyWeekView, onToggleMyWeek,
  isNotesView, onToggleNotes,
  tasks = [], workspaces = [], activeWorkspaceId, workspaceMembers = [],
  onSwitchWorkspace, onInviteToWorkspace, onCreateWorkspace, onRenameWorkspace, onDeleteWorkspace,
  onAcceptInvite, onGenerateInviteLink, onAddProjectMember, onRemoveProjectMember, getProjectMembers,
  isSuperAdmin, serviceTags = [], onCreateServiceTag, onRenameServiceTag, onChangeServiceTagIcon, onDeleteServiceTag,
  onCycleTheme, themePreference,
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
  // Default: collapsed. Active project auto-expands.
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    const stored = loadExpandedProjects();
    // If nothing stored, all collapsed by default
    return stored;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand active project
  useEffect(() => {
    if (activeProjectId && !isMyDayView && !isMyWeekView && !isMyTasksView && !isNotesView) {
      setExpandedProjects(prev => {
        if (prev[activeProjectId]) return prev;
        const next = { ...prev, [activeProjectId]: true };
        localStorage.setItem(SIDEBAR_EXPANSION_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, [activeProjectId, isMyDayView, isMyWeekView, isMyTasksView, isNotesView]);

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = { ...prev, [projectId]: !prev[projectId] };
      localStorage.setItem(SIDEBAR_EXPANSION_KEY, JSON.stringify(next));
      return next;
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const todayStr = new Date().toISOString().slice(0, 10);
  const dayCount = useMemo(() => tasks.filter(t => t.status !== 'done' && t.dueDate === todayStr).length, [tasks, todayStr]);
  const weekCount = useMemo(() => {
    const end = new Date(); end.setDate(end.getDate() + 7);
    const endStr = end.toISOString().slice(0, 10);
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
        height: 40,
        paddingLeft: 10,
        paddingRight: 10,
        borderRadius: 8,
        fontSize: 14,
        color: active ? '#E5E5E5' : '#8A8A8A',
        fontWeight: active ? 600 : 400,
        transition: `color 150ms ease-out, background 150ms ease-out`,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#E5E5E5' : '#8A8A8A', transition: `color 150ms ease-out` }} />
      <span className="truncate flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] tabular-nums flex-shrink-0" style={{ color: '#6B7280', fontWeight: 400 }}>{count}</span>
      )}
    </button>
  );

  return (
    <aside className="h-screen flex flex-col z-30 sticky top-0" style={{ background: '#111111', width: 260 }}>
      <nav className="flex-1 px-2 pt-3 overflow-y-auto">
        {/* Navigation section */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#555570', letterSpacing: 1.2, paddingLeft: 10, textTransform: 'uppercase' }}>
            Navegação
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <NavButton active={!!isMyDayView} onClick={onToggleMyDay} icon={Sun} label="Meu Dia" count={dayCount} />
          <NavButton active={!!isMyWeekView} onClick={onToggleMyWeek} icon={CalendarDays} label="Minha Semana" count={weekCount} />
          <NavButton active={!!isNotesView} onClick={onToggleNotes} icon={StickyNote} label="Notas" />
        </div>

        {/* Separator */}
        <div style={{ margin: '12px 0' }}>
          <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.06)' }} />
        </div>

        {/* Clients section */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#555570', letterSpacing: 1.2, paddingLeft: 10, textTransform: 'uppercase' }}>
            Clientes
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                      style={{ background: '#1A1A1A', color: '#E5E5E5', borderColor: '#6C9CFC' }}
                    />
                  </div>
                ) : (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    isActive={activeProjectId === project.id && !isMyDayView && !isMyWeekView && !isMyTasksView && !isNotesView}
                    isExpanded={!!expandedProjects[project.id]}
                    sections={allSections.filter(s => s.projectId === project.id)}
                    tasks={tasks}
                    activeSectionId={activeSectionId}
                    onSelect={() => onSelectProject(project.id)}
                    onSelectSection={onSelectSection}
                    onToggleExpand={() => toggleProjectExpand(project.id)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ projectId: project.id, x: e.clientX, y: e.clientY }); }}
                    onColorClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setColorPicker({ projectId: project.id, x: rect.right + 8, y: rect.top }); }}
                  />
                )
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* New client */}
        {creatingProject ? (
          <div className="flex items-center" style={{ height: 40, paddingLeft: 10, paddingRight: 10 }}>
            <input
              ref={inputRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreatingProject(false); setNewProjectName(''); } }}
              onBlur={() => { if (newProjectName.trim()) handleCreate(); else setCreatingProject(false); }}
              autoFocus
              placeholder="Nome do cliente..."
              className="w-full h-7 px-2 text-[13px] rounded-md border focus:outline-none"
              style={{ background: '#1A1A1A', color: '#E5E5E5', borderColor: '#6C9CFC' }}
            />
          </div>
        ) : (
          <button
            onClick={() => { setCreatingProject(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="w-full flex items-center text-[12px] select-none"
            style={{
              height: 36,
              paddingLeft: 10,
              paddingRight: 10,
              color: '#555570',
              fontWeight: 400,
              borderRadius: 8,
              transition: `color 150ms ease-out`,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#8A8A8A'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555570'; }}
          >
            + Novo Cliente
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="relative" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
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

          {isSuperAdmin && (
            <a href="/admin" className="w-7 h-7 flex items-center justify-center rounded-md" title="Admin"
              style={{ opacity: 0.4, color: '#E5E5E5', transition: 'opacity 150ms ease-out' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
            ><Shield className="w-3.5 h-3.5" /></a>
          )}
          <button onClick={() => navigate('/profile')} className="w-7 h-7 flex items-center justify-center rounded-md" title="Perfil"
            style={{ opacity: 0.4, color: '#E5E5E5', transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          ><User className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowSettings(!showSettings)} className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ opacity: 0.4, color: '#E5E5E5', transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          ><Settings className="w-3.5 h-3.5" /></button>
          <button onClick={onLogout} className="w-7 h-7 flex items-center justify-center rounded-md" title="Sair da conta"
            style={{ opacity: 0.4, color: '#E5E5E5', transition: 'opacity 150ms ease-out' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          ><LogOut className="w-3.5 h-3.5" /></button>
        </div>

        {showSettings && (
          <div className="absolute bottom-full left-3 mb-1 py-1 rounded-lg border z-[100]"
            style={{ background: '#1A1A1A', borderColor: 'rgba(255, 255, 255, 0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', minWidth: 180 }}
          >
            <button onClick={() => { onExport(); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors" style={{ color: '#E5E5E5' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              Exportar dados (JSON)
            </button>
            <button onClick={() => { fileInputRef.current?.click(); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors" style={{ color: '#E5E5E5' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              Importar dados (JSON)
            </button>
            <div className="h-px mx-2 my-1" style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
            <button onClick={() => { navigate('/plans'); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: '#E5E5E5' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <CreditCard className="w-3.5 h-3.5" style={{ color: '#6B7280' }} /> Planos
            </button>
            <button onClick={() => { setShowServiceTags(true); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: '#E5E5E5' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Tag className="w-3.5 h-3.5" style={{ color: '#6B7280' }} /> Tipos de trabalho
            </button>
            {onCycleTheme && (
              <button onClick={() => { onCycleTheme(); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: '#E5E5E5' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                {themePreference === 'dark' ? <Moon className="w-3.5 h-3.5" style={{ color: '#6B7280' }} /> :
                 themePreference === 'light' ? <Sun className="w-3.5 h-3.5" style={{ color: '#6B7280' }} /> :
                 <Monitor className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />}
                {themePreference === 'dark' ? 'Tema: Escuro' : themePreference === 'light' ? 'Tema: Claro' : 'Tema: Sistema'}
              </button>
            )}
            <button onClick={() => { setShowHowToUse(true); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: '#E5E5E5' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <HelpCircle className="w-3.5 h-3.5" style={{ color: '#6B7280' }} /> Como usar
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && window.confirm('Isso irá substituir todos os dados atuais. Continuar?')) onImport(file);
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
            { label: 'Excluir', danger: true, onClick: () => { if (window.confirm('Excluir este cliente e todas as suas tarefas?')) onDeleteProject(contextMenu.projectId); } },
          ]}
        />
      )}

      {/* Color picker */}
      {colorPicker && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setColorPicker(null)} />
          <div className="fixed z-[100] p-2.5 rounded-lg border flex gap-2" style={{ left: colorPicker.x, top: colorPicker.y, background: '#1A1A1A', borderColor: 'rgba(255, 255, 255, 0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl border p-5 w-[320px]" style={{ background: '#1A1A1A', borderColor: 'rgba(255, 255, 255, 0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: '#E5E5E5' }}>Duplicar Cliente</h3>
            <p className="text-[13px] mb-4" style={{ color: '#8A8A8A' }}>O que deseja duplicar?</p>
            <div className="flex flex-col gap-2">
              {([
                { mode: 'sections' as const, label: 'Apenas Seções' },
                { mode: 'tasks' as const, label: 'Apenas Tarefas (sem seções)' },
                { mode: 'both' as const, label: 'Seções e Tarefas' },
              ]).map(({ mode, label }) => (
                <button key={mode} onClick={async () => { const id = duplicateDialog; setDuplicateDialog(null); const newId = await onDuplicateProject(id, mode); onSelectProject(newId); }}
                  className="w-full h-9 px-3 text-left text-[13px] rounded-md border transition-colors"
                  style={{ color: '#E5E5E5', borderColor: 'rgba(255, 255, 255, 0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1F1F1F'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setDuplicateDialog(null)} className="w-full mt-3 h-8 text-[13px] transition-colors" style={{ color: '#6B7280' }}>Cancelar</button>
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
