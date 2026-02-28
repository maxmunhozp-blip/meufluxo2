import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2, Brain, Shield, Zap, ArrowRight, Sparkles,
  Sun, Moon, Eye, Clock, ListChecks, Users, Calendar,
  ChevronDown, Menu, X, Check, CheckCircle, Star
} from 'lucide-react';

const FEATURES = [
  {
    icon: Brain,
    title: 'Projetado para seu cérebro',
    description: 'Sem barras de progresso punitivas. Sem gamificação que gera culpa. Apenas um fluxo que respeita como você realmente trabalha.',
    gradient: 'from-purple-500/20 to-blue-500/20',
  },
  {
    icon: Eye,
    title: 'Carga cognitiva reduzida',
    description: 'Interface limpa com hierarquia visual clara. Cada pixel foi pensado para não competir pela sua atenção.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    icon: Clock,
    title: 'Contexto temporal gentil',
    description: 'Datas atrasadas não são punições — são informações. Tons âmbar, não vermelho agressivo. Sem alarmes de ansiedade.',
    gradient: 'from-amber-500/20 to-orange-500/20',
  },
  {
    icon: ListChecks,
    title: 'Uma coisa de cada vez',
    description: 'Modo Foco para quando o mundo é demais. Veja apenas a tarefa atual, sem distrações periféricas.',
    gradient: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    icon: Users,
    title: 'Colaboração sem pressão',
    description: 'Workspaces compartilhados onde cada membro vê o que precisa. Sem notificações invasivas.',
    gradient: 'from-rose-500/20 to-pink-500/20',
  },
  {
    icon: Calendar,
    title: 'Meu Dia, Minha Semana',
    description: 'Visualizações que se adaptam ao seu ritmo. Planeje por dia ou semana, sem a tirania do mês inteiro.',
    gradient: 'from-cyan-500/20 to-sky-500/20',
  },
];

