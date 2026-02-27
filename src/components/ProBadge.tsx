import { Sparkles } from 'lucide-react';

interface ProBadgeProps {
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function ProBadge({ className = '', onClick }: ProBadgeProps) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide cursor-pointer select-none border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors ${className}`}
    >
      <Sparkles className="w-2.5 h-2.5" />
      PRO
    </span>
  );
}
