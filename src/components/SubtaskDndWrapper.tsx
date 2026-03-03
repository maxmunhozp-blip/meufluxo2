import { useState, useRef, useCallback } from 'react';
import { Subtask, TaskStatus, Section } from '@/types/task';
import { SortableSubtaskRow } from './SortableSubtaskRow';
import { InlineSubtaskInput } from './InlineSubtaskInput';
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
  onAddSubtask?: (parentTaskId: string, name: string) => Promise<void>;
  onNestAsSubtask?: (draggedTaskId: string, targetTaskId: string) => void;
  depth?: number;
}

export function SubtaskDndWrapper({
  subtasks, taskId, parentProjectId, parentSectionId, selectedSubtaskId,
  onSelectSubtask, onSubtaskStatusChange, onReorderSubtasks, onRenameSubtask,
  sections, onDeleteSubtask, onConvertToTask, onMoveSubtaskToSection,
  onAddSubtask, onNestAsSubtask, depth = 1,
}: SubtaskDndWrapperProps) {
  const subtaskIds = subtasks.map(s => s.id);
  const [overSubtaskId, setOverSubtaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | 'center' | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, targetSubtaskId: string) => {
    const draggedId = e.dataTransfer.types.includes('application/x-task-id') ? true : false;
    if (!draggedId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / rect.height;
    // Center 40% = nesting zone, edges = reorder zone
    let pos: 'top' | 'bottom' | 'center';
    if (relativeY < 0.3) pos = 'top';
    else if (relativeY > 0.7) pos = 'bottom';
    else pos = 'center';
    setOverSubtaskId(targetSubtaskId);
    setDropPosition(pos);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetSubtaskId: string) => {
    const draggedId = e.dataTransfer.getData('application/x-task-id');
    if (!draggedId) {
      setOverSubtaskId(null);
      setDropPosition(null);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const currentPosition = dropPosition;
    setOverSubtaskId(null);
    setDropPosition(null);

    if (draggedId === targetSubtaskId) return;

    // Center drop = nesting (always)
    if (currentPosition === 'center') {
      onNestAsSubtask?.(draggedId, targetSubtaskId);
      return;
    }

    // Edge drop between siblings = reorder
    if (subtaskIds.includes(draggedId) && subtaskIds.includes(targetSubtaskId)) {
      const oldIdx = subtaskIds.indexOf(draggedId);
      const newIdx = subtaskIds.indexOf(targetSubtaskId);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove(subtaskIds, oldIdx, newIdx);
      onReorderSubtasks?.(taskId, reordered);
    } else {
      // Not siblings, edge drop — insert as sibling (nest under PARENT, not target)
      onNestAsSubtask?.(draggedId, taskId);
    }
  }, [subtaskIds, taskId, onReorderSubtasks, onNestAsSubtask, dropPosition]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      setOverSubtaskId(null);
      setDropPosition(null);
    }
  }, []);

  return (
    <div>
      {subtasks.map((sub) => {
        const hasChildren = sub.subtasks && sub.subtasks.length > 0;
        const childDepth = Math.min((sub.depth ?? depth) + 1, 3);
        return (
          <div key={sub.id}>
            <SortableSubtaskRow
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
            {/* Recursively render sub-subtasks */}
            {hasChildren && (
              <div
                className="relative mb-0.5 rounded-br-md"
                style={{
                  marginLeft: 9,
                  borderLeft: '1px solid var(--border-subtle, var(--nd-border))',
                }}
              >
                <SubtaskDndWrapper
                  subtasks={sub.subtasks!}
                  taskId={sub.id}
                  parentProjectId={sub.projectId || parentProjectId}
                  parentSectionId={sub.section || parentSectionId}
                  selectedSubtaskId={selectedSubtaskId}
                  onSelectSubtask={onSelectSubtask}
                  onSubtaskStatusChange={onSubtaskStatusChange}
                  onReorderSubtasks={onReorderSubtasks}
                  onRenameSubtask={onRenameSubtask}
                  sections={sections}
                  onDeleteSubtask={onDeleteSubtask}
                  onConvertToTask={onConvertToTask}
                  onMoveSubtaskToSection={onMoveSubtaskToSection}
                  onAddSubtask={onAddSubtask}
                  onNestAsSubtask={onNestAsSubtask}
                  depth={childDepth}
                />
                {childDepth < 3 && onAddSubtask && (
                  <InlineSubtaskInput taskId={sub.id} onAddSubtask={onAddSubtask} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
