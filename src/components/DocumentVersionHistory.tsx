import { useState, useEffect } from 'react';
import { History, RotateCcw, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentVersion {
  id: string;
  document_id: string;
  title: string;
  content: Record<string, any>;
  created_at: string;
  created_by: string;
}

interface DocumentVersionHistoryProps {
  documentId: string;
  onRestore: (title: string, content: Record<string, any>) => void;
  onClose: () => void;
}

export function DocumentVersionHistory({ documentId, onRestore, onClose }: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('document_versions' as any)
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(30);
      setVersions((data || []) as unknown as DocumentVersion[]);
      setLoading(false);
    })();
  }, [documentId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHrs < 24) return `${diffHrs}h atrás`;

    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  const getPreviewText = (content: Record<string, any>) => {
    const html = content?.html || '';
    if (!html) return 'Documento vazio';
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.innerText || '';
    return text.slice(0, 120) + (text.length > 120 ? '...' : '');
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Histórico de Versões</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preview area */}
      {previewVersion && (
        <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Pré-visualização — {formatDate(previewVersion.created_at)}
              </span>
              <button
                onClick={() => {
                  onRestore(previewVersion.title, previewVersion.content);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: 'var(--accent-blue)',
                  color: '#fff',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar esta versão
              </button>
            </div>
            <div className="font-bold mb-1" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
              {previewVersion.title}
            </div>
            <div
              className="note-rich-editor max-h-40 overflow-y-auto"
              style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', opacity: 0.8, pointerEvents: 'none' }}
              dangerouslySetInnerHTML={{ __html: previewVersion.content?.html || '<em style="color:var(--text-placeholder)">Sem conteúdo</em>' }}
            />
          </div>
        </div>
      )}

      {/* Version list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>Carregando versões...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Clock className="w-8 h-8" style={{ color: 'var(--text-placeholder)', opacity: 0.4 }} />
            <span className="text-xs" style={{ color: 'var(--text-placeholder)' }}>Nenhuma versão anterior salva</span>
            <span className="text-[10px]" style={{ color: 'var(--text-placeholder)' }}>Versões são criadas automaticamente ao editar</span>
          </div>
        ) : (
          <div className="py-1">
            {versions.map((v, i) => {
              const isSelected = previewVersion?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setPreviewVersion(isSelected ? null : v)}
                  className="w-full text-left px-4 py-3 transition-colors"
                  style={{
                    background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                    borderLeft: isSelected ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium" style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                      {i === 0 ? 'Versão mais recente' : formatDate(v.created_at)}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {v.title}
                  </div>
                  <div className="text-[10px] line-clamp-2" style={{ color: 'var(--text-placeholder)' }}>
                    {getPreviewText(v.content)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
