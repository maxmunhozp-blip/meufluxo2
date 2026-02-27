import { ArrowLeft, Check, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FREE_FEATURES = [
  { label: '1 Workspace', included: true },
  { label: '3 Projetos', included: true },
  { label: '20 Tarefas por projeto', included: true },
  { label: '2 Membros', included: true },
  { label: 'Meu Dia & Minha Semana', included: true },
  { label: 'Tags de Serviço', included: true },
  { label: 'Subtarefas', included: true },
  { label: 'Timeline View', included: false },
  { label: 'Tarefas Recorrentes', included: false },
  { label: 'Rollover Automático', included: false },
  { label: 'Workspaces ilimitados', included: false },
  { label: 'Projetos ilimitados', included: false },
  { label: 'Tarefas ilimitadas', included: false },
  { label: 'Membros ilimitados', included: false },
];

const PRO_FEATURES = [
  { label: 'Workspaces ilimitados', included: true },
  { label: 'Projetos ilimitados', included: true },
  { label: 'Tarefas ilimitadas', included: true },
  { label: 'Membros ilimitados', included: true },
  { label: 'Meu Dia & Minha Semana', included: true },
  { label: 'Tags de Serviço', included: true },
  { label: 'Subtarefas', included: true },
  { label: 'Timeline View', included: true },
  { label: 'Tarefas Recorrentes', included: true },
  { label: 'Rollover Automático', included: true },
  { label: 'Suporte prioritário', included: true },
];

export default function Plans() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--bg-app))' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-6 h-14 flex-shrink-0 border-b border-border">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-[16px] font-semibold text-foreground">Planos</h1>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-10 overflow-y-auto">
        <div className="grid md:grid-cols-2 gap-6 max-w-[720px] w-full">

          {/* Free Plan */}
          <div className="rounded-xl border border-border p-6" style={{ background: 'hsl(var(--bg-surface))' }}>
            <div className="mb-6">
              <h2 className="text-[20px] font-bold text-foreground">Free</h2>
              <p className="text-[13px] text-muted-foreground mt-1">Para começar a organizar</p>
              <div className="mt-4">
                <span className="text-[32px] font-bold text-foreground">R$0</span>
                <span className="text-[13px] text-muted-foreground ml-1">/mês</span>
              </div>
            </div>

            <button
              disabled
              className="w-full h-10 rounded-lg border border-border text-[13px] font-medium text-muted-foreground cursor-not-allowed opacity-50 mb-6"
            >
              Plano atual
            </button>

            <ul className="space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5">
                  {f.included ? (
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(142 71% 45%)' }} />
                  ) : (
                    <X className="w-4 h-4 flex-shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={`text-[13px] ${f.included ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div
            className="relative rounded-xl border p-6"
            style={{
              background: 'hsl(var(--bg-surface))',
              borderColor: 'hsl(45 93% 47% / 0.3)',
            }}
          >
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, hsl(45 93% 47%), hsl(35 93% 47%))',
                color: 'white',
                boxShadow: '0 2px 8px hsl(45 93% 47% / 0.3)',
              }}
            >
              Recomendado
            </div>

            <div className="mb-6">
              <h2 className="text-[20px] font-bold text-foreground flex items-center gap-2">
                Pro
                <Sparkles className="w-5 h-5" style={{ color: 'hsl(45 93% 47%)' }} />
              </h2>
              <p className="text-[13px] text-muted-foreground mt-1">Para profissionais e equipes</p>
              <div className="mt-4">
                <span className="text-[32px] font-bold text-foreground">R$29</span>
                <span className="text-[13px] text-muted-foreground ml-1">/mês</span>
              </div>
            </div>

            <button
              className="w-full h-10 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, hsl(45 93% 47%), hsl(35 93% 47%))',
                boxShadow: '0 2px 12px hsl(45 93% 47% / 0.25)',
              }}
            >
              Fazer Upgrade
            </button>

            <ul className="space-y-3 mt-6">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(45 93% 47%)' }} />
                  <span className="text-[13px] text-foreground">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
