import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, MessageSquare, Play, Repeat, CalendarDays, ListPlus, Copy, FolderInput, CalendarArrowDown, CalendarCheck, Trash2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import { Task, TaskStatus, Subtask, Section } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';
import { ContextMenu } from './ContextMenu';
import { MonthYearPicker } from './MonthYearPicker';
import { DropIndicatorLine } from './DropIndicatorLine';
import { SubtaskDndWrapper } from './SubtaskDndWrapper';
import { InlineSubtaskInput } from './InlineSubtaskInput';

interface SortableTaskRowProps {
  task: Task;
  isSelected: boolean;
  isFocused: boolean;
  selectedSubtaskId?: string;
  isDragSource?: boolean;
  dropIndicator?: 'top' | 'bottom' | null;
  projectColor?: string;
  sectionType?: string;
  onSelect: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, status: TaskStatus) => void;
  onSelectSubtask?: (subtask: Subtask) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onReorderSubtasks?: (taskId: string, subtaskIds: string[]) => void;
  onRenameTask?: (taskId: string, name: string) => void;
  onRenameSubtask?: (subtaskId: string, name: string) => void;
  sections?: Section[];
  onMoveToSection?: (taskId: string, sectionId: string) => void;
  onMoveToMonth?: (taskId: string, year: number, month: number) => void;
  onAddSubtask?: (parentTaskId: string, name: string) => Promise<void>;
  onDeleteSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onConvertSubtaskToTask?: (subtaskId: string) => void;
  onNestAsSubtask?: (draggedTaskId: string, targetTaskId: string) => void;
  isFadingOut?: boolean;
  onScheduleToday?: (taskId: string) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() === yesterday.getTime()) return 'ontem';
  if (date.getTime() === today.getTime()) return 'hoje';
  const day = date.getDate();
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${day} ${months[date.getMonth()]}`;
}

function isOverdue(dateStr?: string, status?: TaskStatus): boolean {
  if (!dateStr || status === 'done') return false;
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}




const DEPTH_STYLES = {
  0: { paddingLeft: 8, checkboxSize: 18, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' },
  1: { paddingLeft: 32, checkboxSize: 16, fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' },
  2: { paddingLeft: 56, checkboxSize: 14, fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' },
  3: { paddingLeft: 80, checkboxSize: 12, fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)' },
} as const;

export function SortableTaskRow({ task, isSelected, isFocused, selectedSubtaskId, isDragSource, dropIndicator, projectColor, sectionType, onSelect, onStatusChange, onSubtaskStatusChange, onSelectSubtask, onDeleteTask, onDuplicateTask, onReorderSubtasks, onRenameTask, onRenameSubtask, sections, onMoveToSection, onMoveToMonth, onAddSubtask, onDeleteSubtask, onConvertSubtaskToTask, onNestAsSubtask, isFadingOut, onScheduleToday }: SortableTaskRowProps) {
  // HTML5 drag for cross-area drag to sidebar
  const handleNativeDragStart = (e: React.DragEvent) => {
    const dragData = {
      taskId: task.id,
      taskTitle: task.name,
      sourceProjectId: task.projectId,
      sourceSectionId: task.section,
      isSubtask: !!task.parentTaskId,
      parentTaskId: task.parentTaskId || null,
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('application/x-task-id', task.id);
    e.dataTransfer.setData('application/x-task-project', task.projectId);
    e.dataTransfer.setData('application/x-task-name', task.name);
    e.dataTransfer.effectAllowed = 'move';

    // Create custom ghost
    const ghost = document.createElement('div');
    ghost.textContent = task.name;
    ghost.style.cssText = 'position:fixed;top:-1000px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:6px;padding:8px 12px;max-width:200px;font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:9999;pointer-events:none;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 10, 16);
    setTimeout(() => document.body.removeChild(ghost), 0);

    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }

    window.dispatchEvent(new CustomEvent('meufluxo:task-drag-start', { detail: dragData }));
  };

  const handleNativeDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    // ALWAYS dispatch cleanup, no matter what happened
    window.dispatchEvent(new CustomEvent('meufluxo:task-drag-end'));
  };
  const [expanded, setExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(task.name);
  const renameRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [nestDropHighlight, setNestDropHighlight] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const isDone = task.status === 'done';
  const overdue = isOverdue(task.dueDate, task.status);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const depth = Math.min(task.depth ?? 0, 3) as 0 | 1 | 2 | 3;
  const dStyle = DEPTH_STYLES[depth];

  // Aging badge for inbox sections (>48h)
  const agingBadge = (() => {
    if (sectionType !== 'inbox' || !task.createdAt || isDone) return null;
    const ageMs = Date.now() - new Date(task.createdAt).getTime();
    if (ageMs < 172800000) return null;
    const ageDays = Math.floor(ageMs / 86400000);
    const ageHours = Math.floor(ageMs / 3600000);
    const ageLabel = ageDays > 0 ? `${ageDays}d` : `${ageHours}h`;
    return (
      <span className="flex-shrink-0" style={{ fontSize: 10, fontWeight: 500, color: 'var(--warning-subtle, #F59E0B)', opacity: 0.7, padding: '1px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.08)' }}>
        {ageLabel}
      </span>
    );
  })();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const startRename = () => {
    setRenameValue(task.name);
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.focus(), 0);
  };

  const confirmRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== task.name) {
      onRenameTask?.(task.id, trimmed);
    }
    setIsRenaming(false);
  };

  return (
    <div
      ref={setNodeRef}
      data-task-id={task.id}
      className="relative"
      style={isFadingOut ? { opacity: 0, transform: 'translateX(20px)', transition: 'all 300ms ease-out' } : undefined}
    >
      {dropIndicator && <DropIndicatorLine position={dropIndicator} />}
      <div className="flex" style={{ marginBottom: 8 }}>
        <div
          className={`flex-1 min-w-0 group cursor-pointer transition-all duration-150 relative ${
            isDragSource ? 'opacity-40' : ''
          }`}
          draggable
          onDragStart={(e) => {
            // Prevent native drag when initiated from the grip icon (@dnd-kit handles that)
            const target = e.target as HTMLElement;
            if (target.closest('[data-dndkit-grip]')) {
              e.preventDefault();
              return;
            }
            handleNativeDragStart(e);
          }}
          onDragEnd={handleNativeDragEnd}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('application/x-task-id')) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            setNestDropHighlight(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setNestDropHighlight(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setNestDropHighlight(false);
            const draggedId = e.dataTransfer.getData('application/x-task-id');
            if (!draggedId || draggedId === task.id) return;
            onNestAsSubtask?.(draggedId, task.id);
          }}
          style={{
            minHeight: 40,
            opacity: isDragSource ? 0.4 : isDone ? 0.6 : undefined,
            background: nestDropHighlight ? 'hsl(var(--primary) / 0.08)' : isSelected ? 'var(--bg-active)' : undefined,
            borderRadius: 6,
            transition: 'all 150ms ease-out',
            outline: nestDropHighlight ? '2px dashed hsl(var(--primary) / 0.6)' : undefined,
            outlineOffset: nestDropHighlight ? '-2px' : undefined,
          }}
          onMouseEnter={e => { if (!isSelected && !nestDropHighlight) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (!isSelected && !nestDropHighlight) e.currentTarget.style.background = 'transparent'; }}
          
          onClick={() => {
            if (isRenaming) return;
            if (clickTimer.current) clearTimeout(clickTimer.current);
            clickTimer.current = setTimeout(() => { onSelect(task); clickTimer.current = null; }, 250);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
            startRename();
          }}
          onContextMenu={handleContextMenu}
        >
          {/* Nest indicator badge */}
          {nestDropHighlight && (
            <div
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', fontSize: 11, fontWeight: 500 }}
            >
              ↳ subtarefa
            </div>
          )}
          {/* Drag handle — @dnd-kit for reorder + cross-section within project */}
          <div
            data-dndkit-grip
            {...attributes}
            {...listeners}
            className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing transition-opacity duration-150 z-10 hidden md:flex items-center justify-center rounded-sm"
            style={{ left: -8, width: 22, height: 28 }}
            title="Arrastar para reordenar ou mover"
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>

          <div className="h-full flex items-center" style={{ paddingLeft: dStyle.paddingLeft, paddingRight: 12 }}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {hasSubtasks ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                  className="w-5 h-5 flex items-center justify-center rounded transition-colors duration-100 flex-shrink-0"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Play
                    className={`w-3 h-3 text-muted-foreground fill-muted-foreground transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <span className="w-5 flex-shrink-0" />
              )}
              <StatusCheckbox
                status={task.status}
                onChange={(s) => onStatusChange(task.id, s)}
                quickComplete
                size={dStyle.checkboxSize}
              />
              {isRenaming ? (
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                  onBlur={confirmRename}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="flex-1 h-6 px-1 text-[14px] text-foreground bg-input rounded border border-primary focus:outline-none min-w-0"
                />
              ) : (
                <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-[65%]">
                  <span className={`truncate transition-[color,opacity] duration-200 ease-out ${isDone ? 'text-muted-foreground' : ''}`} style={{ fontSize: dStyle.fontSize, fontWeight: dStyle.fontWeight, lineHeight: 1.5, color: isDone ? undefined : dStyle.color, opacity: isDone ? 0.35 : 1, textDecoration: isDone ? 'line-through' : 'none', textDecorationColor: 'rgba(255,255,255,0.15)' }}>
                    {task.name}
                  </span>
                  {agingBadge}
                  {task.scheduledDate && (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-shrink-0 cursor-default">
                            <CalendarDays className="w-3 h-3" style={{ color: 'var(--text-placeholder)', opacity: 0.6 }} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[11px] px-2 py-1">
                          {(() => {
                            const [y, m, d] = task.scheduledDate!.split('-');
                            const date = new Date(Number(y), Number(m) - 1, Number(d));
                            const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
                            return <>{d}/{m} <span style={{ color: '#D97706', fontWeight: 600 }}>{days[date.getDay()]}</span></>;
                          })()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}
              {task.recurrenceType && (
                <span title="Tarefa recorrente"><Repeat className="w-3 h-3 text-primary/60 flex-shrink-0" /></span>
              )}
              {task.members && task.members.length > 0 && (
                <div className="flex items-center -space-x-1.5 flex-shrink-0">
                  {task.members.slice(0, 3).map((m) => (
                    <div
                      key={m.userId}
                      title={m.fullName || ''}
                      className="w-5 h-5 rounded-full border border-background flex items-center justify-center text-[9px] font-medium bg-primary/20 text-primary overflow-hidden"
                    >
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (m.fullName || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                  {task.members.length > 3 && (
                    <div className="w-5 h-5 rounded-full border border-background flex items-center justify-center text-[9px] font-medium bg-muted text-muted-foreground">
                      +{task.members.length - 3}
                    </div>
                  )}
                </div>
              )}
              {task.comments && task.comments.length > 0 && (
                <span className="flex items-center gap-1 flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">{task.comments.length}</span>
                </span>
              )}

              {/* Assignee — only if set */}
              {task.assignee && (
                <span className="text-[12px] truncate hidden md:block text-muted-foreground flex-shrink-0 max-w-[100px]">
                  {task.assignee}
                </span>
              )}

              {/* Due date — only if set */}
              {task.dueDate && (
                <span className={`text-[12px] hidden md:block flex-shrink-0 ${
                  isDone ? 'text-muted-foreground' : overdue ? 'font-medium' : 'text-muted-foreground'
                }`} style={overdue && !isDone ? { color: 'hsl(var(--status-overdue))' } : undefined}>
                  {formatDate(task.dueDate)}
                </span>
              )}


              {/* Rollover badge */}
              {task.rolloverCount != null && task.rolloverCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive flex-shrink-0" title={`Adiada ${task.rolloverCount}x`}>
                  ↻{task.rolloverCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {expanded && hasSubtasks && (
        <div className="relative mb-1 rounded-br-md" style={{ marginLeft: dStyle.paddingLeft + 9, borderLeft: '1px solid var(--border-subtle, var(--nd-border))' }}>
          <SubtaskDndWrapper
            subtasks={task.subtasks!}
            taskId={task.id}
            parentProjectId={task.projectId}
            parentSectionId={task.section}
            selectedSubtaskId={selectedSubtaskId}
            onSelectSubtask={onSelectSubtask}
            onSubtaskStatusChange={onSubtaskStatusChange}
            onReorderSubtasks={onReorderSubtasks}
            onRenameSubtask={onRenameSubtask}
            sections={sections}
            onDeleteSubtask={onDeleteSubtask}
            onConvertToTask={onConvertSubtaskToTask}
            onMoveSubtaskToSection={(subtaskId, sectionId) => onMoveToSection?.(subtaskId, sectionId)}
            onAddSubtask={onAddSubtask}
            onNestAsSubtask={onNestAsSubtask}
          />
          {depth < 3 && <InlineSubtaskInput taskId={task.id} onAddSubtask={onAddSubtask} />}
        </div>
      )}
      {expanded && !hasSubtasks && depth < 3 && (
        <div className="relative mb-1 rounded-br-md" style={{ marginLeft: dStyle.paddingLeft + 9, borderLeft: '1px solid var(--border-subtle, var(--nd-border))' }}>
          <InlineSubtaskInput taskId={task.id} onAddSubtask={onAddSubtask} />
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Adicionar subtarefa',
              icon: <ListPlus style={{ width: 15, height: 15 }} />,
              onClick: () => {
                setExpanded(true);
                setTimeout(() => {
                  const row = document.querySelector(`[data-task-id="${task.id}"]`);
                  const input = row?.querySelector<HTMLInputElement>('.subtask-inline-input');
                  if (input) {
                    input.focus();
                  } else {
                    const btn = row?.querySelector<HTMLButtonElement>('.subtask-add-btn');
                    btn?.click();
                  }
                }, 100);
              },
            },
            {
              label: 'Duplicar tarefa',
              icon: <Copy style={{ width: 15, height: 15 }} />,
              onClick: () => onDuplicateTask?.(task.id),
            },
            ...(onScheduleToday ? [{
              label: 'Agendar pra hoje',
              icon: <CalendarCheck style={{ width: 15, height: 15 }} />,
              onClick: () => onScheduleToday(task.id),
            }] : []),
            ...(sections && sections.filter(s => s.id !== task.section).length > 0 ? [{
              label: 'Mover para seção',
              icon: <FolderInput style={{ width: 15, height: 15 }} />,
              children: sections.filter(s => s.id !== task.section).map(s => ({
                label: s.title,
                onClick: () => onMoveToSection?.(task.id, s.id),
              })),
            }] : []),
            ...(onMoveToMonth ? [{
              label: 'Mover para mês',
              icon: <CalendarArrowDown style={{ width: 15, height: 15 }} />,
              customContent: (
                <MonthYearPicker onSelect={(year, month) => {
                  onMoveToMonth(task.id, year, month);
                  setContextMenu(null);
                }} />
              ),
            }] : []),
            {
              label: 'Excluir tarefa',
              icon: <Trash2 style={{ width: 15, height: 15 }} />,
              danger: true,
              onClick: () => {
                onDeleteTask?.(task.id);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
