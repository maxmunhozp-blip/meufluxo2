import { useState, useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, Play, MoreHorizontal } from 'lucide-react';
import { Task, Section, TaskStatus, Subtask, SectionType } from '@/types/task';
import { MonthYearPicker } from './MonthYearPicker';
import { SortableTaskRow } from './SortableTaskRow';
import { SectionProgressBar } from './SectionProgressBar';
import { ContextMenu } from './ContextMenu';
import { EntradaSuggestionChip } from './EntradaSuggestionChip';

// Invisible drop zone at the end of a section's task list
function SectionEndDropZone({ sectionId }: { sectionId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-end-${sectionId}`,
    data: { type: 'section-end', sectionId },
  });
  return (
    <div
      ref={setNodeRef}
      className="h-2 -mt-1 transition-colors"
      style={{ background: isOver ? 'hsl(var(--primary) / 0.15)' : 'transparent' }}
    />
  );
}

// ─── Section Flow State Menu ──────────────────────────────
const FLOW_STATES: { value: SectionType; label: string }[] = [
  { value: 'recurrent', label: 'Recorrente' },
  { value: 'active', label: 'Em andamento' },
  { value: 'inbox', label: 'Entrada' },
];

function FlowStateSubmenu({ current, onChange }: { current: SectionType; onChange: (v: SectionType) => void }) {
  return (
    <div style={{ minWidth: 160 }}>
      {FLOW_STATES.map(s => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className="w-full text-left select-none"
          style={{
            height: 32,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: current === s.value ? 600 : 400,
            color: current === s.value ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'background 150ms ease-out',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover, var(--bg-overlay))'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          {s.label}
        </button>
      ))}
      <div style={{ height: 1, background: 'var(--border-subtle, var(--border-default))', margin: '4px 0' }} />
      <button
        onClick={() => onChange(null)}
        className="w-full text-left select-none"
        style={{
          height: 32,
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: current === null ? 600 : 400,
          color: current === null ? 'var(--text-primary)' : 'var(--text-secondary)',
          transition: 'background 150ms ease-out',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover, var(--bg-overlay))'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        Sem estado
      </button>
    </div>
  );
}

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
  onAddTaskInSection: (sectionId: string, taskName?: string) => void;
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
  onMoveToMonth?: (taskId: string, year: number, month: number) => void;
  projectColor?: string;
  onAddSubtask?: (parentTaskId: string, name: string) => Promise<void>;
  onDeleteSubtask?: (parentTaskId: string, subtaskId: string) => void;
  onConvertSubtaskToTask?: (subtaskId: string) => void;
  fadingOutTaskId?: string | null;
  onMoveSectionToMonth?: (sectionId: string, year: number, month: number) => void;
  onNestAsSubtask?: (draggedTaskId: string, targetTaskId: string) => void;
  onScheduleToday?: (taskId: string) => void;
  onCreateSectionFromEntrada?: (sectionName: string) => void;
  onChangeSectionType?: (sectionId: string, sectionType: SectionType) => void;
}

// Footer input with Tab-indent support
function SectionFooterInput({ sectionId, tasks, isCreatingTask, onAddTaskInSection, onAddSubtask, placeholder }: {
  sectionId: string;
  tasks: Task[];
  isCreatingTask: boolean;
  onAddTaskInSection: (sectionId: string, taskName?: string) => void;
  onAddSubtask?: (parentTaskId: string, name: string) => Promise<void>;
  placeholder?: string;
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
      onAddTaskInSection(sectionId, trimmed);
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
        onBlur={() => { if (value.trim()) submit(); else close(); }}
        placeholder={indented ? 'Nome da subtarefa...' : (placeholder || 'Nome da tarefa...')}
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
  onMoveToMonth,
  projectColor,
  onAddSubtask,
  onDeleteSubtask,
  onConvertSubtaskToTask,
  fadingOutTaskId,
  onMoveSectionToMonth,
  onNestAsSubtask,
  onScheduleToday,
  onCreateSectionFromEntrada,
  onChangeSectionType,
}: TaskSectionProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(section.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [nativeDragOver, setNativeDragOver] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const hasTasks = tasks.length > 0;
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

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.right - 160, y: rect.bottom + 4 });
    setMenuOpen(true);
  };

  const openContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  // Merge section sortable ref + droppable ref
  const mergedRef = (node: HTMLElement | null) => {
    setSectionRef(node);
    setDropRef(node);
  };

  // Build menu items
  const menuItems = [
    { label: 'Renomear', onClick: startRename },
    ...(onChangeSectionType ? [{
      label: 'Estado',
      customContent: (
        <FlowStateSubmenu
          current={section.sectionType ?? null}
          onChange={(type) => {
            onChangeSectionType(section.id, type);
            setMenuOpen(false);
          }}
        />
      ),
    }] : []),
    ...(onMoveSectionToMonth ? [{
      label: 'Mover para mês',
      customContent: (
        <MonthYearPicker onSelect={(year, month) => {
          onMoveSectionToMonth(section.id, year, month);
          setMenuOpen(false);
        }} />
      ),
    }] : []),
    // Separator + Delete only if empty
    ...(!hasTasks ? [{
      label: 'Excluir',
      danger: true,
      onClick: () => onDeleteSection(section.id),
    }] : []),
  ];

  return (
    <div ref={mergedRef} style={{ ...sectionStyle }} className={`group/section ${isDropTarget || isOver || nativeDragOver ? 'ring-1 ring-primary/40 rounded' : ''}`} data-section-id={section.id} >
      <div
        className="group w-full flex items-center gap-2 transition-colors relative"
        style={{
          height: 44,
          paddingLeft: 16,
          paddingRight: 8,
          borderRadius: 8,
          background: nativeDragOver ? 'var(--bg-active)' : 'var(--bg-elevated)',
          marginBottom: 8,
          transition: 'all 150ms ease-out',
        }}
        onMouseEnter={e => { if (!nativeDragOver) e.currentTarget.style.background = 'var(--bg-overlay)'; }}
        onMouseLeave={e => { if (!nativeDragOver) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('application/x-task-id')) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          setNativeDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setNativeDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setNativeDragOver(false);
          const taskId = e.dataTransfer.getData('application/x-task-id');
          if (!taskId) return;
          onMoveToSection?.(taskId, section.id);
        }}
        onContextMenu={openContextMenu}
      >
        <div
          {...sectionAttrs}
          {...sectionListeners}
          className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity hidden md:flex items-center justify-center z-10"
          style={{ width: 28, height: 36, touchAction: 'none' }}
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
            <span className="truncate" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)' }}>
              {section.title}
            </span>
            {tasks.length > 0 && (
              <span className="flex-shrink-0" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                ({pendingCount})
              </span>
            )}
          </button>
        )}

        {/* Always-visible ··· menu button */}
        <button
          ref={menuBtnRef}
          onClick={openMenu}
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            color: 'var(--text-tertiary)',
            transition: 'all 150ms ease-out',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-tertiary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div>
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
                onMoveToMonth={onMoveToMonth}
                onAddSubtask={onAddSubtask}
                onDeleteSubtask={onDeleteSubtask}
                onConvertSubtaskToTask={onConvertSubtaskToTask}
                onNestAsSubtask={onNestAsSubtask}
                isFadingOut={fadingOutTaskId === task.id}
                onScheduleToday={onScheduleToday}
              />
            ))}
          </SortableContext>
          <SectionEndDropZone sectionId={section.id} />
          {section.sectionType === 'inbox' && onCreateSectionFromEntrada && (
            <EntradaSuggestionChip
              sectionId={section.id}
              tasks={tasks}
              onCreateSection={onCreateSectionFromEntrada}
            />
          )}
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
            placeholder={section.sectionType === 'inbox' ? 'Nova demanda, ideia ou tarefa...' : undefined}
          />
        </div>
      )}

      {menuOpen && menuPos && (
        <ContextMenu
          position={menuPos}
          onClose={() => setMenuOpen(false)}
          items={menuItems}
        />
      )}
    </div>
  );
}
