import { useState, useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Play, Plus } from 'lucide-react';
import { Task, Section, TaskStatus, Subtask } from '@/types/task';
import { SortableTaskRow } from './SortableTaskRow';
import { SectionProgressBar } from './SectionProgressBar';
import { ContextMenu } from './ContextMenu';

interface TaskSectionProps {
  section: Section;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  selectedTaskId?: string;
  focusedTaskId?: string;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, status: TaskStatus) => void;
  onSelectSubtask?: (subtask: Subtask) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isDropTarget?: boolean;
  onRenameSection: (id: string, title: string) => void;
  onDeleteSection: (id: string) => void;
  onAddTaskInSection: (sectionId: string) => void;
  isCreatingTask?: boolean;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onReorderSubtasks?: (taskId: string, subtaskIds: string[]) => void;
  onRenameTask?: (taskId: string, name: string) => void;
  onRenameSubtask?: (subtaskId: string, name: string) => void;
  activeTaskId?: string | null;
  overTaskId?: string | null;
  taskDropPosition?: 'top' | 'bottom' | null;
  allSections?: Section[];
  onMoveToSection?: (taskId: string, sectionId: string) => void;
  projectColor?: string;
  onAddSubtask?: (parentTaskId: string, name: string) => Promise<void>;
}

// Footer input with Tab-indent support
function SectionFooterInput({ sectionId, tasks, isCreatingTask, onAddTaskInSection, onAddSubtask }: {
  sectionId: string;
  tasks: Task[];
  isCreatingTask: boolean;
  onAddTaskInSection: (sectionId: string) => void;
  onAddSubtask?: (parentTaskId: string, name: string) => Promise<void>;
}) {
  const [isActive, setIsActive] = useState(false);
  const [value, setValue] = useState('');
  const [indented, setIndented] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;

  const open = () => {
    setIsActive(true);
    setIndented(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setValue('');
    if (indented && lastTask && onAddSubtask) {
      await onAddSubtask(lastTask.id, trimmed);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // For root task, use existing flow
      onAddTaskInSection(sectionId);
      setIsActive(false);
    }
  }, [value, indented, lastTask, onAddSubtask, onAddTaskInSection, sectionId]);

  const close = () => {
    setIsActive(false);
    setValue('');
    setIndented(false);
  };

  if (!isActive) {
    return (
      <button
        onClick={open}
        disabled={isCreatingTask}
        className="w-full flex items-center opacity-0 group-hover/section:opacity-100 focus-visible:opacity-100 transition-opacity duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ height: 40, paddingLeft: 24, paddingRight: 12, fontSize: 14, color: 'var(--text-tertiary)' }}
      >
        Adicionar tarefa...
      </button>
    );
  }

  return (
    <div className={`py-1 transition-all ${indented ? 'pl-12 md:pl-14 pr-4' : 'px-4'}`}>
      {indented && lastTask && (
        <div className="text-[11px] mb-0.5" style={{ color: 'var(--text-placeholder)' }}>
          ↳ subtarefa de &ldquo;{lastTask.name}&rdquo;
        </div>
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Tab' && !value.trim() && lastTask && onAddSubtask) {
            e.preventDefault();
            setIndented(prev => !prev);
          }
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') close();
        }}
        onBlur={() => { if (!value.trim()) close(); }}
        placeholder={indented ? 'Nome da subtarefa...' : 'Nome da tarefa...'}
        className="w-full h-8 px-2.5 text-[13px] rounded-md border focus:outline-none"
        style={{
          background: 'var(--bg-input)',
          borderColor: indented ? 'var(--border-focus)' : 'var(--border-input)',
          color: 'var(--text-primary)',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
      />
    </div>
  );
}

export function TaskSection({
  section,
  tasks,
  onSelectTask,
  selectedTaskId,
  focusedTaskId,
  onStatusChange,
  onSubtaskStatusChange,
  onSelectSubtask,
  isExpanded,
  onToggleExpand,
  isDropTarget,
  onRenameSection,
  onDeleteSection,
  onAddTaskInSection,
  isCreatingTask,
  onDeleteTask,
  onDuplicateTask,
  onReorderSubtasks,
  onRenameTask,
  onRenameSubtask,
  activeTaskId,
  overTaskId,
  taskDropPosition,
  allSections,
  onMoveToSection,
  projectColor,
  onAddSubtask,
}: TaskSectionProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section.title);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const pendingCount = tasks.filter(t => t.status !== 'done').length;

  const {
    attributes: sectionAttrs,
    listeners: sectionListeners,
    setNodeRef: setSectionRef,
    transform: sectionTransform,
    transition: sectionTransition,
    isDragging: sectionDragging,
  } = useSortable({ id: `section-${section.id}`, data: { type: 'section', section } });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `droppable-${section.id}`,
    data: { type: 'section-drop', sectionId: section.id },
  });

  const sectionStyle = {
    transform: CSS.Transform.toString(sectionTransform),
    transition: sectionTransition || 'transform 200ms ease',
    opacity: sectionDragging ? 0.5 : 1,
  };

  const taskIds = tasks.map(t => t.id);

  const startRename = () => {
    setRenameValue(section.title);
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.focus(), 0);
  };

  const confirmRename = () => {
    if (renameValue.trim()) {
      onRenameSection(section.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  // Merge section sortable ref + droppable ref on the outer container
  const mergedRef = (node: HTMLElement | null) => {
    setSectionRef(node);
    setDropRef(node);
  };

  return (
    <div ref={mergedRef} style={sectionStyle} className={`group/section ${isDropTarget || isOver ? 'ring-1 ring-primary/40 rounded' : ''}`} data-section-id={section.id} >
      <div
        className="group w-full flex items-center gap-2 transition-colors relative"
        style={{
          height: 40,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 'var(--radius-md)',
          background: isDropTarget || isOver ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
          marginBottom: 4,
          transition: 'all 150ms ease-out',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <div
          {...sectionAttrs}
          {...sectionListeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity hidden md:block"
        >
          <GripVertical className="w-4 h-4" style={{ color: 'var(--text-placeholder)' }} />
        </div>

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
            className="flex-1 h-7 px-2 rounded border focus:outline-none"
            style={{ fontSize: 14, fontWeight: 600, background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-focus)' }}
          />
        ) : (
          <button
            onClick={onToggleExpand}
            onDoubleClick={(e) => { e.stopPropagation(); startRename(); }}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <span className="w-5 h-5 flex items-center justify-center rounded flex-shrink-0">
              <Play
                className={`w-3 h-3 fill-current transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                style={{ color: 'var(--text-tertiary)' }}
              />
            </span>
            <span className="truncate" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              {section.title}
            </span>
            {!isExpanded && tasks.length > 0 && (() => {
              const done = tasks.filter(t => t.status === 'done').length;
              const total = tasks.length;
              const allDone = done === total;
              return (
                <span className="ml-2 flex items-center gap-1.5 flex-shrink-0">
                  {allDone ? (
                    <span style={{ fontSize: 12, color: 'hsl(var(--status-done))' }}>✓</span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{done}/{total}</span>
                  )}
                </span>
              );
            })()}
          </button>
        )}
      </div>

      {isExpanded && (
        <div>
          {/* Progress bar removed — Perry et al. (2024): bars "become sources of overwhelm" for ADHD */}
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableTaskRow
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                isFocused={focusedTaskId === task.id}
                selectedSubtaskId={selectedTaskId}
                isDragSource={activeTaskId === task.id}
                dropIndicator={overTaskId === task.id ? taskDropPosition : null}
                projectColor={projectColor}
                onSelect={onSelectTask}
                onStatusChange={onStatusChange}
                onSubtaskStatusChange={onSubtaskStatusChange}
                onSelectSubtask={onSelectSubtask}
                onDeleteTask={onDeleteTask}
                onDuplicateTask={onDuplicateTask}
                onReorderSubtasks={onReorderSubtasks}
                onRenameTask={onRenameTask}
                onRenameSubtask={onRenameSubtask}
                sections={allSections}
                onMoveToSection={onMoveToSection}
                onAddSubtask={onAddSubtask}
              />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div className="h-9 px-6 flex items-center justify-center">
              <span className="text-[13px] text-nd-text-muted">Nenhuma tarefa aqui ainda</span>
            </div>
          )}
          {isCreatingTask && (
            <div className="h-9 border-b border-nd-border px-6 flex items-center gap-2 animate-pulse">
              <div className="w-4 h-4 rounded-full border-2 border-nd-text-muted border-t-transparent animate-spin" />
              <span className="text-[13px] text-nd-text-muted">Criando tarefa...</span>
            </div>
          )}
          <SectionFooterInput
            sectionId={section.id}
            tasks={tasks}
            isCreatingTask={!!isCreatingTask}
            onAddTaskInSection={onAddTaskInSection}
            onAddSubtask={onAddSubtask}
          />
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Renomear', onClick: startRename },
            {
              label: 'Excluir',
              danger: true,
              onClick: () => {
                const count = tasks.length;
                if (window.confirm(`Isso irá excluir ${count} tarefa(s). Continuar?`)) {
                  onDeleteSection(section.id);
                }
              },
            },
          ]}
        />
      )}
    </div>
  );
}
