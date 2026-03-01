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
import { AlertTriangle } from 'lucide-react';

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

const initialState: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: undefined,
  onConfirm: () => {},
};

/**
 * Neurodivergent-safe confirmation dialog.
 *
 * Design principles (Sabharwal 2026, W3C COGA, NNGroup):
 * – Clareza sobre consequências, não "Tem certeza?"
 * – Botão destrutivo com label específico da ação
 * – Tom informativo (Amber), não punitivo (Red)
 * – Saída segura proeminente (Cancelar como opção primária visual)
 * – Animação mínima (150ms) para reduzir carga sensorial
 * – Escape + click fora = cancelar (mapeamento natural)
 */
export function useConfirmAction(): [ReactNode, (title: string, description: string, confirmLabel?: string) => Promise<boolean>] {
  const [state, setState] = useState<ConfirmState>(initialState);
  const resolveRef = { current: null as ((v: boolean) => void) | null };

  const confirm = useCallback((title: string, description: string, confirmLabel?: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, title, description, confirmLabel, onConfirm: () => resolve(true) });
    });
  }, []);

  const handleClose = useCallback((confirmed: boolean) => {
    if (resolveRef.current) resolveRef.current(confirmed);
    setState(initialState);
  }, []);

  const dialog = (
    <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) handleClose(false); }}>
      <AlertDialogContent
        className="max-w-[380px] rounded-2xl border p-0 shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-input, hsl(var(--border)))',
        }}
      >
        {/* Amber accent strip — informative, not punitive */}
        <div
          className="h-1 w-full"
          style={{ background: 'var(--accent-amber, #FBBF24)' }}
        />

        <div className="px-6 pt-5 pb-2">
          <AlertDialogHeader className="space-y-3">
            {/* Icon: Amber triangle — non-threatening severity signal */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
              style={{
                background: 'rgba(251, 191, 36, 0.12)',
              }}
            >
              <AlertTriangle
                className="w-5 h-5"
                style={{ color: 'var(--accent-amber, #FBBF24)' }}
              />
            </div>

            <AlertDialogTitle
              className="text-center"
              style={{
                fontSize: 16,
                fontWeight: 600,
                lineHeight: 1.4,
                color: 'var(--text-primary)',
              }}
            >
              {state.title}
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center"
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
              }}
            >
              {state.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="px-6 pb-5 pt-2 flex-row gap-3 sm:space-x-0">
          {/* Safe exit: visually prominent, first in tab order */}
          <AlertDialogCancel
            className="flex-1 h-10 rounded-xl text-[13px] font-medium transition-colors duration-150 border-0"
            style={{
              background: 'var(--bg-overlay)',
              color: 'var(--text-primary)',
            }}
            onClick={() => handleClose(false)}
          >
            Cancelar
          </AlertDialogCancel>

          {/* Destructive action: specific label, muted red (non-punitive) */}
          <AlertDialogAction
            className="flex-1 h-10 rounded-xl text-[13px] font-medium transition-colors duration-150 border-0"
            style={{
              background: 'hsl(var(--destructive) / 0.85)',
              color: 'hsl(var(--destructive-foreground))',
            }}
            onClick={() => handleClose(true)}
          >
            {state.confirmLabel || 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [dialog, confirm];
}
