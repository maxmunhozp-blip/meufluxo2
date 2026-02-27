import { TaskStatus } from '@/types/task';

interface StatusCheckboxProps {
  status: TaskStatus;
  onChange?: (status: TaskStatus) => void;
  size?: number;
}

export function StatusCheckbox({ status, onChange, size = 18 }: StatusCheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onChange) return;
    const next: TaskStatus =
      status === 'pending' ? 'in_progress' :
      status === 'in_progress' ? 'done' : 'pending';
    onChange(next);
  };

  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 focus:outline-none"
      style={{ width: size, height: size }}
      aria-label={`Status: ${status}`}
    >
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        {status === 'pending' && (
          <circle cx="9" cy="9" r="7.5" stroke="hsl(var(--status-pending))" strokeWidth="2" />
        )}
        {status === 'in_progress' && (
          <>
            <circle cx="9" cy="9" r="7.5" stroke="hsl(var(--status-progress))" strokeWidth="2" />
            <path d="M9 1.5 A7.5 7.5 0 0 1 9 16.5" fill="hsl(var(--status-progress))" />
          </>
        )}
        {status === 'done' && (
          <>
            <circle cx="9" cy="9" r="8.5" fill="hsl(var(--status-done))" />
            <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </button>
  );
}
