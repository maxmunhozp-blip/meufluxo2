import { useState, useRef } from 'react';
import { GripVertical, Settings, LogOut, CheckCircle2, CalendarDays, Sun } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Project } from '@/types/task';
import { ContextMenu } from './ContextMenu';

const PROJECT_COLORS = ['#4A90D9', '#D4A843', '#3D9A50', '#9B59B6', '#E67E22', '#5C5F66'];

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
}

function SortableProjectItem({
  project,
  isActive,
  onSelect,
  onContextMenu,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group w-full h-9 flex items-center gap-2.5 px-3 rounded-md text-[14px] transition-colors duration-100 relative cursor-pointer ${
        isActive ? 'bg-nd-active font-medium text-nd-text' : 'text-nd-text hover:bg-nd-hover'
      }`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5 text-nd-text-muted" />
      </div>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
      <span className="truncate">{project.name}</span>
    </div>
  );
}

export function ProjectSidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onChangeColor,
  onReorderProjects,
  onDuplicateProject,
  onExport,
  onImport,
  onLogout,
  isMyDayView,
  onToggleMyDay,
  isMyTasksView,
  onToggleMyTasks,
  isMyWeekView,
  onToggleMyWeek,
}: ProjectSidebarProps) {
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<string | null>(null);
  const [colorPicker, setColorPicker] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
    if (oldIdx !== -1 && newIdx !== -1) {
      onReorderProjects(arrayMove(projects, oldIdx, newIdx));
    }
  };

  const startRename = (id: string) => {
    const p = projects.find(p => p.id === id);
    if (!p) return;
    setRenamingId(id);
    setRenameValue(p.name);
    setTimeout(() => renameRef.current?.focus(), 0);
  };

  const confirmRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <aside
      className="h-screen flex flex-col border-r border-nd-border z-30 sticky top-0"
      style={{ background: 'hsl(var(--bg-sidebar))' }}
    >
      <div className="px-4 pt-5 pb-6">
        <span className="text-[16px] font-bold text-nd-text">MeuFluxo</span>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {/* My Day button */}
        <button
          onClick={onToggleMyDay}
          className={`w-full h-9 flex items-center gap-2.5 px-3 rounded-md text-[14px] transition-colors duration-100 ${
            isMyDayView ? 'bg-nd-active font-medium text-nd-text' : 'text-nd-text hover:bg-nd-hover'
          }`}
        >
          <Sun className="w-4 h-4 text-nd-text-secondary flex-shrink-0" />
          <span className="truncate">Meu Dia</span>
        </button>

        {/* My Tasks button */}
        <button
          onClick={onToggleMyTasks}
          className={`w-full h-9 flex items-center gap-2.5 px-3 rounded-md text-[14px] transition-colors duration-100 ${
            isMyTasksView ? 'bg-nd-active font-medium text-nd-text' : 'text-nd-text hover:bg-nd-hover'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-nd-text-secondary flex-shrink-0" />
          <span className="truncate">Minhas Tarefas</span>
        </button>

        {/* My Week button */}
        <button
          onClick={onToggleMyWeek}
          className={`w-full h-9 flex items-center gap-2.5 px-3 rounded-md text-[14px] transition-colors duration-100 mb-2 ${
            isMyWeekView ? 'bg-nd-active font-medium text-nd-text' : 'text-nd-text hover:bg-nd-hover'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-nd-text-secondary flex-shrink-0" />
          <span className="truncate">Minha Semana</span>
        </button>

        <div className="h-px bg-nd-border mx-1 mb-2" />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {projects.map((project) => (
              renamingId === project.id ? (
                <div key={project.id} className="h-9 flex items-center gap-2.5 px-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: project.color }} />
                  <input
                    ref={renameRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={confirmRename}
                    className="flex-1 h-7 px-2 text-[14px] text-nd-text bg-nd-input rounded border border-primary focus:outline-none"
                  />
                </div>
              ) : (
                <SortableProjectItem
                  key={project.id}
                  project={project}
                  isActive={activeProjectId === project.id}
                  onSelect={() => onSelectProject(project.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ projectId: project.id, x: e.clientX, y: e.clientY });
                  }}
                />
              )
            ))}
          </SortableContext>
        </DndContext>

        {/* New project input */}
        {creatingProject ? (
          <div className="h-9 flex items-center px-3">
            <input
              ref={inputRef}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreatingProject(false); setNewProjectName(''); }
              }}
              onBlur={() => { if (newProjectName.trim()) handleCreate(); else setCreatingProject(false); }}
              autoFocus
              placeholder="Nome do projeto..."
              className="w-full h-7 px-2 text-[14px] text-nd-text bg-nd-input rounded-md border border-primary focus:outline-none placeholder:text-nd-text-muted"
            />
          </div>
        ) : (
          <button
            onClick={() => { setCreatingProject(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="w-full h-9 flex items-center px-3 text-[13px] font-medium text-nd-text-secondary hover:text-nd-text transition-colors"
          >
            + Novo Projeto
          </button>
        )}
      </nav>

      {/* Bottom settings */}
      <div className="px-3 pb-3 pt-2 border-t border-nd-border relative flex items-center gap-1">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-nd-text-muted hover:text-nd-text-secondary hover:bg-nd-hover transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onLogout}
          className="w-8 h-8 flex items-center justify-center rounded-md text-nd-text-muted hover:text-nd-overdue hover:bg-nd-hover transition-colors"
          title="Sair da conta"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>

        {showSettings && (
          <div
            className="absolute bottom-12 left-3 py-1 rounded-lg border border-nd-border z-[100]"
            style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', minWidth: 180 }}
          >
            <button
              onClick={() => { onExport(); setShowSettings(false); }}
              className="w-full h-8 px-3 text-left text-[13px] text-nd-text rounded hover:bg-nd-hover transition-colors"
            >
              Exportar dados (JSON)
            </button>
            <button
              onClick={() => { fileInputRef.current?.click(); setShowSettings(false); }}
              className="w-full h-8 px-3 text-left text-[13px] text-nd-text rounded hover:bg-nd-hover transition-colors"
            >
              Importar dados (JSON)
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && window.confirm('Isso irá substituir todos os dados atuais. Continuar?')) {
              onImport(file);
            }
            e.target.value = '';
          }}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Renomear', onClick: () => startRename(contextMenu.projectId) },
            {
              label: 'Duplicar',
              onClick: () => setDuplicateDialog(contextMenu.projectId),
            },
            {
              label: 'Mudar cor',
              onClick: () => setColorPicker({ projectId: contextMenu.projectId, x: contextMenu.x, y: contextMenu.y }),
            },
            {
              label: 'Excluir',
              danger: true,
              onClick: () => {
                if (window.confirm('Excluir este projeto e todas as suas tarefas?')) {
                  onDeleteProject(contextMenu.projectId);
                }
              },
            },
          ]}
        />
      )}

      {/* Color picker */}
      {colorPicker && (
        <div
          className="fixed z-[100] p-2 rounded-lg border border-nd-border flex gap-1.5"
          style={{
            left: colorPicker.x,
            top: colorPicker.y,
            background: 'hsl(var(--bg-surface))',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {PROJECT_COLORS.map(color => (
            <button
              key={color}
              onClick={() => {
                onChangeColor(colorPicker.projectId, color);
                setColorPicker(null);
              }}
              className="w-6 h-6 rounded-full border-2 border-transparent hover:border-nd-text transition-colors"
              style={{ background: color }}
            />
          ))}
        </div>
      )}
      {/* Duplicate dialog */}
      {duplicateDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="rounded-xl border border-nd-border p-5 w-[320px]"
            style={{ background: 'hsl(var(--bg-surface))', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
          >
            <h3 className="text-[15px] font-semibold text-nd-text mb-1">Duplicar Projeto</h3>
            <p className="text-[13px] text-nd-text-secondary mb-4">O que deseja duplicar?</p>
            <div className="flex flex-col gap-2">
              {([
                { mode: 'sections' as const, label: 'Apenas Seções' },
                { mode: 'tasks' as const, label: 'Apenas Tarefas (sem seções)' },
                { mode: 'both' as const, label: 'Seções e Tarefas' },
              ]).map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={async () => {
                    const id = duplicateDialog;
                    setDuplicateDialog(null);
                    const newId = await onDuplicateProject(id, mode);
                    onSelectProject(newId);
                  }}
                  className="w-full h-9 px-3 text-left text-[13px] text-nd-text rounded-md hover:bg-nd-hover transition-colors border border-nd-border"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDuplicateDialog(null)}
              className="w-full mt-3 h-8 text-[13px] text-nd-text-muted hover:text-nd-text transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