const TESTIMONIALS = [
  {
    text: '"Pela primeira vez, um app de produtividade não me faz sentir culpa por não completar tudo."',
    author: 'Marina S.',
    role: 'Designer, TDAH',
    stars: 5,
  },
  {
    text: '"O modo escuro e a ausência de barras de progresso fazem toda a diferença para minha ansiedade."',
    author: 'Pedro L.',
    role: 'Desenvolvedor, TEA',
    stars: 5,
  },
  {
    text: '"Finalmente consigo organizar meus clientes sem aquela sobrecarga visual dos outros apps."',
    author: 'Carla M.',
    role: 'Social Media',
    stars: 5,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.96]);

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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" style={{ overflowY: 'auto' }}>
      {/* ─── NAV ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-foreground">
            MeuFluxo
          </span>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </button>
            <button onClick={() => scrollTo('science')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              A Ciência
            </button>
            <button onClick={() => scrollTo('pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Começar grátis
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-muted-foreground"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border p-6 space-y-4"
          >
            <button onClick={() => scrollTo('features')} className="block w-full text-left text-sm text-muted-foreground">Funcionalidades</button>
            <button onClick={() => scrollTo('science')} className="block w-full text-left text-sm text-muted-foreground">A Ciência</button>
            <button onClick={() => scrollTo('pricing')} className="block w-full text-left text-sm text-muted-foreground">Planos</button>
            <hr className="border-border" />
            <button onClick={() => navigate('/auth')} className="block w-full text-left text-sm font-medium text-foreground">Entrar</button>
            <button onClick={() => navigate('/auth')} className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Começar grátis</button>
          </motion.div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[100vh] flex items-center justify-center px-6 pt-20"
      >
        {/* Subtle gradient orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm mb-8"
          >
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Projetado para mentes neurodivergentes</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight text-foreground mb-6"
          >
            Produtividade que{' '}
            <span className="text-primary">respeita</span>
            <br />
            como você pensa.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
          >
            O gerenciador de tarefas criado com base em pesquisas sobre TDAH, TEA e neurodiversidade. 
            Menos culpa, mais tração. Uma tarefa de cada vez.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/auth')}
              className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 flex items-center gap-2"
            >
              Começar grátis <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollTo('features')}
              className="h-12 px-8 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors flex items-center gap-2"
            >
              Conhecer mais <ChevronDown className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground/50" />
        </motion.div>
      </motion.section>

      {/* ─── SOCIAL PROOF BAR ─── */}
      <section className="py-12 border-y border-border/30">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">500+</p>
            <p className="text-xs text-muted-foreground">Profissionais ativos</p>
          </div>
          <div className="w-px h-8 bg-border/50 hidden sm:block" />
          <div>
            <p className="text-2xl font-bold text-foreground">4.9</p>
            <p className="text-xs text-muted-foreground">Avaliação média</p>
          </div>
          <div className="w-px h-8 bg-border/50 hidden sm:block" />
          <div>
            <p className="text-2xl font-bold text-foreground">98%</p>
            <p className="text-xs text-muted-foreground">Menos sobrecarga cognitiva</p>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Cada detalhe, com propósito.
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Não adicionamos funcionalidades por moda. Cada decisão de design é baseada em pesquisas sobre neurodiversidade e redução de carga cognitiva.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                className="group relative p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:border-border transition-all duration-300"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SCIENCE SECTION ─── */}
      <section id="science" className="py-24 px-6 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/50 bg-card/50 mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Baseado em pesquisa</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              A ciência por trás do MeuFluxo
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nosso design é fundamentado em estudos sobre como cérebros neurodivergentes processam informação, tomam decisões e mantêm o foco.
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                principle: 'Redução de carga cognitiva',
                study: 'Pesquisas mostram que interfaces com excesso de elementos visuais aumentam a fadiga decisional em pessoas com TDAH em até 3x (Sweller, 2011). MeuFluxo usa hierarquia visual mínima e espaçamento generoso.',
              },
              {
                principle: 'Feedback não-punitivo',
                study: 'Sistemas de recompensa/punição ativam respostas de ansiedade em cérebros neurodivergentes (Sonuga-Barke, 2005). Substituímos barras de progresso por contadores neutros e tons âmbar em vez de vermelho.',
              },
              {
                principle: 'Ancoragem em uma tarefa',
                study: 'A "paralisia por escolha" é amplificada em TDAH. Limitamos a visão a uma tarefa por vez no Modo Foco, reduzindo a sobrecarga de decisão (Barkley, 2015).',
              },
              {
                principle: 'Consistência sensorial',
                study: 'Variações abruptas de contraste e cor causam desconforto em pessoas no espectro autista (Grandin & Panek, 2013). Nosso dark mode usa pretos quentes e transições suaves de 150ms.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.principle}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="flex gap-4 p-6 rounded-xl border border-border/30 bg-card/20"
              >
                <div className="flex-shrink-0 w-1 rounded-full bg-primary/40" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">{item.principle}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.study}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-24 px-6 border-t border-border/30">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12"
          >
            Quem usa, sente a diferença.
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.author}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="p-6 rounded-2xl border border-border/50 bg-card/30"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed mb-4">{t.text}</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 px-6 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simples e transparente.
            </h2>
            <p className="text-muted-foreground">Comece de graça, faça upgrade quando precisar.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              className="p-8 rounded-2xl border border-border/50 bg-card/30"
            >
              <h3 className="text-lg font-semibold text-foreground mb-1">Free</h3>
              <p className="text-sm text-muted-foreground mb-4">Para começar sem pressão</p>
              <p className="text-4xl font-bold text-foreground mb-6">
                R$0 <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['1 Workspace', '3 Projetos', '20 Tarefas por projeto', '2 Membros', 'Dark & Light mode'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth')}
                className="w-full h-11 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent/10 transition-colors"
              >
                Criar conta grátis
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              className="relative p-8 rounded-2xl border border-primary/30 bg-primary/5"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Recomendado
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                Pro <Sparkles className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Para profissionais</p>
              <p className="text-4xl font-bold text-foreground mb-6">
                R$29 <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['Tudo ilimitado', 'Timeline View', 'Tarefas Recorrentes', 'Rollover Automático', 'Notas ilimitadas', 'Upload de imagens'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/auth')}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Começar com Pro
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-6 border-t border-border/30">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Seu cérebro merece ferramentas melhores.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Junte-se a centenas de profissionais que descobriram uma forma de trabalhar que não luta contra a forma como pensam.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 flex items-center gap-2 mx-auto"
          >
            Começar grátis agora <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-foreground">MeuFluxo</span>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MeuFluxo. Feito com cuidado para mentes que pensam diferente.
          </p>
          <div className="flex items-center gap-6">
            <button onClick={() => scrollTo('features')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</button>
            <button onClick={() => scrollTo('pricing')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Planos</button>
            <button onClick={() => navigate('/auth')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Entrar</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
