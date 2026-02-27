import { useCallback, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';

export interface UndoAction {
  label: string;
  undo: () => void | Promise<void>;
}

const MAX_STACK = 30;

/**
 * Global undo stack with Ctrl+Z / Cmd+Z support.
 * Each push stores a label + undo callback.
 * The keyboard shortcut pops the most recent action and executes its undo.
 */
export function useUndoStack() {
  const stackRef = useRef<UndoAction[]>([]);

  const push = useCallback((action: UndoAction) => {
    stackRef.current = [...stackRef.current.slice(-(MAX_STACK - 1)), action];
  }, []);

  const pop = useCallback((): UndoAction | undefined => {
    const stack = stackRef.current;
    if (stack.length === 0) return undefined;
    const last = stack[stack.length - 1];
    stackRef.current = stack.slice(0, -1);
    return last;
  }, []);

  const handleUndo = useCallback(async () => {
    const action = pop();
    if (action) {
      await action.undo();
      toast({ title: `↩ ${action.label} desfeito`, duration: 2000 });
    }
  }, [pop]);

  // Listen for Ctrl+Z / Cmd+Z globally (skip when inside inputs)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (isInput) return; // let native undo handle it
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo]);

  return { push, pop, handleUndo };
}
