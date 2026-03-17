import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Pin, PinOff, Bold, Italic, CheckSquare, Link2, History } from 'lucide-react';
import { ProjectDocument } from '@/types/document';
import { DocumentVersionHistory } from './DocumentVersionHistory';

interface DocumentEditorProps {
  document: ProjectDocument;
  onUpdateDocument: (doc: Partial<ProjectDocument> & { id: string }) => Promise<void>;
  onBack: () => void;
  isNew?: boolean;
}

export function DocumentEditor({ document: doc, onUpdateDocument, onBack, isNew }: DocumentEditorProps) {
  const [title, setTitle] = useState(doc.title);
  const [pinned, setPinned] = useState(doc.pinned);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const currentTitleRef = useRef(doc.title);
  const currentPinnedRef = useRef(doc.pinned);
  const currentHtmlRef = useRef(doc.content?.html || '');
  const lastSavedSnapshotRef = useRef('');
  const savingSnapshotRef = useRef('');

  const buildSnapshot = useCallback((nextTitle: string, nextHtml: string, nextPinned: boolean) => {
    return JSON.stringify({ title: nextTitle, html: nextHtml, pinned: nextPinned });
  }, []);

  const getEditorHtml = useCallback(() => editorRef.current?.innerHTML ?? currentHtmlRef.current, []);

  // Load content into editor
  useEffect(() => {
    isLoadingRef.current = true;
    setTitle(doc.title);
    setPinned(doc.pinned);
    currentTitleRef.current = doc.title;
    currentPinnedRef.current = doc.pinned;
    const html = doc.content?.html || '';
    currentHtmlRef.current = html;
    if (editorRef.current) editorRef.current.innerHTML = html;
    const snapshot = buildSnapshot(doc.title, html, doc.pinned);
    lastSavedSnapshotRef.current = snapshot;
    savingSnapshotRef.current = '';
    isLoadingRef.current = false;
  }, [doc.id, doc.title, doc.pinned, doc.content, buildSnapshot]);

  // Auto-focus title for new documents
  useEffect(() => {
    if (isNew && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [doc.id, isNew]);

  const save = useCallback(async (t: string, html: string, p: boolean) => {
    const nextSnapshot = buildSnapshot(t, html, p);
    if (nextSnapshot === lastSavedSnapshotRef.current || nextSnapshot === savingSnapshotRef.current) return;

    savingSnapshotRef.current = nextSnapshot;
    setSaveStatus('saving');
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const plainText = tempDiv.innerText || '';
      await onUpdateDocument({
        id: doc.id,
        title: t,
        content: { html, text: plainText } as any,
        pinned: p,
      });
      lastSavedSnapshotRef.current = nextSnapshot;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    } finally {
      if (savingSnapshotRef.current === nextSnapshot) {
        savingSnapshotRef.current = '';
      }
    }
  }, [buildSnapshot, doc.id, onUpdateDocument]);

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const html = currentHtmlRef.current;
    const nextSnapshot = buildSnapshot(currentTitleRef.current, html, currentPinnedRef.current);
    if (nextSnapshot === lastSavedSnapshotRef.current || nextSnapshot === savingSnapshotRef.current) return;

    void save(currentTitleRef.current, html, currentPinnedRef.current);
  }, [buildSnapshot, save]);

  const triggerAutoSave = useCallback((t: string, html: string, p: boolean) => {
    currentHtmlRef.current = html;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(t, html, p), 1000);
  }, [save]);

  useEffect(() => {
    const handleFlush = () => flushPendingSave();
    window.addEventListener('meufluxo:flush-pending-doc-saves', handleFlush);
    return () => {
      window.removeEventListener('meufluxo:flush-pending-doc-saves', handleFlush);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    currentTitleRef.current = val;
    triggerAutoSave(val, currentHtmlRef.current, currentPinnedRef.current);
  };

  const handleContentInput = () => {
    if (isLoadingRef.current) return;
    const html = getEditorHtml();
    currentHtmlRef.current = html;
    triggerAutoSave(currentTitleRef.current, html, currentPinnedRef.current);
    updateActiveFormats();
  };

  const togglePin = () => {
    const newPinned = !currentPinnedRef.current;
    currentPinnedRef.current = newPinned;
    setPinned(newPinned);
    void save(currentTitleRef.current, getEditorHtml(), newPinned);
  };

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    setActiveFormats(formats);
  }, []);

  const execFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleContentInput();
    updateActiveFormats();
  };

  const insertCheckbox = () => {
    editorRef.current?.focus();
    const html = '<div class="note-checkbox" contenteditable="true"><span contenteditable="true">Tarefa</span></div><br>';
    document.execCommand('insertHTML', false, html);
    handleContentInput();
  };

  const insertLink = () => {
    const url = prompt('URL do link:');
    if (url) execFormat('createLink', url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); execFormat('bold'); }
      if (e.key === 'i') { e.preventDefault(); execFormat('italic'); }
    }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('note-checkbox') || target.closest('.note-checkbox')) {
      const checkbox = target.classList.contains('note-checkbox') ? target : target.closest('.note-checkbox')!;
      checkbox.classList.toggle('checked');
      handleContentInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const htmlData = e.clipboardData.getData('text/html');
    if (htmlData) {
      e.preventDefault();
      const plainText = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, plainText);
    }
  };

  const handleRestoreVersion = useCallback((restoredTitle: string, restoredContent: Record<string, any>) => {
    const html = restoredContent?.html || '';
    setTitle(restoredTitle);
    currentTitleRef.current = restoredTitle;
    currentHtmlRef.current = html;
    if (editorRef.current) editorRef.current.innerHTML = html;
    void save(restoredTitle, html, currentPinnedRef.current);
  }, [save]);

  const toolbarButtons = [
    { icon: Bold, action: () => execFormat('bold'), title: 'Negrito', format: 'bold' },
    { icon: Italic, action: () => execFormat('italic'), title: 'Itálico', format: 'italic' },
    { type: 'separator' as const },
    { icon: CheckSquare, action: insertCheckbox, title: 'Checklist' },
    { icon: Link2, action: insertLink, title: 'Link' },
    { type: 'separator' as const },
    { icon: History, action: () => setShowHistory(prev => !prev), title: 'Histórico', format: showHistory ? 'history' : undefined },
  ];

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-12 px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && <span className="text-[10px]" style={{ color: 'var(--text-placeholder)' }}>Salvando...</span>}
            {saveStatus === 'saved' && <span className="text-[10px]" style={{ color: 'var(--text-placeholder)' }}>Salvo</span>}
            <button onClick={togglePin} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
              style={{ color: pinned ? 'var(--accent-blue)' : 'var(--text-placeholder)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-0.5 px-4 py-1.5 flex-shrink-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
          {toolbarButtons.map((btn, i) => {
            if ('type' in btn && btn.type === 'separator') {
              return <div key={`sep-${i}`} className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />;
            }
            const { icon: Icon, action, title, format } = btn as any;
            const isActive = format && (format === 'history' ? showHistory : activeFormats.has(format));
            return (
              <button
                key={title}
                onClick={action}
                title={title}
                className="w-7 h-7 flex items-center justify-center rounded transition-all"
                style={{
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Sem título"
            className="w-full bg-transparent outline-none font-bold"
            style={{ fontSize: 20, color: 'var(--text-primary)' }}
          />

          <div
            ref={editorRef}
            className="note-rich-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={handleContentInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onClick={handleEditorClick}
            onMouseUp={updateActiveFormats}
            onKeyUp={updateActiveFormats}
            data-placeholder="Comece a escrever..."
            style={{
              minHeight: 300,
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              lineHeight: 1.75,
              caretColor: 'var(--accent-blue)',
            }}
          />
        </div>
      </div>

      {/* Version History Panel */}
      {showHistory && (
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: 320,
            borderLeft: '1px solid var(--border-subtle)',
            background: 'var(--bg-base)',
          }}
        >
          <DocumentVersionHistory
            documentId={doc.id}
            onRestore={handleRestoreVersion}
            onClose={() => setShowHistory(false)}
          />
        </div>
      )}
    </div>
  );
}
