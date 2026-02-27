import { useState, useRef, useMemo } from 'react';
import { GripVertical, Settings, LogOut, Sun, CalendarDays, Users, Shield, HelpCircle, Tag, CreditCard, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Project, Task, ServiceTag } from '@/types/task';
import { ContextMenu } from './ContextMenu';
import { WorkspaceSelector } from './WorkspaceSelector';
import { ProjectMembersModal } from './ProjectMembersModal';
import type { Workspace, WorkspaceMember } from '@/hooks/useSupabaseData';
import { HowToUseModal } from './HowToUseModal';
import { ServiceTagsManager } from './ServiceTagsManager';

export const PROJECT_COLORS = ['#6C9CFC', '#FFB86C', '#FF79C6', '#50FA7B', '#BD93F9', '#8BE9FD', '#F1FA8C'];

interface ProjectSidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
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
  onCreateServiceTag?: (name: string, icon: string) => Promise<void>;
  onRenameServiceTag?: (id: string, name: string) => Promise<void>;
  onChangeServiceTagIcon?: (id: string, icon: string) => Promise<void>;
  onDeleteServiceTag?: (id: string) => Promise<void>;
}

function SortableProjectItem({
  project,
  isActive,
  onSelect,
  onContextMenu,
  onColorClick,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
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
    <div
      ref={setNodeRef}
      className="group w-full flex items-center gap-2.5 rounded-lg text-[14px] cursor-pointer relative"
      onClick={onSelect}
      onContextMenu={onContextMenu}
      style={{
        ...style,
        height: 40,
        paddingLeft: 12,
        paddingRight: 8,
        background: isActive ? '#2A2A42' : undefined,
        borderLeft: isActive ? '2px solid #6C9CFC' : '2px solid transparent',
        borderRadius: 8,
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1E1E30'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" style={{ color: '#8888A0' }} />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onColorClick(e); }}
        className="w-2 h-2 rounded-full flex-shrink-0 hover:scale-150 transition-transform"
        style={{ background: project.color }}
      />
      <span className="truncate" style={{ color: isActive ? '#E8E8F0' : '#8888A0', fontWeight: isActive ? 500 : 400 }}>{project.name}</span>
    </div>
  );
}

export function ProjectSidebar({
  projects, activeProjectId, onSelectProject, onCreateProject, onRenameProject, onDeleteProject,
  onChangeColor, onReorderProjects, onDuplicateProject, onExport, onImport, onLogout,
  isMyDayView, onToggleMyDay, isMyTasksView, onToggleMyTasks, isMyWeekView, onToggleMyWeek,
  tasks = [], workspaces = [], activeWorkspaceId, workspaceMembers = [],
  onSwitchWorkspace, onInviteToWorkspace, onCreateWorkspace, onRenameWorkspace, onDeleteWorkspace,
  onAcceptInvite, onGenerateInviteLink, onAddProjectMember, onRemoveProjectMember, getProjectMembers,
  isSuperAdmin, serviceTags = [], onCreateServiceTag, onRenameServiceTag, onChangeServiceTagIcon, onDeleteServiceTag,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    height: 40,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 8,
    background: active ? '#2A2A42' : undefined,
    borderLeft: active ? '2px solid #6C9CFC' : '2px solid transparent',
  });

  const navHover = (active: boolean) => active ? {} : {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = '#1E1E30'; },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'transparent'; },
  };

  return (
    <aside className="h-screen flex flex-col border-r z-30 sticky top-0" style={{ background: '#0F0F17', borderColor: 'hsl(var(--border))' }}>
      <nav className="flex-1 px-2 pt-3 overflow-y-auto">
        {/* Meu Dia */}
        <button
          onClick={onToggleMyDay}
          className="w-full flex items-center gap-2.5 text-[14px] cursor-pointer"
          style={navBtnStyle(!!isMyDayView)}
          {...navHover(!!isMyDayView)}
        >
          <Sun className="w-4 h-4 flex-shrink-0" style={{ color: isMyDayView ? '#E8E8F0' : '#8888A0' }} />
          <span className="truncate flex-1 text-left" style={{ color: isMyDayView ? '#E8E8F0' : '#8888A0', fontWeight: isMyDayView ? 500 : 400 }}>Meu Dia</span>
          {dayCount > 0 && (
            <span className="text-[10px] font-semibold rounded-full tabular-nums flex items-center justify-center flex-shrink-0"
              style={{ background: '#2A2A42', color: '#6C9CFC', width: 18, height: 18 }}
            >{dayCount}</span>
          )}
        </button>

        <div className="h-1" />

        {/* Minha Semana */}
        <button
          onClick={onToggleMyWeek}
          className="w-full flex items-center gap-2.5 text-[14px] cursor-pointer"
          style={navBtnStyle(!!isMyWeekView)}
          {...navHover(!!isMyWeekView)}
        >
          <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: isMyWeekView ? '#E8E8F0' : '#8888A0' }} />
          <span className="truncate flex-1 text-left" style={{ color: isMyWeekView ? '#E8E8F0' : '#8888A0', fontWeight: isMyWeekView ? 500 : 400 }}>Minha Semana</span>
          {weekCount > 0 && (
            <span className="text-[10px] font-semibold rounded-full tabular-nums flex items-center justify-center flex-shrink-0"
              title={`${weekCount} tarefa${weekCount > 1 ? 's' : ''} agendada${weekCount > 1 ? 's' : ''}`}
              style={{ background: '#2A2A42', color: '#6C9CFC', width: 18, height: 18 }}
            >{weekCount}</span>
          )}
        </button>

        {/* Separator */}
        <div className="h-4" />
        <div className="h-px mx-1" style={{ background: 'hsl(var(--sidebar-separator))' }} />
        <div className="h-4" />

        {/* Projects */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {projects.map((project) => (
                renamingId === project.id ? (
                  <div key={project.id} className="flex items-center gap-2.5 px-3" style={{ height: 40 }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null); }}
                      onBlur={confirmRename}
                      className="flex-1 h-7 px-2 text-[14px] rounded border focus:outline-none"
                      style={{ background: '#1E1E30', color: '#E8E8F0', borderColor: '#6C9CFC' }}
                    />
                  </div>
                ) : (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    isActive={activeProjectId === project.id && !isMyDayView && !isMyWeekView && !isMyTasksView}
                    onSelect={() => onSelectProject(project.id)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ projectId: project.id, x: e.clientX, y: e.clientY }); }}
                    onColorClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); setColorPicker({ projectId: project.id, x: rect.right + 8, y: rect.top }); }}
                  />
                )
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* New project input */}
        {creatingProject ? (
          <div className="flex items-center px-3" style={{ height: 40 }}>
            <input
              ref={inputRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreatingProject(false); setNewProjectName(''); } }}
              onBlur={() => { if (newProjectName.trim()) handleCreate(); else setCreatingProject(false); }}
              autoFocus
              placeholder="Nome do projeto..."
              className="w-full h-7 px-2 text-[14px] rounded-md border focus:outline-none"
              style={{ background: '#1E1E30', color: '#E8E8F0', borderColor: '#6C9CFC' }}
            />
          </div>
        ) : (
          <button
            onClick={() => { setCreatingProject(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="w-full flex items-center px-3 text-[13px] font-medium transition-colors"
            style={{ height: 40, color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
          >
            + Novo Projeto
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t relative" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="px-3 py-2 flex items-center gap-1">
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
          <div className="flex-1" />

          {isSuperAdmin && (
            <a href="/admin" className="w-7 h-7 flex items-center justify-center rounded-md" title="Admin"
              style={{ color: '#8888A0' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#6C9CFC'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
            ><Shield className="w-3.5 h-3.5" /></a>
          )}
          <button onClick={() => navigate('/profile')} className="w-7 h-7 flex items-center justify-center rounded-md" title="Perfil"
            style={{ color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
          ><User className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowSettings(!showSettings)} className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
          ><Settings className="w-3.5 h-3.5" /></button>
          <button onClick={onLogout} className="w-7 h-7 flex items-center justify-center rounded-md" title="Sair da conta"
            style={{ color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FFB86C'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
          ><LogOut className="w-3.5 h-3.5" /></button>
        </div>

        {showSettings && (
          <div className="absolute bottom-full left-3 mb-1 py-1 rounded-lg border z-[100]"
            style={{ background: '#1A1A28', borderColor: 'hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', minWidth: 180 }}
          >
            <button onClick={() => { onExport(); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors" style={{ color: '#E8E8F0' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2A2A42'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              Exportar dados (JSON)
            </button>
            <button onClick={() => { fileInputRef.current?.click(); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors" style={{ color: '#E8E8F0' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2A2A42'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              Importar dados (JSON)
            </button>
            <div className="h-px mx-2 my-1" style={{ background: 'hsl(var(--border))' }} />
            <button onClick={() => { navigate('/plans'); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: '#E8E8F0' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2A2A42'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <CreditCard className="w-3.5 h-3.5" style={{ color: '#8888A0' }} /> Planos
            </button>
            <button onClick={() => { setShowServiceTags(true); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: '#E8E8F0' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2A2A42'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <Tag className="w-3.5 h-3.5" style={{ color: '#8888A0' }} /> Serviços
            </button>
            <button onClick={() => { setShowHowToUse(true); setShowSettings(false); }} className="w-full h-8 px-3 text-left text-[13px] rounded transition-colors flex items-center gap-2" style={{ color: '#E8E8F0' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2A2A42'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <HelpCircle className="w-3.5 h-3.5" style={{ color: '#8888A0' }} /> Como usar
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
            { label: 'Excluir', danger: true, onClick: () => { if (window.confirm('Excluir este projeto e todas as suas tarefas?')) onDeleteProject(contextMenu.projectId); } },
          ]}
        />
      )}

      {/* Color picker */}
      {colorPicker && (
        <>
          <div className="fixed inset-0 z-[99]" onClick={() => setColorPicker(null)} />
          <div className="fixed z-[100] p-2.5 rounded-lg border flex gap-2" style={{ left: colorPicker.x, top: colorPicker.y, background: '#1A1A28', borderColor: 'hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
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
          <div className="rounded-xl border p-5 w-[320px]" style={{ background: '#1A1A28', borderColor: 'hsl(var(--border))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            <h3 className="text-[15px] font-semibold mb-1" style={{ color: '#E8E8F0' }}>Duplicar Projeto</h3>
            <p className="text-[13px] mb-4" style={{ color: '#8888A0' }}>O que deseja duplicar?</p>
            <div className="flex flex-col gap-2">
              {([
                { mode: 'sections' as const, label: 'Apenas Seções' },
                { mode: 'tasks' as const, label: 'Apenas Tarefas (sem seções)' },
                { mode: 'both' as const, label: 'Seções e Tarefas' },
              ]).map(({ mode, label }) => (
                <button key={mode} onClick={async () => { const id = duplicateDialog; setDuplicateDialog(null); const newId = await onDuplicateProject(id, mode); onSelectProject(newId); }}
                  className="w-full h-9 px-3 text-left text-[13px] rounded-md border transition-colors"
                  style={{ color: '#E8E8F0', borderColor: 'hsl(var(--border))' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#2A2A42'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setDuplicateDialog(null)} className="w-full mt-3 h-8 text-[13px] transition-colors" style={{ color: '#8888A0' }}>Cancelar</button>
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
