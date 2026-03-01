import { useState, useRef } from 'react';
import { GripVertical, CalendarDays } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import { Subtask, TaskStatus, Section } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';
import { DropIndicatorLine } from './DropIndicatorLine';
import { ContextMenu } from './ContextMenu';

interface SortableSubtaskRowProps {
  subtask: Subtask;
  parentTaskId: string;
  parentProjectId: string;
  parentSectionId: string;
  isSelected: boolean;
  isDragging?: boolean;
  dropIndicator?: 'top' | 'bottom' | null;
  onSelect?: (subtask: Subtask) => void;
  onStatusChange?: (taskId: string, subtaskId: string, status: TaskStatus) => void;
  onRename?: (subtaskId: string, name: string) => void;
  sections?: Section[];
  onDeleteSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onConvertToTask?: (subtaskId: string) => void;
  onMoveSubtaskToSection?: (subtaskId: string, sectionId: string) => void;
  onNativeDragOver?: (e: React.DragEvent, subtaskId: string) => void;
  onNativeDrop?: (e: React.DragEvent, subtaskId: string) => void;
  onNativeDragLeave?: (e: React.DragEvent) => void;
}

export function SortableSubtaskRow({ subtask, parentTaskId, parentProjectId, parentSectionId, isSelected, isDragging: isParentDragging, dropIndicator, onSelect, onStatusChange, onRename, sections, onDeleteSubtask, onConvertToTask, onMoveSubtaskToSection, onNativeDragOver, onNativeDrop, onNativeDragLeave }: SortableSubtaskRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(subtask.name);
  const renameRef = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleNativeDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    const dragData = {
      taskId: subtask.id,
      taskTitle: subtask.name,
      sourceProjectId: parentProjectId,
      sourceSectionId: parentSectionId,
      isSubtask: true,
      parentTaskId: parentTaskId,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('application/x-task-id', subtask.id);
    e.dataTransfer.setData('application/x-task-project', parentProjectId);
    e.dataTransfer.setData('application/x-task-name', subtask.name);
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.textContent = subtask.name;
    ghost.style.cssText = 'position:fixed;top:-1000px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:6px;padding:6px 10px;max-width:180px;font-size:12px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:9999;pointer-events:none;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 10, 14);
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
    window.dispatchEvent(new CustomEvent('meufluxo:task-drag-end'));
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const subDone = subtask.status === 'done';

  const startRename = () => {
    setRenameValue(subtask.name);
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.focus(), 0);
  };

  const confirmRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== subtask.name) {
      onRename?.(subtask.id, trimmed);
    }
    setIsRenaming(false);
  };

  // Build context menu items
  const contextMenuItems = [
    {
      label: 'Converter em tarefa',
      onClick: () => onConvertToTask?.(subtask.id),
    },
    ...(sections && sections.filter(s => s.id !== parentSectionId).length > 0 ? [{
      label: 'Mover para seção',
      children: sections.filter(s => s.id !== parentSectionId).map(s => ({
        label: s.title,
        onClick: () => onMoveSubtaskToSection?.(subtask.id, s.id),
      })),
    }] : []),
    {
      label: 'Excluir subtarefa',
      danger: true,
      onClick: () => {
        onDeleteSubtask?.(parentTaskId, subtask.id);
      },
    },
  ];

  return (
    <div
      ref={rowRef}
      draggable
      onPointerDown={(e) => {
        // Stop propagation so parent @dnd-kit DndContext doesn't capture pointer events.
        e.stopPropagation();
      }}
      onDragStart={(e) => {
        e.stopPropagation();
        handleNativeDragStart(e);
      }}
      onDragEnd={(e) => {
        e.stopPropagation();
        handleNativeDragEnd(e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onNativeDragOver?.(e, subtask.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onNativeDrop?.(e, subtask.id);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onNativeDragLeave?.(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (isRenaming) return;
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = setTimeout(() => { onSelect?.(subtask); clickTimer.current = null; }, 250);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        startRename();
      }}
      onContextMenu={handleContextMenu}
      className={`relative h-9 min-h-[44px] md:min-h-0 border-b border-nd-border/20 hover:bg-nd-hover transition-all duration-150 ease-out cursor-pointer pl-6 md:pl-8 pr-4 md:pr-6 flex items-center gap-2 group/sub ${
        isSelected ? 'bg-nd-active' : ''
      } ${isParentDragging ? 'opacity-40' : ''}`}
      style={{ touchAction: 'none' }}
    >
      {dropIndicator && <DropIndicatorLine position={dropIndicator} />}
      <div
        className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/sub:opacity-100 cursor-grab active:cursor-grabbing transition-opacity z-10 hidden md:block"
      >
        <GripVertical className="w-3.5 h-3.5 text-nd-text-muted" />
      </div>
      <StatusCheckbox
        status={subtask.status}
        onChange={(s) => onStatusChange?.(parentTaskId, subtask.id, s)}
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
          className="flex-1 h-6 px-1 text-[13px] text-nd-text bg-nd-input rounded border border-primary focus:outline-none min-w-0"
        />
      ) : (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`text-[13px] truncate transition-[color,opacity] duration-200 ease-out ${subDone ? 'text-nd-text-completed opacity-70' : 'text-nd-text'}`}>
            {subtask.name}
          </span>
          {subtask.scheduledDate && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-shrink-0 cursor-default">
                    <CalendarDays className="w-3 h-3" style={{ color: 'var(--text-placeholder)', opacity: 0.6 }} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px] px-2 py-1">
                  {(() => {
                    const [y, m, d] = subtask.scheduledDate!.split('-');
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
      {!isRenaming && subtask.subtasks && subtask.subtasks.length > 0 && (
        <span className="text-[12px] text-nd-text-secondary flex-shrink-0">
          {subtask.subtasks.filter(s => s.status === 'done').length}/{subtask.subtasks.length}
        </span>
      )}

      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={contextMenuItems}
        />
      )}
    </div>
  );
}
