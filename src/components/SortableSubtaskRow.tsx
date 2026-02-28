import { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { Subtask, TaskStatus } from '@/types/task';
import { StatusCheckbox } from './StatusCheckbox';
import { DropIndicatorLine } from './DropIndicatorLine';

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
}

export function SortableSubtaskRow({ subtask, parentTaskId, parentProjectId, parentSectionId, isSelected, isDragging: isParentDragging, dropIndicator, onSelect, onStatusChange, onRename }: SortableSubtaskRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(subtask.name);
  const renameRef = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
  } = useSortable({ id: subtask.id, data: { type: 'subtask', subtask, parentTaskId } });

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

  return (
    <div
      ref={setNodeRef}
      draggable
      onDragStart={handleNativeDragStart}
      onDragEnd={handleNativeDragEnd}
      onClick={() => {
        if (isRenaming) return;
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = setTimeout(() => { onSelect?.(subtask); clickTimer.current = null; }, 250);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        startRename();
      }}
      className={`relative h-9 min-h-[44px] md:min-h-0 border-b border-nd-border/20 hover:bg-nd-hover transition-all duration-150 ease-out cursor-pointer pl-6 md:pl-8 pr-4 md:pr-6 flex items-center gap-2 group/sub ${
        isSelected ? 'bg-nd-active' : ''
      } ${isParentDragging ? 'opacity-40' : ''}`}
      style={{ touchAction: 'none' }}
    >
      {dropIndicator && <DropIndicatorLine position={dropIndicator} />}
      <div
        {...attributes}
        {...listeners}
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
        <span className={`text-[13px] truncate flex-1 transition-[color,opacity] duration-200 ease-out ${subDone ? 'text-nd-text-completed opacity-70' : 'text-nd-text'}`}>
          {subtask.name}
        </span>
      )}
      {!isRenaming && subtask.subtasks && subtask.subtasks.length > 0 && (
        <span className="text-[12px] text-nd-text-secondary flex-shrink-0">
          {subtask.subtasks.filter(s => s.status === 'done').length}/{subtask.subtasks.length}
        </span>
      )}
    </div>
  );
}
