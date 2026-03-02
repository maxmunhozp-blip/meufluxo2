import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, X, FileText, CheckSquare, Layers, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, Project, Section } from '@/types/task';

type ResultType = 'task' | 'subtask' | 'section' | 'attachment';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  context: string; // e.g. "Projeto › Seção"
  projectColor?: string;
  taskId?: string; // for subtasks/attachments, the parent task
  projectId?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  sections: Section[];
  attachments?: { id: string; taskId: string; fileName: string }[];
  onSelectTask: (taskId: string, projectId?: string) => void;
  onSelectProject: (projectId: string) => void;
}

const TYPE_ICON: Record<ResultType, typeof CheckSquare> = {
  task: CheckSquare,
  subtask: Layers,
  section: FileText,
  attachment: Paperclip,
};

const TYPE_LABEL: Record<ResultType, string> = {
  task: 'Tarefa',
  subtask: 'Subtarefa',
  section: 'Seção',
  attachment: 'Anexo',
};

export function GlobalSearch({ open, onClose, tasks, projects, sections, attachments = [], onSelectTask, onSelectProject }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onClose(); // toggle handled by parent
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach(p => map.set(p.id, p));
    return map;
  }, [projects]);

  const sectionMap = useMemo(() => {
    const map = new Map<string, Section>();
    sections.forEach(s => map.set(s.id, s));
    return map;
  }, [sections]);

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: SearchResult[] = [];
    const MAX = 30;

    // Search sections
    for (const sec of sections) {
      if (results.length >= MAX) break;
      if (sec.title.toLowerCase().includes(q)) {
        const proj = projectMap.get(sec.projectId);
        results.push({
          id: `sec-${sec.id}`,
          type: 'section',
          title: sec.title,
          context: proj?.name || '',
          projectColor: proj?.color,
          projectId: sec.projectId,
        });
      }
    }

    // Search tasks + subtasks
    for (const task of tasks) {
      if (results.length >= MAX) break;
      const proj = projectMap.get(task.projectId);
      const sec = sectionMap.get(task.section);

      if (task.name.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q)) {
        results.push({
          id: `task-${task.id}`,
          type: task.parentTaskId ? 'subtask' : 'task',
          title: task.name,
          context: [proj?.name, sec?.title].filter(Boolean).join(' › '),
          projectColor: proj?.color,
          taskId: task.id,
          projectId: task.projectId,
        });
      }

      // Search subtasks
      if (task.subtasks) {
        for (const sub of task.subtasks) {
          if (results.length >= MAX) break;
          if (sub.name.toLowerCase().includes(q) || sub.description?.toLowerCase().includes(q)) {
            results.push({
              id: `sub-${sub.id}`,
              type: 'subtask',
              title: sub.name,
              context: [proj?.name, sec?.title, task.name].filter(Boolean).join(' › '),
              projectColor: proj?.color,
              taskId: sub.id,
              projectId: task.projectId,
            });
          }
          // Level 2 subtasks
          if (sub.subtasks) {
            for (const sub2 of sub.subtasks) {
              if (results.length >= MAX) break;
              if (sub2.name.toLowerCase().includes(q)) {
                results.push({
                  id: `sub2-${sub2.id}`,
                  type: 'subtask',
                  title: sub2.name,
                  context: [proj?.name, task.name, sub.name].filter(Boolean).join(' › '),
                  projectColor: proj?.color,
                  taskId: sub2.id,
                  projectId: task.projectId,
                });
              }
            }
          }
        }
      }
    }

    // Search attachments
    for (const att of attachments) {
      if (results.length >= MAX) break;
      if (att.fileName.toLowerCase().includes(q)) {
        const task = tasks.find(t => t.id === att.taskId);
        const proj = task ? projectMap.get(task.projectId) : undefined;
        results.push({
          id: `att-${att.id}`,
          type: 'attachment',
          title: att.fileName,
          context: task ? [proj?.name, task.name].filter(Boolean).join(' › ') : '',
          projectColor: proj?.color,
          taskId: att.taskId,
          projectId: task?.projectId,
        });
      }
    }

    return results;
  }, [query, tasks, sections, attachments, projectMap, sectionMap]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'section' && result.projectId) {
      onSelectProject(result.projectId);
    } else if (result.taskId) {
      onSelectTask(result.taskId, result.projectId);
    }
    onClose();
  }, [onSelectTask, onSelectProject, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200]"
            style={{ background: 'var(--bg-base)' }}
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[201] inset-x-0 flex justify-center px-4"
            style={{ top: '15%' }}
          >
            <div style={{ width: '100%', maxWidth: 520 }}>
            <div
              className="rounded-xl overflow-hidden shadow-2xl border"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'hsl(var(--border))',
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4" style={{ height: 52, borderBottom: '1px solid hsl(var(--border))' }}>
                <Search className="flex-shrink-0" style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pesquisar tarefas, seções, anexos..."
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: 14, color: 'var(--text-primary)', caretColor: 'var(--accent-blue)' }}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
                <kbd
                  className="hidden md:flex items-center justify-center flex-shrink-0 rounded px-1.5"
                  style={{
                    fontSize: 11,
                    height: 22,
                    color: 'var(--text-placeholder)',
                    background: 'var(--bg-elevated)',
                    fontFamily: 'system-ui',
                  }}
                >
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="overflow-y-auto"
                style={{ maxHeight: 360, padding: results.length > 0 ? '4px 0' : undefined }}
              >
                {query.length >= 2 && results.length === 0 && (
                  <div className="flex items-center justify-center" style={{ height: 80 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Nenhum resultado encontrado</span>
                  </div>
                )}
                {results.map((result, i) => {
                  const Icon = TYPE_ICON[result.type];
                  const isSelected = i === selectedIndex;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className="w-full flex items-center gap-3 px-4 text-left transition-colors"
                      style={{
                        height: 44,
                        background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      }}
                    >
                      {result.projectColor && (
                        <span
                          className="flex-shrink-0 rounded-full"
                          style={{ width: 6, height: 6, background: result.projectColor, opacity: 0.5 }}
                        />
                      )}
                      <Icon
                        className="flex-shrink-0"
                        style={{ width: 14, height: 14, color: 'var(--text-tertiary)' }}
                      />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span
                          className="truncate text-[13px]"
                          style={{ color: 'var(--text-primary)', fontWeight: 400 }}
                        >
                          {result.title}
                        </span>
                        {result.context && (
                          <span
                            className="truncate text-[11px] flex-shrink"
                            style={{ color: 'var(--text-placeholder)', minWidth: 0 }}
                          >
                            {result.context}
                          </span>
                        )}
                      </div>
                      <span
                        className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          color: 'var(--text-placeholder)',
                          background: 'var(--bg-elevated)',
                        }}
                      >
                        {TYPE_LABEL[result.type]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer hint */}
              {query.length < 2 && (
                <div className="flex items-center justify-center" style={{ height: 56 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>
                    Digite pelo menos 2 caracteres para pesquisar
                  </span>
                </div>
              )}
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
