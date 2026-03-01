import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import appMockup from '@/assets/app-mockup.png';
import screenshotMeuDia from '@/assets/screenshot-meudia.png';
import screenshotSemana from '@/assets/screenshot-semana.png';
import screenshotCliente from '@/assets/screenshot-cliente.png';
import screenshotFoco from '@/assets/screenshot-foco.png';
import screenshotTimeline from '@/assets/screenshot-timeline.png';
import {
  Brain, ArrowRight, ChevronDown, Menu, X, Check,
  CheckCircle, Eye, Clock, ListChecks, Users, Calendar,
  Shield, Sparkles, Sun, Zap,
} from 'lucide-react';

/* ── Animation presets ── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
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
    title: 'Carga cognitiva reduzida',
    description: 'Interface limpa com hierarquia visual clara. Cada pixel foi pensado para não competir pela sua atenção.',
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

const SHOWCASES = [
  {
    icon: Sun,
    badge: 'Meu Dia',
    title: 'Comece o dia com clareza.',
    desc: 'Suas tarefas organizadas por Manhã, Tarde e Noite. Sem listas infinitas — apenas o que importa hoje, no ritmo certo.',
    items: ['Tarefas agrupadas por período do dia', 'Badge de cliente em cada tarefa', 'Modo Foco com um clique'],
  },
  {
    icon: ListChecks,
    badge: 'Visão por Cliente',
    title: 'Cada cliente, seu próprio espaço.',
    desc: 'Organize entregas em seções personalizáveis como "Para Aprovar", "Design" e "Posts Aprovados". Arraste tarefas entre projetos com um gesto.',
    items: ['Seções colapsáveis por tipo de entrega', 'Filtro temporal por mês', 'Drag & drop entre projetos'],
  },
  {
    icon: Eye,
    badge: 'Modo Foco',
    title: 'Uma tarefa de cada vez.',
    desc: 'Quando o mundo é demais, ative o Modo Foco. Veja apenas a tarefa atual em tela cheia. Sem distrações, sem ansiedade.',
    items: ['Interface minimalista zen', 'Navegação por "Próxima" tarefa', 'Ideal para TDAH e sobrecarga sensorial'],
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

/* ── Google Fonts injection ── */
const fontLink = document.querySelector('link[data-meufluxo-font]');
if (!fontLink) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&display=swap';
  link.setAttribute('data-meufluxo-font', 'true');
  document.head.appendChild(link);
}

