import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
  children?: ContextMenuItem[];
  customContent?: React.ReactNode;
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
          {item.customContent ? (
            <div
              onMouseEnter={() => setOpenSub(i)}
              onMouseLeave={() => setOpenSub(null)}
              className="relative"
            >
              <button
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
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {item.label}
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              </button>
              {openSub === i && (
                <div
                  className="absolute left-full top-0 ml-1"
                  style={{
                    zIndex: 9999,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    padding: 8,
                  }}
                  onMouseEnter={() => setOpenSub(i)}
                  onMouseLeave={() => setOpenSub(null)}
                >
                  {item.customContent}
                </div>
              )}
            </div>
          ) : item.children ? (
            <button
              onMouseEnter={() => setOpenSub(i)}
              onMouseLeave={() => setOpenSub(null)}
              className="w-full flex items-center gap-2 select-none"
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
              {item.icon && <span className="flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>{item.icon}</span>}
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
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
              className="w-full flex items-center gap-2 select-none"
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
              {item.icon && <span className="flex-shrink-0" style={{ color: item.danger ? 'var(--error)' : 'var(--text-tertiary)' }}>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
