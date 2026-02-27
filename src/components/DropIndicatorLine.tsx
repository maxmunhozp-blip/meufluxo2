interface DropIndicatorLineProps {
  position: 'top' | 'bottom';
}

export function DropIndicatorLine({ position }: DropIndicatorLineProps) {
  return (
    <div
      className={`absolute left-4 right-4 z-20 pointer-events-none ${
        position === 'top' ? '-top-[1px]' : '-bottom-[1px]'
      }`}
      style={{ animation: 'dropline-in 150ms ease-out both' }}
    >
      {/* Anchor dot */}
      <div
        className={`absolute w-[8px] h-[8px] rounded-full -left-[3px] ${
          position === 'top' ? '-top-[3px]' : '-top-[3px]'
        }`}
        style={{
          background: 'hsl(var(--primary))',
          boxShadow: '0 0 6px hsl(var(--primary) / 0.5)',
        }}
      />
      {/* Line */}
      <div
        className="h-[2px] rounded-full"
        style={{
          background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.4))',
          boxShadow: '0 0 4px hsl(var(--primary) / 0.3)',
        }}
      />
    </div>
  );
}
