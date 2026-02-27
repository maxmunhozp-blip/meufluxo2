import { useState } from 'react';
import { X, CalendarDays, Sun, Play, RotateCcw, Repeat, Users, Shield } from 'lucide-react';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: CalendarDays,
    time: '🌙 Domingo à noite',
    title: 'Planeje sua semana',
    lines: [
      'Abra seus Projetos por Cliente',
      'Arraste tarefas para Minha Semana — distribua nos dias',
      'Toggle Timeline → veja sobreposições → redistribua se necessário',
    ],
  },
  {
    icon: Sun,
    time: '☀️ Segunda de manhã',
    title: 'Comece o dia com clareza',
    lines: [
      'Abra o app → Meu Dia',
      'Seção Manhã destacada → você sabe exatamente o que fazer',
      'Sem decisões, sem paralisia — só execução',
    ],
  },
  {
    icon: Play,
    time: '▶ Executando',
    title: 'Modo Foco',
    lines: [
      'Clique "▶ Focar" em qualquer tarefa',
      'Uma tarefa por vez → faço → próxima',
      'Seção concluída → próxima seção automaticamente',
    ],
  },
  {
    icon: RotateCcw,
    time: '😅 Não concluí ontem?',
    title: 'Rollover automático',
    lines: [
      'Tarefas não concluídas aparecem hoje com "← ontem"',
      'Sem culpa, sem pânico — apenas continue',
      'O app cuida da reorganização pra você',
    ],
  },
  {
    icon: Repeat,
    time: '📅 Todo mês',
    title: 'Recorrência inteligente',
    lines: [
      'Tarefas recorrentes se recriam automaticamente',
      'Sua semana se preenche sozinha',
      'Zero manutenção — configure uma vez, funciona sempre',
    ],
  },
  {
    icon: Users,
    time: '📈 Crescimento',
    title: 'Escale seu time',
    lines: [
      'Convide membros → cada um vê só os projetos liberados',
      'Cada pessoa tem seu próprio Meu Dia',
      'Free/Pro → Admin Panel monitora tudo',
    ],
  },
];

export function HowToUseModal({ isOpen, onClose }: HowToUseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-lg max-h-[85vh] rounded-xl border border-border overflow-hidden flex flex-col"
        style={{ background: 'hsl(var(--bg-surface))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">Como usar o MeuFluxo</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Seu fluxo semanal em 6 passos</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                <step.icon className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{step.time}</p>
                <p className="text-[13px] font-semibold text-foreground mt-0.5 mb-1.5">{step.title}</p>
                <ul className="space-y-1">
                  {step.lines.map((line, j) => (
                    <li key={j} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">→</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full h-9 rounded-md text-[13px] font-medium transition-colors"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
          >
            Entendi, vamos lá! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
