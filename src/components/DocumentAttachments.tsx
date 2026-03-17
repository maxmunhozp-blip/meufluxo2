import { useState, useEffect, useCallback, useRef } from 'react';
import { Paperclip, Upload, Trash2, FileText, FileImage, FileVideo, FileArchive, File, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocAttachment {
  id: string;
  documentId: string;
  workspaceId: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  contentType: string | null;
  createdAt: string;
  url: string;
}

interface DocumentAttachmentsProps {
  documentId: string;
  workspaceId: string;
  userId: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(contentType: string | null, fileName: string) {
  if (contentType?.startsWith('image/')) return FileImage;
  if (contentType?.startsWith('video/')) return FileVideo;
  if (contentType?.includes('pdf') || fileName.endsWith('.pdf')) return FileText;
  if (contentType?.includes('zip') || contentType?.includes('rar') || contentType?.includes('tar')) return FileArchive;
  if (fileName.endsWith('.md') || fileName.endsWith('.txt') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return FileText;
  return File;
}

export function DocumentAttachments({ documentId, workspaceId, userId }: DocumentAttachmentsProps) {
  const [attachments, setAttachments] = useState<DocAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const loadAttachments = useCallback(async () => {
    const { data, error } = await (supabase.from('document_attachments' as any) as any)
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) { console.error('Error loading doc attachments', error); return; }
    setAttachments((data || []).map((a: any) => ({
      id: a.id,
      documentId: a.document_id,
      workspaceId: a.workspace_id,
      userId: a.user_id,
      fileName: a.file_name,
      filePath: a.file_path,
      fileSize: a.file_size,
      contentType: a.content_type,
      createdAt: a.created_at,
      url: `${SUPABASE_URL}/storage/v1/object/public/document-attachments/${a.file_path}`,
    })));
  }, [documentId, SUPABASE_URL]);

  useEffect(() => { loadAttachments(); }, [loadAttachments]);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande (máx 100MB)');
      return;
    }
    setUploading(true);
    setUploadProgress(file.name);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${documentId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase.from('document_attachments' as any) as any).insert({
        document_id: documentId,
        workspace_id: workspaceId,
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type || null,
      });
      if (dbError) throw dbError;

      toast.success('Arquivo enviado');
      loadAttachments();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }, [documentId, workspaceId, userId, loadAttachments]);

  const handleDelete = useCallback(async (att: DocAttachment) => {
    try {
      await supabase.storage.from('document-attachments').remove([att.filePath]);
      await (supabase.from('document_attachments' as any) as any).delete().eq('id', att.id);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
      toast.success('Anexo removido');
    } catch {
      toast.error('Erro ao remover anexo');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(f => handleUpload(f));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length) {
      Array.from(files).forEach(f => handleUpload(f));
    }
  }, [handleUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="flex flex-col h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Anexos
            {attachments.length > 0 && (
              <span className="ml-1.5 text-xs" style={{ color: 'var(--text-placeholder)' }}>({attachments.length})</span>
            )}
          </span>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors"
          style={{
            color: 'var(--accent-blue)',
            background: 'var(--accent-subtle)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-subtle)'; }}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Enviar
        </button>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-placeholder)', background: 'var(--bg-surface)' }}>
          <Loader2 className="w-3 h-3 animate-spin" />
          Enviando {uploadProgress}...
        </div>
      )}

      {/* Attachments list */}
      <div className="flex-1 overflow-y-auto p-2">
        {attachments.length === 0 && !uploading && (
          <div
            className="flex flex-col items-center justify-center py-8 text-center cursor-pointer rounded-lg border-2 border-dashed transition-colors mx-2 my-2"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-placeholder)' }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
          >
            <Upload className="w-6 h-6 mb-2" />
            <span className="text-xs">Arraste arquivos ou clique para enviar</span>
            <span className="text-[10px] mt-1">PDF, vídeos, documentos — até 100MB</span>
          </div>
        )}

        {attachments.map(att => {
          const Icon = getFileIcon(att.contentType, att.fileName);
          const isImage = att.contentType?.startsWith('image/');

          return (
            <div
              key={att.id}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md group transition-colors"
              style={{ background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {isImage ? (
                <img
                  src={att.url}
                  alt={att.fileName}
                  className="w-9 h-9 rounded object-cover flex-shrink-0"
                  style={{ border: '1px solid var(--border-subtle)' }}
                />
              ) : (
                <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </div>
              )}
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0"
              >
                <div className="text-xs truncate hover:underline" style={{ color: 'var(--text-primary)' }}>
                  {att.fileName}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-placeholder)' }}>
                  {formatFileSize(att.fileSize)}
                </div>
              </a>
              <button
                onClick={() => handleDelete(att)}
                className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-placeholder)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-red, #ef4444)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)'; }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
