import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
}

interface OGData {
  title: string;
  description: string;
  image: string;
  domain: string;
  isYouTube: boolean;
  videoId?: string;
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const [data, setData] = useState<OGData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke('fetch-og', {
          body: { url },
        });
        if (!cancelled && !error && result && !result.error) {
          setData(result as OGData);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (loading || !data) return null;

  if (data.isYouTube && data.videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden transition-colors group"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', maxWidth: 480 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
      >
        <div className="relative" style={{ aspectRatio: '16/9' }}>
          <img
            src={data.image}
            alt={data.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
              <Play className="w-6 h-6 ml-0.5" style={{ color: 'white' }} fill="white" />
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{data.title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{data.domain}</div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-lg p-3 transition-colors"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
    >
      {data.image && (
        <img
          src={data.image}
          alt=""
          className="flex-shrink-0 rounded object-cover"
          style={{ width: 60, height: 60 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{data.title}</div>
        {data.description && (
          <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{data.description}</div>
        )}
        <div className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{data.domain}</div>
      </div>
    </a>
  );
}
