import { TaskStatus } from '@/types/task';

interface StatusCheckboxProps {
  status: TaskStatus;
  onChange?: (status: TaskStatus) => void;
  size?: number;
  quickComplete?: boolean;
}

export function StatusCheckbox({ status, onChange, size = 20, quickComplete = false }: StatusCheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onChange) return;
    let next: TaskStatus;
    if (quickComplete) {
      next = status === 'done' ? 'pending' : 'done';
    } else {
      next = status === 'pending' ? 'in_progress' :
        status === 'in_progress' ? 'done' : 'pending';
    }
    onChange(next);
  };

  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 focus:outline-none"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      aria-label={`Status: ${status}`}
    >
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        {status === 'pending' && (
          <circle cx="10" cy="10" r="8" stroke="hsl(var(--text-muted))" strokeWidth="2" />
        )}
        {status === 'in_progress' && (
          <>
            <circle cx="10" cy="10" r="8" stroke="hsl(var(--status-progress))" strokeWidth="2" />
            <path d="M10 2 A8 8 0 0 1 10 18" fill="hsl(var(--status-progress))" />
          </>
        )}
        {status === 'done' && (
          <>
            <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.08)" />
            <path
              d="M6 10.5L8.5 13L14 7"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-checkmark"
            />
          </>
        )}
      </svg>
    </button>
  );
}
