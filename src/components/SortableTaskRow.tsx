import { useState, useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, MessageSquare, Play, Repeat, Plus, CalendarDays } from 'lucide-react';
import { Task, TaskStatus, Subtask, Section } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';
import { ContextMenu } from './ContextMenu';
import { MonthYearPicker } from './MonthYearPicker';
import { SortableSubtaskRow } from './SortableSubtaskRow';
import { DropIndicatorLine } from './DropIndicatorLine';
import { arrayMove } from '@dnd-kit/sortable';

interface SortableTaskRowProps {
  task: Task;
  isSelected: boolean;
  isFocused: boolean;
  selectedSubtaskId?: string;
  isDragSource?: boolean;
  dropIndicator?: 'top' | 'bottom' | null;
  projectColor?: string;
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

function SubtaskDndWrapper({ subtasks, taskId, parentProjectId, parentSectionId, selectedSubtaskId, onSelectSubtask, onSubtaskStatusChange, onReorderSubtasks, onRenameSubtask, sections, onDeleteSubtask, onConvertToTask, onMoveSubtaskToSection }: {
  subtasks: Subtask[];
  taskId: string;
  parentProjectId: string;
  parentSectionId: string;
  selectedSubtaskId?: string;
  onSelectSubtask?: (subtask: Subtask) => void;
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, status: TaskStatus) => void;
  onReorderSubtasks?: (taskId: string, subtaskIds: string[]) => void;
  onRenameSubtask?: (subtaskId: string, name: string) => void;
  sections?: Section[];
  onDeleteSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onConvertToTask?: (subtaskId: string) => void;
  onMoveSubtaskToSection?: (subtaskId: string, sectionId: string) => void;
}) {
  const subtaskIds = subtasks.map(s => s.id);
  const [overSubtaskId, setOverSubtaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
  const dragSourceIdRef = useRef<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, targetSubtaskId: string) => {
    // Only handle reorder if dragging a subtask from the same parent
    const draggedId = e.dataTransfer.types.includes('application/x-task-id') ? true : false;
    if (!draggedId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'top' : 'bottom';
    setOverSubtaskId(targetSubtaskId);
    setDropPosition(pos);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSubtaskId: string) => {
    const draggedId = e.dataTransfer.getData('application/x-task-id');
    if (!draggedId || !subtaskIds.includes(draggedId) || !subtaskIds.includes(targetSubtaskId)) {
      // Not a reorder within this parent — let it bubble for sidebar handling
      setOverSubtaskId(null);
      setDropPosition(null);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setOverSubtaskId(null);
    setDropPosition(null);

    if (draggedId === targetSubtaskId) return;

    const oldIdx = subtaskIds.indexOf(draggedId);
    const newIdx = subtaskIds.indexOf(targetSubtaskId);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(subtaskIds, oldIdx, newIdx);
    onReorderSubtasks?.(taskId, reordered);
  }, [subtaskIds, taskId, onReorderSubtasks]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the subtask list entirely
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      setOverSubtaskId(null);
      setDropPosition(null);
    }
  }, []);

  return (
    <div>
      {subtasks.map((sub) => (
        <SortableSubtaskRow
          key={sub.id}
          subtask={sub}
          parentTaskId={taskId}
          parentProjectId={parentProjectId}
          parentSectionId={parentSectionId}
          isSelected={selectedSubtaskId === sub.id}
          dropIndicator={overSubtaskId === sub.id ? dropPosition : null}
          onSelect={onSelectSubtask}
          onStatusChange={onSubtaskStatusChange}
          onRename={onRenameSubtask}
          sections={sections}
          onDeleteSubtask={onDeleteSubtask}
          onConvertToTask={onConvertToTask}
          onMoveSubtaskToSection={onMoveSubtaskToSection}
          onNativeDragOver={handleDragOver}
          onNativeDrop={handleDrop}
          onNativeDragLeave={handleDragLeave}
        />
      ))}
    </div>
  );
}


