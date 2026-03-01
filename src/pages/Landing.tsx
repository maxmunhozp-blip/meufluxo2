import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import appMockup from '@/assets/app-mockup.png';
import {
  Brain, ArrowRight, ChevronDown, Menu, X, Check,
  CheckCircle, Eye, Clock, ListChecks, Users, Calendar,
  Shield, Sparkles, Sun,
} from 'lucide-react';

/* ── Animation preset ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

/* ── Data ── */
const FEATURES = [
  {
    icon: Brain,
    title: 'Projetado para seu cérebro',
    description: 'Sem barras de progresso punitivas. Sem gamificação que gera culpa. Apenas um fluxo que respeita como você realmente trabalha.',
  },
  {
    icon: Eye,
    title: 'Modo Foco imersivo',
    description: 'Uma tarefa de cada vez, em tela cheia. Sem distrações periféricas, sem ansiedade. Avance quando estiver pronto.',
  },
  {
    icon: Clock,
    title: 'Contexto temporal gentil',
    description: 'Datas atrasadas não são punições — são informações. Tons âmbar, não vermelho agressivo. Sem alarmes de ansiedade.',
  },
  {
    icon: ListChecks,
    title: 'Seções personalizáveis',
    description: 'Organize cada cliente com seções como "Para Aprovar", "Design" e "Posts Aprovados". Arraste tarefas entre projetos.',
  },
  {
    icon: Users,
    title: 'Colaboração sem pressão',
    description: 'Workspaces compartilhados onde cada membro vê o que precisa. Sem notificações invasivas.',
  },
  {
    icon: Calendar,
    title: 'Meu Dia, Minha Semana',
    description: 'Visualizações que se adaptam ao seu ritmo. Planeje por dia ou semana, sem a tirania do mês inteiro.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'O que significa ser "projetado para neurodivergentes"?',
    a: 'Cada decisão de design foi baseada em pesquisas sobre TDAH, TEA e dificuldades executivas. Removemos barras de progresso punitivas, usamos cores gentis (âmbar ao invés de vermelho para atrasos), oferecemos Modo Foco para uma tarefa de cada vez, e minimizamos a carga cognitiva com interfaces limpas.',
  },
  {
    q: 'Preciso ter um diagnóstico para usar o MeuFluxo?',
    a: 'Não. O MeuFluxo é para qualquer pessoa que se sente sobrecarregada com ferramentas tradicionais. Se você já abandonou um Trello, Notion ou Asana por excesso de complexidade, o MeuFluxo foi feito para você.',
  },
  {
    q: 'Qual a diferença entre o plano Free e o Pro?',
    a: 'O plano Free oferece até 3 projetos, 20 tarefas por projeto, subtarefas, modo foco e colaboração básica. O Pro desbloqueia tudo ilimitado, Timeline View, tarefas recorrentes, rollover automático, notas ilimitadas e upload de imagens.',
  },
  {
    q: 'Posso usar o MeuFluxo com minha equipe?',
    a: 'Sim! Cada workspace permite convidar membros. Você pode atribuir tarefas, compartilhar projetos e colaborar — tudo sem notificações invasivas.',
  },
  {
    q: 'O que é o "Rollover Automático"?',
    a: 'Tarefas atrasadas não desaparecem nem ficam vermelhas. Elas são gentilmente movidas para o dia seguinte com um indicador âmbar discreto. Sem culpa, sem punição — apenas continuidade.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Usamos criptografia em trânsito e em repouso, autenticação segura e políticas de acesso por linha que garantem que cada usuário só acessa seus próprios dados.',
  },
  {
    q: 'Posso cancelar o plano Pro a qualquer momento?',
    a: 'Sim, sem compromisso. Você pode fazer downgrade para o plano Free a qualquer momento e manterá acesso aos seus dados.',
  },
];

const SCIENCE_ITEMS = [
  {
    principle: 'Redução de carga cognitiva',
    detail: 'Interfaces com excesso de elementos visuais aumentam a fadiga decisional em pessoas com TDAH em até 3x (Sweller, 2011). MeuFluxo usa hierarquia visual mínima e espaçamento generoso.',
  },
  {
    principle: 'Feedback não-punitivo',
    detail: 'Sistemas de recompensa/punição ativam respostas de ansiedade em cérebros neurodivergentes (Sonuga-Barke, 2005). Substituímos barras de progresso por contadores neutros e tons âmbar em vez de vermelho.',
  },
  {
    principle: 'Ancoragem em uma tarefa',
    detail: 'A "paralisia por escolha" é amplificada em TDAH. Limitamos a visão a uma tarefa por vez no Modo Foco, reduzindo a sobrecarga de decisão (Barkley, 2015).',
  },
  {
    principle: 'Consistência sensorial',
    detail: 'Variações abruptas de contraste e cor causam desconforto em pessoas no espectro autista (Grandin & Panek, 2013). Nosso dark mode usa pretos quentes e transições suaves de 150ms.',
  },
];

