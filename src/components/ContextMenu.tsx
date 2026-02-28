import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  children?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<number | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed"
      style={{
        left: position.x,
        top: position.y,
        zIndex: 9999,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        padding: 4,
        minWidth: 160,
      }}
    >
      {items.map((item, i) => (
        <div key={i} className="relative">
          {item.children ? (
            <button
              onMouseEnter={() => setOpenSub(i)}
              onMouseLeave={() => setOpenSub(null)}
              className="w-full flex items-center justify-between select-none"
              style={{
                height: 36,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--text-primary)',
                transition: 'all 150ms ease-out',
              }}
              onMouseDown={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
            >
              {item.label}
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              {openSub === i && (
                <div
                  className="absolute left-full top-0 ml-1"
                  style={{
                    zIndex: 9999,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    padding: 4,
                    minWidth: 180,
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}
                >
                  {item.children.map((child, ci) => (
                    <button
                      key={ci}
                      onClick={() => { child.onClick?.(); onClose(); }}
                      className="w-full text-left truncate select-none"
                      style={{
                        height: 36,
                        padding: '8px 12px',
                        borderRadius: 6,
                        fontSize: 14,
                        fontWeight: 400,
                        color: child.danger ? 'var(--error)' : 'var(--text-primary)',
                        transition: 'all 150ms ease-out',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = child.danger ? 'var(--error-bg)' : 'var(--bg-overlay)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => { item.onClick?.(); onClose(); }}
              className="w-full text-left select-none"
              style={{
                height: 36,
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 400,
                color: item.danger ? 'var(--error)' : 'var(--text-primary)',
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'var(--error-bg)' : 'var(--bg-overlay)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
