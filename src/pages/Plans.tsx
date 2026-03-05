import { ArrowLeft, Check, X, Sparkles, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'Para começar a organizar seus projetos',
    icon: Zap,
    accent: 'var(--text-secondary)',
    accentGlow: 'transparent',
    badge: null,
    cta: 'Plano atual',
    ctaDisabled: true,
    features: [
      { label: '1 Workspace', included: true },
      { label: '3 Projetos', included: true },
      { label: '20 Tarefas por projeto', included: true },
      { label: '2 Membros', included: true },
      { label: 'Meu Dia & Minha Semana', included: true },
      { label: 'Tipos de trabalho', included: true },
      { label: 'Subtarefas (1 nível)', included: true },
      { label: '5 Notas', included: true },
      { label: 'Timeline View', included: false },
      { label: 'Tarefas Recorrentes', included: false },
      { label: 'Rollover Automático', included: false },
      { label: 'Relatórios & IA', included: false },
    ],
  },
  {
    name: 'Pro',
    price: 19,
    description: 'Para profissionais que precisam de mais',
    icon: Sparkles,
    accent: 'hsl(45 93% 47%)',
    accentGlow: 'hsl(45 93% 47% / 0.2)',
    badge: 'Mais popular',
    cta: 'Fazer Upgrade',
    ctaDisabled: false,
    features: [
      { label: '3 Workspaces', included: true },
      { label: 'Projetos ilimitados', included: true },
      { label: 'Tarefas ilimitadas', included: true },
      { label: '5 Membros', included: true },
      { label: 'Subtarefas multinível', included: true },
      { label: 'Notas ilimitadas', included: true },
      { label: 'Timeline View', included: true },
      { label: 'Tarefas Recorrentes', included: true },
      { label: 'Rollover Automático', included: true },
      { label: 'Templates de entrega', included: true },
      { label: 'Anexos & Comentários', included: true },
      { label: 'Suporte prioritário', included: true },
    ],
  },
  {
    name: 'Expert',
    price: 49,
    description: 'Para equipes e agências que escalam',
    icon: Crown,
    accent: 'hsl(265 80% 60%)',
    accentGlow: 'hsl(265 80% 60% / 0.2)',
    badge: 'Para equipes',
    cta: 'Começar com Expert',
    ctaDisabled: false,
    features: [
      { label: 'Workspaces ilimitados', included: true },
      { label: 'Projetos ilimitados', included: true },
      { label: 'Tarefas ilimitadas', included: true },
      { label: 'Membros ilimitados', included: true },
      { label: 'Tudo do Pro', included: true },
      { label: 'IA integrada', included: true, highlight: true },
      { label: 'Relatórios mensais', included: true, highlight: true },
      { label: 'Exportação PDF', included: true, highlight: true },
      { label: 'Métricas & Analytics', included: true, highlight: true },
      { label: 'Auto-categorização IA', included: true, highlight: true },
      { label: 'Suporte dedicado', included: true },
    ],
  },
];

export default function Plans() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--bg-app))' }}>
      {/* Header */}
      <header className="flex items-center gap-3 px-6 h-14 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => navigate('/app')}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Planos</h1>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-4 py-12 overflow-y-auto">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Escolha o plano ideal
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
            Comece grátis. Evolua quando precisar.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-5 max-w-[960px] w-full">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isPro = plan.name === 'Pro';
            const isExpert = plan.name === 'Expert';
            const highlighted = isPro;

            return (
              <div
                key={plan.name}
                className="relative rounded-2xl border p-6 flex flex-col"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: highlighted ? plan.accent : 'var(--border-subtle)',
                  borderWidth: highlighted ? 2 : 1,
                  boxShadow: highlighted ? `0 0 32px ${plan.accentGlow}` : undefined,
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase' as const,
                      background: isPro
                        ? 'linear-gradient(135deg, hsl(45 93% 47%), hsl(35 93% 47%))'
                        : 'linear-gradient(135deg, hsl(265 80% 60%), hsl(285 70% 55%))',
                      color: 'white',
                      boxShadow: `0 2px 8px ${plan.accentGlow}`,
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className="w-5 h-5"
                      strokeWidth={1.5}
                      style={{ color: plan.name === 'Free' ? 'var(--text-secondary)' : plan.accent }}
                    />
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {plan.name}
                    </h3>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {plan.price === 0 ? 'Grátis' : `R$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 4 }}>/mês</span>
                  )}
                </div>

                {/* CTA */}
                <button
                  disabled={plan.ctaDisabled}
                  className="w-full h-11 rounded-xl text-[13px] font-bold transition-all mb-6"
                  style={{
                    ...(plan.ctaDisabled
                      ? {
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-tertiary)',
                          background: 'transparent',
                          cursor: 'not-allowed',
                          opacity: 0.5,
                        }
                      : isPro
                      ? {
                          background: 'linear-gradient(135deg, hsl(45 93% 47%), hsl(35 93% 47%))',
                          color: '#1a1a1a',
                          boxShadow: '0 4px 16px hsl(45 93% 47% / 0.3)',
                        }
                      : isExpert
                      ? {
                          background: 'linear-gradient(135deg, hsl(265 80% 60%), hsl(285 70% 55%))',
                          color: 'white',
                          boxShadow: '0 4px 16px hsl(265 80% 60% / 0.3)',
                        }
                      : {}),
                  }}
                  onMouseEnter={e => {
                    if (!plan.ctaDisabled) e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={e => {
                    if (!plan.ctaDisabled) e.currentTarget.style.opacity = '1';
                  }}
                >
                  {plan.cta}
                </button>

                {/* Divider */}
                <div className="h-px mb-5" style={{ background: 'var(--border-subtle)' }} />

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2.5">
                      {f.included ? (
                        <Check
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          strokeWidth={2.5}
                          style={{
                            color: plan.name === 'Free'
                              ? 'var(--text-secondary)'
                              : plan.accent,
                          }}
                        />
                      ) : (
                        <X className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                      )}
                      <span
                        style={{
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: f.included ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          opacity: f.included ? 1 : 0.5,
                          fontWeight: (f as any).highlight ? 600 : 400,
                        }}
                      >
                        {f.label}
                        {(f as any).highlight && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              marginLeft: 6,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: 'hsl(265 80% 60% / 0.15)',
                              color: 'hsl(265 80% 60%)',
                              verticalAlign: 'middle',
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.05em',
                            }}
                          >
                            Novo
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 32, textAlign: 'center' }}>
          Todos os planos incluem atualizações gratuitas. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
}
