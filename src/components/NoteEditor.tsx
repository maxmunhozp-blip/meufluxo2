import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Pin, PinOff, Trash2, Bold, Italic, Underline, Strikethrough, List, ListOrdered, CheckSquare, Minus, Heading2, ImagePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LinkPreview } from './LinkPreview';

interface NoteEditorProps {
  noteId: string | null;
  projectId: string;
  workspaceId: string;
  userId: string;
  onBack: () => void;
  onSaved: () => void;
  onDelete: () => void;
}

export function NoteEditor({ noteId, projectId, workspaceId, userId, onBack, onSaved, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
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

  const save = useCallback(async (t: string, c: string, p: boolean, imgs: string[]) => {
    setSaveStatus('saving');
    try {
      if (currentNoteId) {
        await supabase
          .from('notes')
          .update({
            title: t,
            content: { text: c, images: imgs },
            pinned: p,
          })
          .eq('id', currentNoteId);
      } else {
        const { data } = await supabase
          .from('notes')
          .insert({
            title: t,
            content: { text: c, images: imgs },
            pinned: p,
            project_id: projectId,
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
  }, [currentNoteId, projectId, workspaceId, userId, onSaved]);

  const triggerAutoSave = useCallback((t: string, c: string, p: boolean, imgs: string[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(t, c, p, imgs), 1000);
  }, [save]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutoSave(val, content, pinned, images);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    triggerAutoSave(title, val, pinned, images);
  };

  const togglePin = () => {
    const newPinned = !pinned;
    setPinned(newPinned);
    save(title, content, newPinned, images);
  };

  const handleDelete = async () => {
    if (!currentNoteId) { onBack(); return; }
    await supabase.from('notes').delete().eq('id', currentNoteId);
    onDelete();
    onBack();
  };

  const handleImageUpload = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('notes-images')
      .upload(path, file);
    if (error) return;
    const { data: urlData } = supabase.storage.from('notes-images').getPublicUrl(path);
    const newImages = [...images, urlData.publicUrl];
    setImages(newImages);
    triggerAutoSave(title, content, pinned, newImages);
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
    triggerAutoSave(title, newContent, pinned, images);
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0F0F17' }}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: '#8888A0' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8E8F0'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8888A0'; }}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar às notas
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

        {/* Link previews */}
        {urls.map((url, i) => (
          <LinkPreview key={`${url}-${i}`} url={url} />
        ))}
      </div>

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