/* ── Landing colors (forced light, independent of app theme) ── */
const C = {
  bg: '#FAFAFA',
  bgWhite: '#FFFFFF',
  accent: '#4F7BF7',
  accentDark: '#3B64D9',
  accentLight: '#EEF2FF',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: C.bg, color: C.text, overflowY: 'auto' }}>

      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(250,250,250,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight" style={{ color: C.text }}>MeuFluxo</span>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Funcionalidades', id: 'features' },
              { label: 'A Ciência', id: 'science' },
              { label: 'Planos', id: 'pricing' },
              { label: 'FAQ', id: 'faq' },
            ].map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="text-sm transition-colors hover:opacity-80" style={{ color: C.textSub }}>
                {n.label}
              </button>
            ))}
            <button onClick={() => navigate('/auth')} className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: C.text }}>
              Entrar
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="h-10 px-5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: C.accent }}
              onMouseOver={e => (e.currentTarget.style.background = C.accentDark)}
              onMouseOut={e => (e.currentTarget.style.background = C.accent)}
            >
              Começar grátis
            </button>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2" style={{ color: C.textSub }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-16 left-0 right-0 p-6 space-y-4"
            style={{ background: 'rgba(250,250,250,0.97)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.border}` }}
          >
            <button onClick={() => scrollTo('features')} className="block w-full text-left text-sm" style={{ color: C.textSub }}>Funcionalidades</button>
            <button onClick={() => scrollTo('science')} className="block w-full text-left text-sm" style={{ color: C.textSub }}>A Ciência</button>
            <button onClick={() => scrollTo('pricing')} className="block w-full text-left text-sm" style={{ color: C.textSub }}>Planos</button>
            <button onClick={() => scrollTo('faq')} className="block w-full text-left text-sm" style={{ color: C.textSub }}>FAQ</button>
            <hr style={{ borderColor: C.border }} />
            <button onClick={() => navigate('/auth')} className="block w-full text-left text-sm font-medium" style={{ color: C.text }}>Entrar</button>
            <button
              onClick={() => navigate('/auth')}
              className="w-full h-11 rounded-lg text-sm font-semibold text-white"
              style={{ background: C.accent }}
            >
              Começar grátis
            </button>
          </motion.div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{ background: C.accentLight, border: `1px solid ${C.border}` }}
          >
            <Brain className="w-4 h-4" style={{ color: C.accent }} />
            <span className="text-xs font-medium" style={{ color: C.textSub }}>Projetado para mentes neurodivergentes</span>
          </motion.div>

          {/* Title */}
          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
            style={{ color: C.text }}
          >
            Produtividade que{' '}
            <span style={{ color: C.accent }}>respeita</span>
            <br />como você pensa.
          </motion.h1>

          {/* Subtitle */}
          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
            style={{ color: C.textSub }}
          >
            O gerenciador de tarefas criado com base em pesquisas sobre TDAH, TEA e neurodiversidade.
            Menos culpa, mais tração. Uma tarefa de cada vez.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/auth')}
              className="h-12 px-8 rounded-lg font-semibold text-base text-white flex items-center gap-2 transition-all"
              style={{ background: C.accent, boxShadow: '0 4px 14px rgba(79,123,247,0.25)' }}
              onMouseOver={e => (e.currentTarget.style.background = C.accentDark)}
              onMouseOut={e => (e.currentTarget.style.background = C.accent)}
            >
              Começar grátis <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="h-12 px-8 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              style={{ border: `1px solid ${C.border}`, color: C.textSub }}
            >
              Conhecer mais <ChevronDown className="w-4 h-4" />
            </button>
          </motion.div>

          {/* App screenshot in browser mockup */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="mt-16 max-w-5xl mx-auto"
          >
            {/* Browser chrome */}
            <div className="rounded-xl overflow-hidden" style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.15)', border: `1px solid ${C.border}` }}>
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#F9FAFB', borderBottom: `1px solid ${C.border}` }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#EF4444' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#22C55E' }} />
                </div>
                <div className="flex-1 mx-8">
                  <div className="max-w-md mx-auto h-7 rounded-md flex items-center justify-center text-xs" style={{ background: '#F3F4F6', color: C.textMuted }}>
                    meufluxo.app
                  </div>
                </div>
              </div>
              {/* Screenshot */}
              <img
                src={appMockup}
                alt="MeuFluxo — Dashboard de gerenciamento de tarefas com visão Meu Dia"
                className="w-full h-auto block"
                loading="eager"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 px-6" style={{ background: C.bgWhite }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
              Cada detalhe, com propósito.
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: C.textSub }}>
              Cada decisão de design é baseada em pesquisas sobre neurodiversidade e redução de carga cognitiva.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-50px' }} custom={i}
                className="p-6 rounded-xl transition-all duration-200"
                style={{ border: `1px solid ${C.border}`, background: C.bgWhite }}
                onMouseOver={e => (e.currentTarget.style.borderColor = C.accent, e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,123,247,0.08)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = C.border, e.currentTarget.style.boxShadow = 'none')}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: C.accentLight }}>
                  <f.icon className="w-5 h-5" style={{ color: C.accent }} />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: C.text }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.textSub }}>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (visual showcase) ─── */}
      <section className="py-24 px-6" style={{ borderTop: `1px solid ${C.borderLight}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
              Tudo que você precisa, nada que não precisa.
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: C.textSub }}>
              Conheça as funcionalidades que fazem do MeuFluxo a ferramenta mais gentil de produtividade.
            </p>
          </motion.div>

          <div className="space-y-12">
            {[
              { icon: Sun, badge: 'Meu Dia', title: 'Comece o dia com clareza.', desc: 'Suas tarefas organizadas por Manhã, Tarde e Noite. Sem listas infinitas — apenas o que importa hoje, no ritmo certo.', items: ['Tarefas agrupadas por período do dia', 'Badge de cliente em cada tarefa', 'Modo Foco com um clique'] },
              { icon: ListChecks, badge: 'Visão por Cliente', title: 'Cada cliente, seu próprio espaço.', desc: 'Organize entregas em seções personalizáveis como "Para Aprovar", "Design" e "Posts Aprovados". Arraste tarefas entre projetos com um gesto.', items: ['Seções colapsáveis por tipo de entrega', 'Filtro temporal por mês', 'Drag & drop entre projetos'] },
              { icon: Eye, badge: 'Modo Foco', title: 'Uma tarefa de cada vez.', desc: 'Quando o mundo é demais, ative o Modo Foco. Veja apenas a tarefa atual em tela cheia. Sem distrações, sem ansiedade.', items: ['Interface minimalista zen', 'Navegação por "Próxima" tarefa', 'Ideal para TDAH e sobrecarga sensorial'] },
            ].map((item, i) => (
              <motion.div key={item.badge} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={i}
                className="p-8 rounded-xl" style={{ background: C.bgWhite, border: `1px solid ${C.border}` }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4" style={{ background: C.accentLight }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: C.accent }} />
                  <span className="text-xs font-medium" style={{ color: C.accent }}>{item.badge}</span>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: C.text }}>{item.title}</h3>
                <p className="mb-4 leading-relaxed" style={{ color: C.textSub }}>{item.desc}</p>
                <ul className="space-y-2">
                  {item.items.map(li => (
                    <li key={li} className="flex items-center gap-2 text-sm" style={{ color: C.textSub }}>
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: C.accent }} />
                      {li}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SCIENCE ─── */}
      <section id="science" className="py-24 px-6" style={{ background: C.bgWhite, borderTop: `1px solid ${C.borderLight}` }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: C.accentLight, border: `1px solid ${C.border}` }}>
              <Shield className="w-4 h-4" style={{ color: C.accent }} />
              <span className="text-xs font-medium" style={{ color: C.textSub }}>Baseado em pesquisa</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
              A ciência por trás do MeuFluxo
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: C.textSub }}>
              Nosso design é fundamentado em estudos sobre como cérebros neurodivergentes processam informação, tomam decisões e mantêm o foco.
            </p>
          </motion.div>

          <div className="space-y-4">
            {SCIENCE_ITEMS.map((item, i) => (
              <motion.div key={item.principle} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="flex gap-4 p-6 rounded-xl" style={{ border: `1px solid ${C.border}`, background: C.bg }}
              >
                <div className="flex-shrink-0 w-1 rounded-full" style={{ background: C.accent }} />
                <div>
                  <h4 className="text-sm font-semibold mb-1" style={{ color: C.text }}>{item.principle}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: C.textSub }}>{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 px-6" style={{ borderTop: `1px solid ${C.borderLight}` }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
              Simples e transparente.
            </h2>
            <p style={{ color: C.textSub }}>Comece de graça, faça upgrade quando precisar.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
              className="p-8 rounded-xl" style={{ border: `1px solid ${C.border}`, background: C.bgWhite }}
            >
              <h3 className="text-lg font-semibold mb-1" style={{ color: C.text }}>Free</h3>
              <p className="text-sm mb-4" style={{ color: C.textSub }}>Para começar sem pressão</p>
              <p className="text-4xl font-bold mb-6" style={{ color: C.text }}>
                R$0 <span className="text-sm font-normal" style={{ color: C.textMuted }}>/mês</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['1 Workspace', '3 Projetos', '20 Tarefas por projeto', '2 Membros', 'Dark & Light mode'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: C.textSub }}>
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: C.accent }} /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth')}
                className="w-full h-11 rounded-lg text-sm font-medium transition-colors"
                style={{ border: `1px solid ${C.border}`, color: C.text }}
              >
                Criar conta grátis
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="relative p-8 rounded-xl" style={{ border: `2px solid ${C.accent}`, background: C.bgWhite }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ background: C.accent }}
              >
                Recomendado
              </div>
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: C.text }}>
                Pro <Sparkles className="w-4 h-4" style={{ color: C.accent }} />
              </h3>
              <p className="text-sm mb-4" style={{ color: C.textSub }}>Para profissionais</p>
              <p className="text-4xl font-bold mb-6" style={{ color: C.text }}>
                R$29 <span className="text-sm font-normal" style={{ color: C.textMuted }}>/mês</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['Tudo ilimitado', 'Timeline View', 'Tarefas Recorrentes', 'Rollover Automático', 'Notas ilimitadas', 'Upload de imagens'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: C.text }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: C.accent }} /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth')}
                className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: C.accent }}
                onMouseOver={e => (e.currentTarget.style.background = C.accentDark)}
                onMouseOut={e => (e.currentTarget.style.background = C.accent)}
              >
                Começar com Pro
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 px-6" style={{ background: C.bgWhite, borderTop: `1px solid ${C.borderLight}` }}>
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: C.text }}>
              Perguntas frequentes
            </h2>
          </motion.div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <motion.details
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.3}
                className="group rounded-xl overflow-hidden"
                style={{ border: `1px solid ${C.border}`, background: C.bgWhite }}
              >
                <summary
                  className="flex items-center justify-between cursor-pointer px-6 py-5 text-sm font-medium transition-colors list-none [&::-webkit-details-marker]:hidden"
                  style={{ color: C.text }}
                >
                  <span>{item.q}</span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0 ml-4 transition-transform duration-200 group-open:rotate-180" style={{ color: C.textMuted }} />
                </summary>
                <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: C.textSub }}>
                  {item.a}
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-6" style={{ background: C.bg, borderTop: `1px solid ${C.borderLight}` }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: C.text }}>
            Seu cérebro merece ferramentas melhores.
          </h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: C.textSub }}>
            Descubra uma forma de trabalhar que não luta contra a forma como você pensa.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="h-12 px-8 rounded-lg font-semibold text-base text-white flex items-center gap-2 mx-auto transition-all"
            style={{ background: C.accent, boxShadow: '0 4px 14px rgba(79,123,247,0.25)' }}
            onMouseOver={e => (e.currentTarget.style.background = C.accentDark)}
            onMouseOut={e => (e.currentTarget.style.background = C.accent)}
          >
            Começar grátis agora <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-6" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold" style={{ color: C.text }}>MeuFluxo</span>
          <p className="text-xs" style={{ color: C.textMuted }}>
            © {new Date().getFullYear()} MeuFluxo. Feito com cuidado para mentes que pensam diferente.
          </p>
          <div className="flex items-center gap-6">
            {[
              { label: 'Funcionalidades', id: 'features' },
              { label: 'Planos', id: 'pricing' },
              { label: 'FAQ', id: 'faq' },
            ].map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="text-xs transition-colors hover:opacity-80" style={{ color: C.textSub }}>
                {n.label}
              </button>
            ))}
            <button onClick={() => navigate('/auth')} className="text-xs transition-colors hover:opacity-80" style={{ color: C.textSub }}>Entrar</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
