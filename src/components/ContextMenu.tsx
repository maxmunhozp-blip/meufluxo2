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
      className="fixed z-[100] py-1 rounded-lg border border-nd-border"
      style={{
        left: position.x,
        top: position.y,
        background: 'hsl(var(--bg-surface))',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: 160,
      }}
    >
      {items.map((item, i) => (
        <div key={i} className="relative">
          {item.children ? (
            <button
              onMouseEnter={() => setOpenSub(i)}
              onMouseLeave={() => setOpenSub(null)}
              className="w-full h-8 px-3 text-left text-[13px] rounded hover:bg-nd-hover transition-colors text-nd-text flex items-center justify-between"
            >
              {item.label}
              <ChevronRight className="w-3.5 h-3.5 text-nd-text-muted" />
              {openSub === i && (
                <div
                  className="absolute left-full top-0 ml-1 py-1 rounded-lg border border-nd-border z-[101]"
                  style={{
                    background: 'hsl(var(--bg-surface))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    minWidth: 180,
                    maxHeight: 240,
                    overflowY: 'auto',
                  }}
                >
                  {item.children.map((child, ci) => (
                    <button
                      key={ci}
                      onClick={() => { child.onClick?.(); onClose(); }}
                      className={`w-full h-8 px-3 text-left text-[13px] rounded hover:bg-nd-hover transition-colors truncate ${
                        child.danger ? 'text-nd-overdue' : 'text-nd-text'
                      }`}
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
              className={`w-full h-8 px-3 text-left text-[13px] rounded hover:bg-nd-hover transition-colors ${
                item.danger ? 'text-nd-overdue' : 'text-nd-text'
              }`}
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
