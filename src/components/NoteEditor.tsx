import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Pin, PinOff, Trash2, Bold, Italic, Underline, Strikethrough, List, ListOrdered, CheckSquare, Minus, Heading2, ImagePlus, Link2, Quote, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LinkPreview, OGData } from './LinkPreview';
import { Project } from '@/types/task';

interface NoteEditorProps {
  noteId: string | null;
  projectId: string | null;
  workspaceId: string;
  userId: string;
  onBack: () => void;
  onSaved: () => void;
  onDelete: () => void;
  projects?: Project[];
  isModal?: boolean;
  isPro?: boolean;
  onUpgrade?: () => void;
}

// ── Markdown → HTML converter (for legacy content migration) ──
function markdownToHtml(md: string): string {
  if (!md) return '';
  // If content already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(md) && !md.includes('**') && !md.includes('##')) {
    return md;
  }
  let html = md;
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Underline (HTML tags kept as-is)
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');
  // Checkboxes
  html = html.replace(/^\[x\] (.+)$/gm, '<div class="note-checkbox checked">$1</div>');
  html = html.replace(/^\[ \] (.+)$/gm, '<div class="note-checkbox">$1</div>');
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="note-ol">$1</li>');
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="note-ul">$1</li>');
  // Wrap consecutive <li class="note-ul"> in <ul> and <li class="note-ol"> in <ol>
  html = html.replace(/((?:<li class="note-ul">.+<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/((?:<li class="note-ol">.+<\/li>\n?)+)/g, '<ol>$1</ol>');
  // Paragraphs: wrap remaining lines
  html = html.replace(/^(?!<[a-z/])((?!\s*$).+)$/gm, '<p>$1</p>');
  // Clean empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  return html;
}

export function NoteEditor({ noteId, projectId, workspaceId, userId, onBack, onSaved, onDelete, projects = [], isModal = false, isPro = false, onUpgrade }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(projectId);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(noteId);
  const [urls, setUrls] = useState<string[]>([]);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [ogCache, setOgCache] = useState<Record<string, OGData>>({});
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const isLoadingRef = useRef(false);

  // Load note
  useEffect(() => {
    if (!noteId) {
      setTitle('');
      setHtmlContent('');
      setPinned(false);
      setLinkedProjectId(projectId);
      setCurrentNoteId(null);
      if (editorRef.current) editorRef.current.innerHTML = '';
      return;
    }
    isLoadingRef.current = true;
    (async () => {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();
      if (data) {
        setTitle(data.title);
        const c = data.content as any;
        const rawText = c?.text || '';
        const rawHtml = c?.html || '';
        // Prefer stored HTML, fallback to converting markdown
        const resolvedHtml = rawHtml || markdownToHtml(rawText);
        setHtmlContent(resolvedHtml);
        if (editorRef.current) editorRef.current.innerHTML = resolvedHtml;
        setImages(c?.images || []);
        setOgCache(c?.ogCache || {});
        setPinned(data.pinned);
        setLinkedProjectId(data.project_id);
        setCurrentNoteId(data.id);
      }
      isLoadingRef.current = false;
    })();
  }, [noteId]);

  // Extract URLs from content
  useEffect(() => {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const textContent = editorRef.current?.innerText || '';
    const found = textContent.match(urlRegex) || [];
    setUrls(found);
  }, [htmlContent]);

  // Track active formats for toolbar state
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikethrough')) formats.add('strikethrough');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('insertOrderedList')) formats.add('ol');
    // Check for heading
    const block = document.queryCommandValue('formatBlock');
    if (block === 'h2' || block === 'H2') formats.add('heading');
    setActiveFormats(formats);
  }, []);

  const getEditorHtml = useCallback(() => {
    return editorRef.current?.innerHTML || '';
  }, []);

  const save = useCallback(async (t: string, html: string, p: boolean, imgs: string[], projId: string | null, og?: Record<string, OGData>) => {
    setSaveStatus('saving');
    const cacheToSave = og || ogCache;
    // Extract plain text for search/backwards compat
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const plainText = tempDiv.innerText || '';
    try {
      if (currentNoteId) {
        await supabase
          .from('notes')
          .update({
            title: t,
            content: { text: plainText, html, images: imgs, ogCache: cacheToSave } as any,
            pinned: p,
            project_id: projId,
          })
          .eq('id', currentNoteId);
      } else {
        const { data } = await supabase
          .from('notes')
          .insert({
            title: t,
            content: { text: plainText, html, images: imgs, ogCache: cacheToSave } as any,
            pinned: p,
            project_id: projId,
            workspace_id: workspaceId,
            created_by: userId,
          })
          .select('id')
          .single();
        if (data) setCurrentNoteId(data.id);
      }
      setSaveStatus('saved');
      onSaved();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  }, [currentNoteId, workspaceId, userId, onSaved, ogCache]);

  const triggerAutoSave = useCallback((t: string, html: string, p: boolean, imgs: string[], projId: string | null, og?: Record<string, OGData>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(t, html, p, imgs, projId, og), 1000);
  }, [save]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutoSave(val, getEditorHtml(), pinned, images, linkedProjectId);
  };

  const handleContentInput = () => {
    if (isLoadingRef.current) return;
    const html = getEditorHtml();
    setHtmlContent(html);
    triggerAutoSave(title, html, pinned, images, linkedProjectId);
    updateActiveFormats();
  };

  const togglePin = () => {
    const newPinned = !pinned;
    setPinned(newPinned);
    save(title, getEditorHtml(), newPinned, images, linkedProjectId);
  };

  const handleLinkProject = (projId: string | null) => {
    setLinkedProjectId(projId);
    setShowProjectPicker(false);
    save(title, getEditorHtml(), pinned, images, projId);
  };

  const handleDelete = async () => {
    if (!currentNoteId) { onBack(); return; }
    await supabase.from('notes').delete().eq('id', currentNoteId);
    onDelete();
    onBack();
  };

  const handleImageUpload = async (file: File) => {
    if (!isPro) { onUpgrade?.(); return; }
    const ext = file.name.split('.').pop();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('notes-images')
      .upload(path, file);
    if (error) return;
    const { data: urlData } = supabase.storage.from('notes-images').getPublicUrl(path);
    const newImages = [...images, urlData.publicUrl];
    setImages(newImages);
    triggerAutoSave(title, getEditorHtml(), pinned, newImages, linkedProjectId);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleImageUpload(file);
        return;
      }
    }
    // For text paste, let contentEditable handle it but clean up
    // We'll strip excessive formatting from pasted HTML
    const htmlData = e.clipboardData.getData('text/html');
    if (htmlData) {
      e.preventDefault();
      // Insert clean text to avoid bringing external styles
      const plainText = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, plainText);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files) {
      await handleImageUpload(file);
    }
  };

  // ── Rich text commands ──
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

  const insertHr = () => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, '<hr><br>');
    handleContentInput();
  };

  const insertBlockquote = () => {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, 'blockquote');
    handleContentInput();
  };

  const toolbarButtons = [
    { icon: Bold, action: () => execFormat('bold'), title: 'Negrito', format: 'bold' },
    { icon: Italic, action: () => execFormat('italic'), title: 'Itálico', format: 'italic' },
    { icon: Underline, action: () => execFormat('underline'), title: 'Sublinhado', format: 'underline' },
    { icon: Strikethrough, action: () => execFormat('strikethrough'), title: 'Riscado', format: 'strikethrough' },
    { type: 'separator' as const },
    { icon: List, action: () => execFormat('insertUnorderedList'), title: 'Lista', format: 'ul' },
    { icon: ListOrdered, action: () => execFormat('insertOrderedList'), title: 'Lista numerada', format: 'ol' },
    { icon: CheckSquare, action: insertCheckbox, title: 'Checkbox' },
    { type: 'separator' as const },
    { icon: Heading2, action: () => execFormat('formatBlock', 'h2'), title: 'Título', format: 'heading' },
    { icon: Quote, action: insertBlockquote, title: 'Citação' },
    { icon: Minus, action: insertHr, title: 'Separador' },
    { icon: ImagePlus, action: () => fileInputRef.current?.click(), title: 'Imagem' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); execFormat('bold'); }
      if (e.key === 'i') { e.preventDefault(); execFormat('italic'); }
      if (e.key === 'u') { e.preventDefault(); execFormat('underline'); }
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
      e.preventDefault();
      execFormat('strikethrough');
    }
  };

  // Handle checkbox clicks inside editor
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('note-checkbox') || target.closest('.note-checkbox')) {
      const checkbox = target.classList.contains('note-checkbox') ? target : target.closest('.note-checkbox')!;
      checkbox.classList.toggle('checked');
      handleContentInput();
    }
  };

  const linkedProject = projects.find(p => p.id === linkedProjectId);

  return (
    <div className={`flex flex-col overflow-hidden ${isModal ? 'h-full' : 'flex-1'}`} style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ArrowLeft className="w-4 h-4" />
          {isModal ? 'Fechar' : 'Voltar às notas'}
        </button>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && <span className="text-[10px]" style={{ color: 'var(--text-placeholder)' }}>Salvo</span>}
          {saveStatus === 'saving' && <span className="text-[10px]" style={{ color: 'var(--text-placeholder)' }}>Salvando...</span>}
          <button onClick={togglePin} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: pinned ? 'var(--accent-blue)' : 'var(--text-placeholder)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleDelete} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--text-placeholder)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent-amber)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-placeholder)'; }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-1.5 flex-shrink-0 flex-wrap" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
        {toolbarButtons.map((btn, i) => {
          if ('type' in btn && btn.type === 'separator') {
            return <div key={`sep-${i}`} className="w-px h-4 mx-1" style={{ background: 'var(--border-subtle)' }} />;
          }
          const { icon: Icon, action, title, format } = btn as any;
          const isActive = format && activeFormats.has(format);
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
        />
      </div>

      {/* Editor body — WYSIWYG */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
        <input
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Sem título"
          className="w-full bg-transparent outline-none font-bold"
          style={{ fontSize: 20, color: 'var(--text-primary)' }}
          autoFocus={!noteId}
        />

        {/* Rich text editor */}
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

        {/* Inline images */}
        {images.length > 0 && (
          <div className="space-y-3">
            {images.map((url, i) => (
              <div key={i} className="relative group cursor-pointer" onClick={() => setLightboxImg(url)}>
                <img src={url} alt="" className="rounded-lg max-w-full" style={{ maxWidth: 480 }} />
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  style={{ background: 'var(--overlay-bg)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>Expandir</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link previews — PRO only */}
        {isPro && urls.map((url, i) => (
          <LinkPreview
            key={`${url}-${i}`}
            url={url}
            cachedData={ogCache[url] || null}
            onDataLoaded={(u, d) => {
              setOgCache(prev => {
                const next = { ...prev, [u]: d };
                triggerAutoSave(title, getEditorHtml(), pinned, images, linkedProjectId, next);
                return next;
              });
            }}
          />
        ))}
      </div>

      {/* Project link footer */}
      {projects.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 relative" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setShowProjectPicker(!showProjectPicker)}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: 'var(--text-placeholder)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)'; }}
          >
            <Link2 className="w-3 h-3" />
            Vincular a projeto: {linkedProject ? linkedProject.name : 'Nenhum'}
          </button>

          {showProjectPicker && (
            <div className="absolute bottom-full left-4 mb-1 rounded-lg py-1 z-50" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-input)', boxShadow: 'var(--shadow-md)', minWidth: 200 }}>
              <button
                onClick={() => handleLinkProject(null)}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                style={{ color: !linkedProjectId ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Nenhum (nota rápida)
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleLinkProject(p.id)}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors"
                  style={{ color: linkedProjectId === p.id ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'var(--overlay-bg)' }}
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}
