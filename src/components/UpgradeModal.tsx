import { X, Sparkles, Check, CheckCircle2 } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function UpgradeModal({ open, onClose, title, message }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-[800px] max-w-[95vw] bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 mb-4 shadow-lg shadow-yellow-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {title || 'Desbloqueie todo o potencial'}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {message || 'Você atingiu o limite do plano gratuito. Faça upgrade para o Pro e tenha acesso ilimitado a todas as funcionalidades.'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free Plan */}
            <div className="p-6 rounded-xl border border-border bg-card/50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Free</h3>
                  <p className="text-sm text-muted-foreground">Para começar</p>
                </div>
                <span className="text-xl font-bold text-foreground">R$0</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" /> 1 Workspace
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" /> 3 Projetos
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" /> 20 Tarefas por projeto
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" /> 2 Membros
                </li>
              </ul>
              <button 
                className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground cursor-not-allowed opacity-50"
                disabled
              >
                Plano atual
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative p-6 rounded-xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full text-[10px] font-bold text-white uppercase tracking-wide shadow-lg shadow-yellow-500/20">
                Recomendado
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    Pro <Sparkles className="w-4 h-4 text-yellow-500" />
                  </h3>
                  <p className="text-sm text-muted-foreground">Para profissionais</p>
                </div>
                <span className="text-xl font-bold text-foreground">R$29<span className="text-sm font-normal text-muted-foreground">/mês</span></span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-yellow-500" /> Tudo ilimitado
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-yellow-500" /> Timeline View
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-yellow-500" /> Tarefas Recorrentes
                </li>
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-yellow-500" /> Rollover Automático
                </li>
              </ul>
              <button 
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-lg shadow-yellow-500/20"
              >
                Fazer Upgrade
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
