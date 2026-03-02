import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';

interface InlineSubtaskInputProps {
  taskId: string;
  onAddSubtask?: (parentTaskId: string, name: string) => Promise<void>;
}

export function InlineSubtaskInput({ taskId, onAddSubtask }: InlineSubtaskInputProps) {
  const [isActive, setIsActive] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setIsActive(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || !onAddSubtask) return;
    setValue('');
    await onAddSubtask(taskId, trimmed);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!isActive) {
    return (
      <button
        onClick={open}
        className="subtask-add-btn h-7 w-full pl-6 md:pl-8 pr-4 flex items-center gap-1.5 transition-colors group/add"
        style={{ color: 'var(--text-placeholder)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-placeholder)'; }}
      >
        <Plus className="w-3 h-3" />
        <span className="text-[12px]">Adicionar subtarefa...</span>
      </button>
    );
  }

  return (
    <div className="pl-6 md:pl-8 pr-4 py-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); submit(); }
          if (e.key === 'Escape') { setIsActive(false); setValue(''); }
        }}
        onBlur={() => { if (!value.trim()) setIsActive(false); }}
        placeholder="Nome da subtarefa..."
        className="subtask-inline-input w-full h-8 px-2.5 text-[13px] rounded-md border focus:outline-none"
        style={{
          background: 'var(--bg-input)',
          borderColor: 'var(--border-input)',
          color: 'var(--text-primary)',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border-input)'; }}
      />
    </div>
  );
}