// Inline subtask creation input
function InlineSubtaskInput({ taskId, onAddSubtask }: { taskId: string; onAddSubtask?: (parentTaskId: string, name: string) => Promise<void> }) {
  const [isActive, setIsActive] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setIsActive(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || !onAddSubtask) return;
    setValue('');
    await onAddSubtask(taskId, trimmed);
    // keep open for batch creation, re-focus
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!isActive) {
    return (
      <button
        onClick={open}
        className="subtask-add-btn h-7 w-full pl-6 md:pl-8 pr-4 flex items-center gap-1.5 transition-colors group/add"
        style={{ color: 'var(--text-placeholder)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)'; }}
      >
        <Plus className="w-3 h-3" />
        <span className="text-[12px]">Adicionar subtarefa...</span>
      </button>
    );
  }

  return (
    <div className="pl-6 md:pl-8 pr-4 py-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { setIsActive(false); setValue(''); }
        }}
        onBlur={() => { if (!value.trim()) setIsActive(false); }}
        placeholder="Nome da subtarefa..."
        className="subtask-inline-input w-full h-8 px-2.5 text-[13px] rounded-md border focus:outline-none"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-input)',
          color: 'var(--text-primary)',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border-input)'; }}
      />
    </div>
  );
}

export function SortableTaskRow({ task, isSelected, isFocused, selectedSubtaskId, isDragSource, dropIndicator, projectColor, onSelect, onStatusChange, onSubtaskStatusChange, onSelectSubtask, onDeleteTask, onDuplicateTask, onReorderSubtasks, onRenameTask, onRenameSubtask, sections, onMoveToSection, onMoveToMonth, onAddSubtask, onDeleteSubtask, onConvertSubtaskToTask, onNestAsSubtask, isFadingOut }: SortableTaskRowProps) {
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
      style={isFadingOut ? { opacity: 0, transform: 'translateY(-4px)', transition: 'opacity 150ms ease-out, transform 150ms ease-out' } : undefined}
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
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10 hidden md:block"
            title="Arrastar para reordenar ou mover"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="h-full px-3 md:px-4 flex items-center" style={{ padding: '0 12px' }}>
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
                <>
                  <span className={`text-[14px] truncate flex-1 min-w-0 transition-[color,opacity] duration-200 ease-out ${isDone ? 'text-muted-foreground opacity-70' : ''}`} style={{ fontWeight: 400, lineHeight: 1.5, color: isDone ? undefined : 'var(--text-primary)' }}>
                    {task.name}
                  </span>
                  {task.scheduledDate && (
                    <CalendarDays className="flex-shrink-0 w-3 h-3" style={{ color: 'var(--text-placeholder)', opacity: 0.6 }} />
                  )}
                </>
              )}
              {/* Subtask counter — right after title, show total only */}
              {hasSubtasks && (() => {
                const subs = task.subtasks!;
                const doneCount = subs.filter(s => s.status === 'done').length;
                const total = subs.length;
                const allDone = doneCount === total;
                return (
                  <span
                    className="flex-shrink-0 tabular-nums"
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: allDone ? 'hsl(var(--status-done))' : 'var(--text-placeholder)',
                      opacity: 0.7,
                      letterSpacing: '0.01em',
                    }}
                    title={`${doneCount} de ${total} subtarefas concluídas`}
                  >
                    {allDone ? '✓' : total}
                  </span>
                );
              })()}
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
        <div className="relative ml-6 md:ml-8 border-l border-nd-border/40 mb-1 bg-nd-bg-subtask rounded-br-md">
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
          />
          <InlineSubtaskInput taskId={task.id} onAddSubtask={onAddSubtask} />
        </div>
      )}
      {expanded && !hasSubtasks && (
        <div className="relative ml-6 md:ml-8 border-l border-nd-border/40 mb-1 bg-nd-bg-subtask rounded-br-md">
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
              onClick: () => {
                setExpanded(true);
                setTimeout(() => {
                  const row = document.querySelector(`[data-task-id="${task.id}"]`);
                  // Try to find existing input first, otherwise click the add button
                  const input = row?.querySelector<HTMLInputElement>('.subtask-inline-input');
                  if (input) {
                    input.focus();
                  } else {
                    // Click the "Adicionar subtarefa..." button to activate the input
                    const btn = row?.querySelector<HTMLButtonElement>('.subtask-add-btn');
                    btn?.click();
                  }
                }, 100);
              },
            },
            {
              label: 'Duplicar tarefa',
              onClick: () => onDuplicateTask?.(task.id),
            },
            ...(sections && sections.filter(s => s.id !== task.section).length > 0 ? [{
              label: 'Mover para seção',
              children: sections.filter(s => s.id !== task.section).map(s => ({
                label: s.title,
                onClick: () => onMoveToSection?.(task.id, s.id),
              })),
            }] : []),
            ...(onMoveToMonth ? [{
              label: 'Mover para mês',
              customContent: (
                <MonthYearPicker onSelect={(year, month) => {
                  onMoveToMonth(task.id, year, month);
                  setContextMenu(null);
                }} />
              ),
            }] : []),
            {
              label: 'Excluir tarefa',
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
