import { useState, useRef, useCallback } from 'react';
import { Subtask, TaskStatus, Section } from '@/types/task';
import { SortableSubtaskRow } from './SortableSubtaskRow';
import { arrayMove } from '@dnd-kit/sortable';

interface SubtaskDndWrapperProps {
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
}

export function SubtaskDndWrapper({
  subtasks, taskId, parentProjectId, parentSectionId, selectedSubtaskId,
  onSelectSubtask, onSubtaskStatusChange, onReorderSubtasks, onRenameSubtask,
  sections, onDeleteSubtask, onConvertToTask, onMoveSubtaskToSection,
}: SubtaskDndWrapperProps) {
  const subtaskIds = subtasks.map(s => s.id);
  const [overSubtaskId, setOverSubtaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, targetSubtaskId: string) => {
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
