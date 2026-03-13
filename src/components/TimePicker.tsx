import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TimePickerProps {
  value?: string; // "HH:MM"
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 5-min increments

function pad(n: number) { return n.toString().padStart(2, '0'); }

function ScrollWheel({ items, selected, onSelect, formatFn }: {
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
  formatFn: (v: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 36;
  const didMount = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = items.indexOf(selected);
    if (idx === -1) return;
    el.scrollTo({ top: idx * itemHeight, behavior: didMount.current ? 'smooth' : 'instant' });
    didMount.current = true;
  }, [selected, items]);

  return (
    <div className="relative h-[180px] w-[72px] overflow-hidden">
      {/* Gradient overlays — Apple-style fade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[72px] z-10"
        style={{ background: 'linear-gradient(to bottom, var(--bg-surface) 0%, transparent 100%)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72px] z-10"
        style={{ background: 'linear-gradient(to top, var(--bg-surface) 0%, transparent 100%)' }} />
      {/* Selection highlight */}
      <div className="absolute inset-x-1 z-[5] rounded-lg pointer-events-none"
        style={{ top: 72, height: itemHeight, background: 'var(--accent-subtle)', border: '1px solid hsl(var(--primary) / 0.25)' }} />
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide"
        style={{ paddingTop: 72, paddingBottom: 72, scrollSnapType: 'y mandatory' }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollTop / itemHeight);
          const clamped = Math.max(0, Math.min(items.length - 1, idx));
          if (items[clamped] !== selected) onSelect(items[clamped]);
        }}
      >
        {items.map((item) => {
          const isSelected = item === selected;
          return (
            <button
              key={item}
              onClick={() => onSelect(item)}
              className="w-full flex items-center justify-center transition-all duration-150"
              style={{
                height: itemHeight,
                scrollSnapAlign: 'start',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontSize: isSelected ? 20 : 15,
                fontWeight: isSelected ? 600 : 400,
                fontVariantNumeric: 'tabular-nums',
                opacity: isSelected ? 1 : 0.6,
              }}
            >
              {formatFn(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimePicker({ value, onChange, placeholder = 'Definir horário' }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? value.split(':').map(Number) : null;
  const [hour, setHour] = useState(parsed?.[0] ?? new Date().getHours());
  const [minute, setMinute] = useState(() => {
    if (!parsed) return Math.round(new Date().getMinutes() / 5) * 5;
    // Snap to nearest 5
    return Math.round(parsed[1] / 5) * 5;
  });

  // Sync when value changes externally
  useEffect(() => {
    if (!value) return;
    const [h, m] = value.split(':').map(Number);
    setHour(h);
    setMinute(Math.round(m / 5) * 5);
  }, [value]);

  const handleConfirm = useCallback(() => {
    onChange(`${pad(hour)}:${pad(minute)}`);
    setOpen(false);
  }, [hour, minute, onChange]);

  const handleClear = useCallback(() => {
    onChange(undefined);
    setOpen(false);
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 h-8 px-2 rounded-md cursor-pointer transition-all duration-200 group"
          style={{
            background: value ? 'var(--accent-subtle)' : 'transparent',
            border: value ? '1px solid hsl(var(--primary) / 0.2)' : '1px solid transparent',
          }}
          onMouseEnter={e => { if (!value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (!value) e.currentTarget.style.background = 'transparent'; }}
        >
          <Clock
            className="w-3.5 h-3.5 transition-colors duration-200"
            style={{ color: value ? 'hsl(var(--primary))' : 'var(--text-tertiary)' }}
          />
          <span
            className="text-[13px] tabular-nums font-medium transition-colors duration-200"
            style={{ color: value ? 'var(--text-primary)' : 'var(--text-placeholder)', letterSpacing: value ? '0.5px' : '0' }}
          >
            {value || placeholder}
          </span>
          {value && (
            <span
              className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
            >
              <X className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <AnimatePresence>
        {open && (
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={4}
            className="w-auto p-0 border-0 shadow-none bg-transparent pointer-events-auto"
            asChild
            forceMount
          >
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg), 0 0 0 1px var(--border-subtle)',
              }}
            >
              {/* Header */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Horário
                </span>
                <motion.span
                  key={`${pad(hour)}:${pad(minute)}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[18px] font-bold tabular-nums"
                  style={{ color: 'hsl(var(--primary))', letterSpacing: '1px' }}
                >
                  {pad(hour)}:{pad(minute)}
                </motion.span>
              </div>

              {/* Separator */}
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />

              {/* Scroll wheels */}
              <div className="flex items-center px-2 py-1">
                <ScrollWheel
                  items={HOURS}
                  selected={hour}
                  onSelect={setHour}
                  formatFn={pad}
                />
                <div className="flex flex-col items-center justify-center px-1" style={{ height: 36 }}>
                  <span className="text-[20px] font-bold" style={{ color: 'var(--text-tertiary)' }}>:</span>
                </div>
                <ScrollWheel
                  items={MINUTES}
                  selected={minute}
                  onSelect={setMinute}
                  formatFn={pad}
                />
              </div>

              {/* Separator */}
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />

              {/* Actions */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                {value && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClear}
                    className="flex-1 h-8 rounded-lg text-[12px] font-medium transition-colors duration-150"
                    style={{ color: 'var(--text-secondary)', background: 'var(--bg-hover)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  >
                    Limpar
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirm}
                  className="flex-1 h-8 rounded-lg text-[12px] font-semibold transition-all duration-150"
                  style={{
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
                >
                  Confirmar
                </motion.button>
              </div>
            </motion.div>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
