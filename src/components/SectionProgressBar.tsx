import { Check } from 'lucide-react';
import { Task } from '@/types/task';

interface ProgressBarProps {
  tasks: Task[];
}

export function SectionProgressBar({ tasks }: ProgressBarProps) {
  if (tasks.length === 0) return null;

  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const total = tasks.length;
  const donePct = (done / total) * 100;
  const progressPct = (inProgress / total) * 100;
  const allDone = done === total;

  return (
    <div className="px-6 pb-1">
      <div className="w-full h-[3px] rounded-full bg-nd-hover overflow-hidden flex">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${donePct}%`, background: 'hsl(var(--status-done))' }}
        />
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%`, background: 'hsl(var(--status-progress))' }}
        />
      </div>
      {allDone && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Check className="w-3.5 h-3.5 text-nd-done" />
          <span className="text-[12px] font-medium text-nd-done">Tudo pronto!</span>
        </div>
      )}
    </div>
  );
}
