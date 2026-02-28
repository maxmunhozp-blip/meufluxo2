import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Pin, PinOff, Trash2, Bold, Italic, Underline, Strikethrough, List, ListOrdered, CheckSquare, Minus, Heading2, ImagePlus, Link2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LinkPreview } from './LinkPreview';
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

export function NoteEditor({ noteId, projectId, workspaceId, userId, onBack, onSaved, onDelete, projects = [], isModal = false, isPro = false, onUpgrade }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(projectId);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(noteId);
  const [urls, setUrls] = useState<string[]>([]);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Load note
  useEffect(() => {
    if (!noteId) {
      setTitle('');
      setContent('');
      setPinned(false);
      setLinkedProjectId(projectId);
      setCurrentNoteId(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();
      if (data) {
        setTitle(data.title);
        const c = data.content as any;
        setContent(c?.text || '');
        setImages(c?.images || []);
        setPinned(data.pinned);
        setLinkedProjectId(data.project_id);
        setCurrentNoteId(data.id);
      }
    })();
  }, [noteId]);

  // Extract URLs from content
  useEffect(() => {
    const urlRegex = /https?:\/\/[^\s<>]+/g;
    const found = content.match(urlRegex) || [];
    setUrls(found);
  }, [content]);

  const save = useCallback(async (t: string, c: string, p: boolean, imgs: string[], projId: string | null) => {
    setSaveStatus('saving');
    try {
      if (currentNoteId) {
        await supabase
          .from('notes')
          .update({
            title: t,
            content: { text: c, images: imgs },
            pinned: p,
            project_id: projId,
          })
          .eq('id', currentNoteId);
      } else {
        const { data } = await supabase
          .from('notes')
          .insert({
            title: t,
            content: { text: c, images: imgs },
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
  }, [currentNoteId, workspaceId, userId, onSaved]);

  const triggerAutoSave = useCallback((t: string, c: string, p: boolean, imgs: string[], projId: string | null) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(t, c, p, imgs, projId), 1000);
  }, [save]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutoSave(val, content, pinned, images, linkedProjectId);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    triggerAutoSave(title, val, pinned, images, linkedProjectId);
  };

  const togglePin = () => {
    const newPinned = !pinned;
    setPinned(newPinned);
    save(title, content, newPinned, images, linkedProjectId);
  };

  const handleLinkProject = (projId: string | null) => {
    setLinkedProjectId(projId);
    setShowProjectPicker(false);
    save(title, content, pinned, images, projId);
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
    triggerAutoSave(title, content, pinned, newImages, linkedProjectId);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleImageUpload(file);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    for (const file of files) {
      await handleImageUpload(file);
    }
  };

  const insertFormat = (prefix: string, suffix: string = '') => {
    const el = editorRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    setContent(newContent);
    triggerAutoSave(title, newContent, pinned, images, linkedProjectId);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertFormat('**', '**'), title: 'Negrito (Ctrl+B)' },
    { icon: Italic, action: () => insertFormat('*', '*'), title: 'Itálico (Ctrl+I)' },
    { icon: Underline, action: () => insertFormat('<u>', '</u>'), title: 'Sublinhado (Ctrl+U)' },
    { icon: Strikethrough, action: () => insertFormat('~~', '~~'), title: 'Riscado' },
    { icon: List, action: () => insertFormat('\n- '), title: 'Lista' },
    { icon: ListOrdered, action: () => insertFormat('\n1. '), title: 'Lista numerada' },
    { icon: CheckSquare, action: () => insertFormat('\n[ ] '), title: 'Checkbox' },
    { icon: Minus, action: () => insertFormat('\n---\n'), title: 'Separador' },
    { icon: Heading2, action: () => insertFormat('\n## '), title: 'Heading' },
    { icon: ImagePlus, action: () => fileInputRef.current?.click(), title: 'Imagem' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); insertFormat('**', '**'); }
      if (e.key === 'i') { e.preventDefault(); insertFormat('*', '*'); }
      if (e.key === 'u') { e.preventDefault(); insertFormat('<u>', '</u>'); }
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'X') {
      e.preventDefault();
      insertFormat('~~', '~~');
    }
  };

  const linkedProject = projects.find(p => p.id === linkedProjectId);

  return (
    <div className={`flex flex-col overflow-hidden ${isModal ? 'h-full' : 'flex-1'}`} style={{ background: '#0F0F17' }}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: '#8888A0' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
        >
          <ArrowLeft className="w-4 h-4" />
          {isModal ? 'Fechar' : 'Voltar às notas'}
        </button>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && <span className="text-[10px]" style={{ color: '#555570' }}>Salvo</span>}
          {saveStatus === 'saving' && <span className="text-[10px]" style={{ color: '#555570' }}>Salvando...</span>}
          <button onClick={togglePin} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: pinned ? '#6C9CFC' : '#555570' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleDelete} className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: '#555570' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#FF6B6B'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555570'; }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-1.5 flex-shrink-0" style={{ background: '#1A1A28', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {toolbarButtons.map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            className="w-7 h-7 flex items-center justify-center rounded transition-colors"
            style={{ color: '#8888A0' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#E8E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8888A0'; }}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
        />
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
        <input
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Sem título"
          className="w-full bg-transparent outline-none font-bold"
          style={{ fontSize: 20, color: '#E8E8F0' }}
          autoFocus={!noteId}
        />
        <textarea
          ref={editorRef}
          value={content}
          onChange={e => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Comece a escrever..."
          className="w-full bg-transparent outline-none resize-none min-h-[300px] text-sm leading-relaxed"
          style={{ color: '#E8E8F0' }}
        />

        {/* Inline images */}
        {images.length > 0 && (
          <div className="space-y-3">
            {images.map((url, i) => (
              <div key={i} className="relative group cursor-pointer" onClick={() => setLightboxImg(url)}>
                <img src={url} alt="" className="rounded-lg max-w-full" style={{ maxWidth: 480 }} />
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <span className="text-xs" style={{ color: '#E8E8F0' }}>Expandir</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link previews — PRO only */}
        {isPro && urls.map((url, i) => (
          <LinkPreview key={`${url}-${i}`} url={url} />
        ))}
      </div>

      {/* Project link footer */}
      {projects.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 relative" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <button
            onClick={() => setShowProjectPicker(!showProjectPicker)}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: '#555570' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#8888A0'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#555570'; }}
          >
            <Link2 className="w-3 h-3" />
            Vincular a projeto: {linkedProject ? linkedProject.name : 'Nenhum'}
          </button>

          {showProjectPicker && (
            <div className="absolute bottom-full left-4 mb-1 rounded-lg py-1 shadow-lg z-50" style={{ background: '#1A1A28', border: '1px solid #333350', minWidth: 200 }}>
              <button
                onClick={() => handleLinkProject(null)}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                style={{ color: !linkedProjectId ? '#6C9CFC' : '#8888A0' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Nenhum (nota rápida)
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleLinkProject(p.id)}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors"
                  style={{ color: linkedProjectId === p.id ? '#6C9CFC' : '#8888A0' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
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
          style={{ background: '#0D0D15E6' }}
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
}