const serif = '"DM Serif Display", Georgia, serif';
const sans = '"DM Sans", system-ui, -apple-system, sans-serif';

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
    <div style={{ fontFamily: sans, background: '#FAFBFC', color: '#1a1a2e', overflowX: 'hidden' }}>

      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(250,251,252,0.8)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span style={{ fontFamily: serif, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em' }}>MeuFluxo</span>

          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Funcionalidades', id: 'features' },
              { label: 'A Ciência', id: 'science' },
              { label: 'Planos', id: 'pricing' },
              { label: 'FAQ', id: 'faq' },
            ].map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="text-sm transition-colors duration-200" style={{ color: '#6B7280', fontFamily: sans, fontWeight: 500 }}
                onMouseOver={e => (e.currentTarget.style.color = '#1a1a2e')}
                onMouseOut={e => (e.currentTarget.style.color = '#6B7280')}
              >
                {n.label}
              </button>
            ))}
            <button onClick={() => navigate('/auth')} className="text-sm font-medium transition-colors duration-200" style={{ color: '#1a1a2e' }}>
              Entrar
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="h-10 px-5 rounded-full text-sm font-semibold text-white transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #4F7BF7 0%, #6C63FF 100%)', boxShadow: '0 2px 12px rgba(79,123,247,0.3)' }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,123,247,0.4)', e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(79,123,247,0.3)', e.currentTarget.style.transform = 'translateY(0)')}
            >
              Começar grátis
            </button>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2" style={{ color: '#6B7280' }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-16 left-0 right-0 p-6 space-y-4"
            style={{ background: 'rgba(250,251,252,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
          >
            <button onClick={() => scrollTo('features')} className="block w-full text-left text-sm" style={{ color: '#6B7280' }}>Funcionalidades</button>
            <button onClick={() => scrollTo('science')} className="block w-full text-left text-sm" style={{ color: '#6B7280' }}>A Ciência</button>
            <button onClick={() => scrollTo('pricing')} className="block w-full text-left text-sm" style={{ color: '#6B7280' }}>Planos</button>
            <button onClick={() => scrollTo('faq')} className="block w-full text-left text-sm" style={{ color: '#6B7280' }}>FAQ</button>
            <hr style={{ borderColor: 'rgba(0,0,0,0.06)' }} />
            <button onClick={() => navigate('/auth')} className="block w-full text-left text-sm font-medium" style={{ color: '#1a1a2e' }}>Entrar</button>
            <button
              onClick={() => navigate('/auth')}
              className="w-full h-11 rounded-full text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #4F7BF7 0%, #6C63FF 100%)' }}
            >
              Começar grátis
            </button>
          </motion.div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 md:pt-40 pb-8 px-6 overflow-hidden">
        {/* Background gradient orbs */}
        <div style={{
          position: 'absolute', top: -120, right: -200, width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(79,123,247,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 200, left: -300, width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-10"
            style={{ background: 'rgba(79,123,247,0.08)', border: '1px solid rgba(79,123,247,0.15)' }}
          >
            <Brain className="w-4 h-4" style={{ color: '#4F7BF7' }} />
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#4F7BF7', letterSpacing: '0.08em' }}>
              Projetado para mentes neurodivergentes
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="leading-[1.08] tracking-tight mb-6"
            style={{ fontFamily: serif, fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', color: '#1a1a2e' }}
          >
            Produtividade que{' '}
            <span style={{
              background: 'linear-gradient(135deg, #4F7BF7 0%, #6C63FF 50%, #A78BFA 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              respeita
            </span>
            <br />como você pensa.
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: '#6B7280', fontWeight: 400 }}
          >
            O gerenciador de tarefas criado com base em pesquisas sobre TDAH, TEA e neurodiversidade.
            Menos culpa, mais tração. Uma tarefa de cada vez.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/auth')}
              className="h-13 px-8 py-3.5 rounded-full font-semibold text-base text-white flex items-center gap-2.5 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #4F7BF7 0%, #6C63FF 100%)', boxShadow: '0 4px 20px rgba(79,123,247,0.3)' }}
              onMouseOver={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(79,123,247,0.4)', e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,123,247,0.3)', e.currentTarget.style.transform = 'translateY(0)')}
            >
              Começar grátis <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="h-13 px-8 py-3.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200"
              style={{ border: '1px solid rgba(0,0,0,0.12)', color: '#6B7280', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)' }}
              onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(79,123,247,0.3)', e.currentTarget.style.color = '#4F7BF7')}
              onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)', e.currentTarget.style.color = '#6B7280')}
            >
              Conhecer mais <ChevronDown className="w-4 h-4" />
            </button>
          </motion.div>

          {/* App screenshot */}
          <motion.div variants={scaleIn} initial="hidden" animate="visible"
            className="mt-20 max-w-5xl mx-auto"
          >
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 40px 80px -20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1E1E2E', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
                </div>
                <div className="flex-1 mx-8">
                  <div className="max-w-sm mx-auto h-7 rounded-md flex items-center justify-center text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                    meufluxo.app
                  </div>
                </div>
              </div>
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
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-20">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#4F7BF7', letterSpacing: '0.12em' }}>
              Funcionalidades
            </p>
            <h2 className="mb-5" style={{ fontFamily: serif, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1a1a2e', lineHeight: 1.15 }}>
              Cada detalhe, com propósito.
            </h2>
            <p className="max-w-lg mx-auto text-base" style={{ color: '#6B7280' }}>
              Cada decisão de design é baseada em pesquisas sobre neurodiversidade e redução de carga cognitiva.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-50px' }} custom={i}
                className="group p-7 rounded-2xl transition-all duration-300 cursor-default"
                style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = 'rgba(79,123,247,0.2)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(79,123,247,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(79,123,247,0.1) 0%, rgba(108,99,255,0.1) 100%)' }}>
                  <f.icon className="w-5 h-5" style={{ color: '#4F7BF7' }} />
                </div>
                <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#1a1a2e' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SHOWCASES ─── */}
      <section className="py-28 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-20">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#4F7BF7', letterSpacing: '0.12em' }}>
              Como funciona
            </p>
            <h2 className="mb-5" style={{ fontFamily: serif, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1a1a2e', lineHeight: 1.15 }}>
              Tudo que você precisa, nada que não precisa.
            </h2>
            <p className="max-w-lg mx-auto text-base" style={{ color: '#6B7280' }}>
              Funcionalidades pensadas para quem precisa de foco, não de mais opções.
            </p>
          </motion.div>

          <div className="space-y-6">
            {SHOWCASES.map((item, i) => (
              <motion.div key={item.badge} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} custom={i}
                className="relative p-8 md:p-10 rounded-2xl overflow-hidden transition-all duration-300"
                style={{ background: '#FAFBFC', border: '1px solid rgba(0,0,0,0.06)' }}
                onMouseOver={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.04)')}
                onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Subtle gradient accent */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: 'linear-gradient(90deg, #4F7BF7, #6C63FF, #A78BFA)',
                  opacity: 0.6,
                }} />

                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(79,123,247,0.1) 0%, rgba(108,99,255,0.1) 100%)' }}>
                    <item.icon className="w-4 h-4" style={{ color: '#4F7BF7' }} />
                  </div>
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#4F7BF7', letterSpacing: '0.08em' }}>{item.badge}</span>
                </div>

                <h3 className="text-xl md:text-2xl font-bold mb-3" style={{ fontFamily: serif, color: '#1a1a2e' }}>{item.title}</h3>
                <p className="mb-6 leading-relaxed max-w-2xl" style={{ color: '#6B7280' }}>{item.desc}</p>

                <div className="flex flex-wrap gap-4">
                  {item.items.map(li => (
                    <span key={li} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full" style={{ background: 'rgba(79,123,247,0.06)', color: '#4F7BF7', fontWeight: 500 }}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      {li}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SCIENCE ─── */}
      <section id="science" className="py-28 px-6 relative overflow-hidden" style={{ background: '#F5F3FF' }}>
        {/* Background texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(79,123,247,0.08) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <div className="max-w-4xl mx-auto relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeUp} className="text-center mb-16">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(79,123,247,0.08)', border: '1px solid rgba(79,123,247,0.15)' }}>
              <Shield className="w-4 h-4" style={{ color: '#4F7BF7' }} />
              <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#4F7BF7', letterSpacing: '0.08em' }}>Baseado em pesquisa</span>
            </div>
            <h2 className="mb-5" style={{ fontFamily: serif, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1a1a2e', lineHeight: 1.15 }}>
              A ciência por trás do MeuFluxo
            </h2>
            <p className="max-w-2xl mx-auto text-base" style={{ color: '#6B7280' }}>
              Nosso design é fundamentado em estudos sobre como cérebros neurodivergentes processam informação, tomam decisões e mantêm o foco.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {SCIENCE_ITEMS.map((item, i) => (
              <motion.div key={item.principle} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(79,123,247,0.1)' }}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #4F7BF7, #A78BFA)' }} />
                  <div>
                    <h4 className="text-sm font-bold mb-2" style={{ color: '#1a1a2e' }}>{item.principle}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{item.detail}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-28 px-6" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#4F7BF7', letterSpacing: '0.12em' }}>
              Planos
            </p>
            <h2 className="mb-5" style={{ fontFamily: serif, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1a1a2e', lineHeight: 1.15 }}>
              Simples e transparente.
            </h2>
            <p style={{ color: '#6B7280' }}>Comece de graça, faça upgrade quando precisar.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
              className="p-8 rounded-2xl transition-all duration-300"
              style={{ border: '1px solid rgba(0,0,0,0.08)', background: '#FFFFFF' }}
            >
              <h3 className="text-lg font-semibold mb-1" style={{ color: '#1a1a2e' }}>Free</h3>
              <p className="text-sm mb-5" style={{ color: '#6B7280' }}>Para começar sem pressão</p>
              <p className="mb-6" style={{ color: '#1a1a2e' }}>
                <span style={{ fontFamily: serif, fontSize: 40, fontWeight: 400 }}>R$0</span>
                <span className="text-sm ml-1" style={{ color: '#9CA3AF' }}>/mês</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['1 Workspace', '3 Projetos', '20 Tarefas por projeto', '2 Membros', 'Dark & Light mode'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#6B7280' }}>
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#4F7BF7' }} /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth')}
                className="w-full h-11 rounded-full text-sm font-medium transition-all duration-200"
                style={{ border: '1px solid rgba(0,0,0,0.12)', color: '#1a1a2e' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(79,123,247,0.3)', e.currentTarget.style.color = '#4F7BF7')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)', e.currentTarget.style.color = '#1a1a2e')}
              >
                Criar conta grátis
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="relative p-8 rounded-2xl transition-all duration-300"
              style={{ border: '2px solid #4F7BF7', background: '#FFFFFF', boxShadow: '0 8px 30px rgba(79,123,247,0.1)' }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white"
                style={{ background: 'linear-gradient(135deg, #4F7BF7 0%, #6C63FF 100%)', letterSpacing: '0.1em' }}
              >
                Recomendado
              </div>
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: '#1a1a2e' }}>
                Pro <Sparkles className="w-4 h-4" style={{ color: '#4F7BF7' }} />
              </h3>
              <p className="text-sm mb-5" style={{ color: '#6B7280' }}>Para profissionais</p>
              <p className="mb-6" style={{ color: '#1a1a2e' }}>
                <span style={{ fontFamily: serif, fontSize: 40, fontWeight: 400 }}>R$29</span>
                <span className="text-sm ml-1" style={{ color: '#9CA3AF' }}>/mês</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['Tudo ilimitado', 'Timeline View', 'Tarefas Recorrentes', 'Rollover Automático', 'Notas ilimitadas', 'Upload de imagens'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#1a1a2e' }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4F7BF7' }} /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth')}
                className="w-full h-11 rounded-full text-sm font-semibold text-white transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #4F7BF7 0%, #6C63FF 100%)', boxShadow: '0 2px 12px rgba(79,123,247,0.3)' }}
                onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,123,247,0.4)', e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseOut={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(79,123,247,0.3)', e.currentTarget.style.transform = 'translateY(0)')}
              >
                Começar com Pro
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-28 px-6" style={{ background: '#FAFBFC' }}>
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#4F7BF7', letterSpacing: '0.12em' }}>
              FAQ
            </p>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#1a1a2e', lineHeight: 1.15 }}>
              Perguntas frequentes
            </h2>
          </motion.div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <motion.details
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.2}
                className="group rounded-xl overflow-hidden"
                style={{ border: '1px solid rgba(0,0,0,0.06)', background: '#FFFFFF' }}
              >
                <summary
                  className="flex items-center justify-between cursor-pointer px-6 py-5 text-sm font-medium transition-colors list-none [&::-webkit-details-marker]:hidden"
                  style={{ color: '#1a1a2e' }}
                >
                  <span>{item.q}</span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0 ml-4 transition-transform duration-200 group-open:rotate-180" style={{ color: '#9CA3AF' }} />
                </summary>
                <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: '#6B7280' }}>
                  {item.a}
                </div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2b55 100%)' }}>
        {/* Dot grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl mx-auto text-center relative">
          <h2 className="mb-5" style={{ fontFamily: serif, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#FFFFFF', lineHeight: 1.15 }}>
            Seu cérebro merece ferramentas melhores.
          </h2>
          <p className="mb-10 max-w-md mx-auto text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Descubra uma forma de trabalhar que não luta contra a forma como você pensa.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="h-13 px-8 py-3.5 rounded-full font-semibold text-base flex items-center gap-2.5 mx-auto transition-all duration-200"
            style={{ background: '#FFFFFF', color: '#1a1a2e', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)')}
          >
            Começar grátis agora <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-6" style={{ background: '#1a1a2e', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <span style={{ fontFamily: serif, fontSize: 18, color: '#FFFFFF' }}>MeuFluxo</span>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} MeuFluxo. Feito com cuidado para mentes que pensam diferente.
          </p>
          <div className="flex items-center gap-6">
            {[
              { label: 'Funcionalidades', id: 'features' },
              { label: 'Planos', id: 'pricing' },
              { label: 'FAQ', id: 'faq' },
            ].map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="text-xs transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                {n.label}
              </button>
            ))}
            <button onClick={() => navigate('/auth')} className="text-xs transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
              onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
            >
              Entrar
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
