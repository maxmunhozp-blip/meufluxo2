import { useState, useCallback, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

const initialState: ConfirmState = {
  open: false,
  title: '',
  description: '',
  onConfirm: () => {},
};

/**
 * Lightweight imperative confirm replacement.
 * Returns [DialogNode, confirm(title, description) => Promise<boolean>]
 */
export function useConfirmAction(): [ReactNode, (title: string, description: string) => Promise<boolean>] {
  const [state, setState] = useState<ConfirmState>(initialState);
  const resolveRef = { current: null as ((v: boolean) => void) | null };

  const confirm = useCallback((title: string, description: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, title, description, onConfirm: () => resolve(true) });
    });
  }, []);

  const handleClose = useCallback((confirmed: boolean) => {
    if (resolveRef.current) resolveRef.current(confirmed);
    setState(initialState);
  }, []);

  const dialog = (
    <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) handleClose(false); }}>
      <AlertDialogContent className="max-w-[360px] rounded-2xl border-border/50 bg-background p-6 shadow-2xl">
        <AlertDialogHeader className="space-y-2">
          <AlertDialogTitle className="text-base font-semibold text-foreground">
            {state.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
            {state.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 flex-row gap-2 sm:space-x-0">
          <AlertDialogCancel
            className="flex-1 rounded-lg border-border/50 bg-muted/50 text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
            onClick={() => handleClose(false)}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="flex-1 rounded-lg bg-destructive/90 text-[13px] font-medium text-destructive-foreground hover:bg-destructive transition-colors"
            onClick={() => handleClose(true)}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [dialog, confirm];
}
