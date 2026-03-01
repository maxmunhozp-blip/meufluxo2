import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import appMockup from '@/assets/app-mockup.png';
import screenshotMeuDia from '@/assets/screenshot-meudia.png';
import screenshotCliente from '@/assets/screenshot-cliente.png';
import screenshotFoco from '@/assets/screenshot-foco.png';
import screenshotTimeline from '@/assets/screenshot-timeline.png';
import screenshotSemana from '@/assets/screenshot-semana.png';
import {
  Brain, ArrowRight, ChevronDown, Menu, X, Check,
  CheckCircle, Eye, Clock, ListChecks, Users, Calendar,
  Shield, Sparkles, Sun, Zap,
} from 'lucide-react';

/* ── Fonts ── */
const fontLink = document.querySelector('link[data-mf-font]');
if (!fontLink) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&display=swap';
  link.setAttribute('data-mf-font', '1');
  document.head.appendChild(link);
}
const serif = '"DM Serif Display", Georgia, serif';
const sans = '"DM Sans", system-ui, sans-serif';

/* ── Animations ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

/* ── Data ── */
const FEATURES = [
  { icon: Brain, title: 'Projetado para seu cérebro', desc: 'Sem barras de progresso punitivas. Sem gamificação que gera culpa. Apenas um fluxo que respeita como você realmente trabalha.', accent: '#4F7BF7' },
  { icon: Eye, title: 'Carga cognitiva reduzida', desc: 'Interface limpa com hierarquia visual clara. Cada pixel foi pensado para não competir pela sua atenção.', accent: '#8B5CF6' },
  { icon: Clock, title: 'Contexto temporal gentil', desc: 'Datas atrasadas não são punições — são informações. Tons âmbar, não vermelho agressivo.', accent: '#F59E0B' },
  { icon: ListChecks, title: 'Seções personalizáveis', desc: 'Organize cada cliente com seções como "Para Aprovar", "Design" e "Posts Aprovados".', accent: '#10B981' },
  { icon: Users, title: 'Colaboração sem pressão', desc: 'Workspaces compartilhados onde cada membro vê o que precisa. Sem notificações invasivas.', accent: '#EC4899' },
  { icon: Calendar, title: 'Meu Dia, Minha Semana', desc: 'Visualizações que se adaptam ao seu ritmo. Planeje por dia ou semana, sem a tirania do mês inteiro.', accent: '#06B6D4' },
];

const SCIENCE = [
  { title: 'Redução de carga cognitiva', text: 'Interfaces com excesso de elementos visuais aumentam a fadiga decisional em pessoas com TDAH em até 3x (Sweller, 2011). MeuFluxo usa hierarquia visual mínima e espaçamento generoso.' },
  { title: 'Feedback não-punitivo', text: 'Sistemas de recompensa/punição ativam respostas de ansiedade em cérebros neurodivergentes (Sonuga-Barke, 2005). Substituímos barras de progresso por contadores neutros e tons âmbar.' },
  { title: 'Ancoragem em uma tarefa', text: 'A "paralisia por escolha" é amplificada em TDAH. Limitamos a visão a uma tarefa por vez no Modo Foco, reduzindo a sobrecarga de decisão (Barkley, 2015).' },
  { title: 'Consistência sensorial', text: 'Variações abruptas de contraste e cor causam desconforto em pessoas no espectro autista (Grandin & Panek, 2013). Nosso dark mode usa pretos quentes e transições suaves.' },
];

const FAQ = [
  { q: 'O que significa ser "projetado para neurodivergentes"?', a: 'Cada decisão de design foi baseada em pesquisas sobre TDAH, TEA e dificuldades executivas. Removemos barras de progresso punitivas, usamos cores gentis, oferecemos Modo Foco para uma tarefa de cada vez, e minimizamos a carga cognitiva.' },
  { q: 'Preciso ter um diagnóstico para usar?', a: 'Não. O MeuFluxo é para qualquer pessoa que se sente sobrecarregada com ferramentas tradicionais. Se você já abandonou um Trello, Notion ou Asana por excesso de complexidade, o MeuFluxo foi feito para você.' },
  { q: 'Qual a diferença entre Free e Pro?', a: 'O Free oferece até 3 projetos, 20 tarefas por projeto, subtarefas, modo foco e colaboração básica. O Pro desbloqueia tudo ilimitado, Timeline View, tarefas recorrentes, rollover automático, notas ilimitadas e upload de imagens.' },
  { q: 'Posso usar com minha equipe?', a: 'Sim! Cada workspace permite convidar membros. Você pode atribuir tarefas, compartilhar projetos e colaborar — tudo sem notificações invasivas.' },
  { q: 'O que é o "Rollover Automático"?', a: 'Tarefas atrasadas não desaparecem nem ficam vermelhas. Elas são gentilmente movidas para o dia seguinte com um indicador âmbar discreto. Sem culpa, sem punição.' },
  { q: 'Meus dados estão seguros?', a: 'Sim. Usamos criptografia em trânsito e em repouso, autenticação segura e políticas de acesso que garantem que cada usuário só acessa seus próprios dados.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem compromisso. Downgrade para o Free a qualquer momento e manterá acesso aos seus dados.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div style={{ fontFamily: sans, background: '#FAFBFC', color: '#1a1a2e', overflowX: 'hidden' }}>

      {/* ══════ NAV ══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: scrolled ? 'rgba(250,251,252,0.8)' : 'transparent', backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none', borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span style={{ fontFamily: serif, fontSize: 22, color: '#1a1a2e', letterSpacing: '-0.02em' }}>MeuFluxo</span>
          <div className="hidden md:flex items-center gap-8">
            {[['Funcionalidades','features'],['A Ciência','science'],['Planos','pricing'],['FAQ','faq']].map(([l,id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium transition-colors duration-200" style={{ color: '#6B7280' }} onMouseOver={e=>e.currentTarget.style.color='#1a1a2e'} onMouseOut={e=>e.currentTarget.style.color='#6B7280'}>{l}</button>
            ))}
            <button onClick={() => navigate('/auth')} className="text-sm font-medium" style={{ color: '#1a1a2e' }}>Entrar</button>
            <button onClick={() => navigate('/auth')} className="h-10 px-5 rounded-full text-sm font-semibold text-white transition-all duration-200" style={{ background: 'linear-gradient(135deg,#4F7BF7,#6C63FF)', boxShadow: '0 2px 12px rgba(79,123,247,0.3)' }}
              onMouseOver={e=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(79,123,247,0.4)';e.currentTarget.style.transform='translateY(-1px)';}} onMouseOut={e=>{e.currentTarget.style.boxShadow='0 2px 12px rgba(79,123,247,0.3)';e.currentTarget.style.transform='translateY(0)';}}>Começar grátis</button>
          </div>
          <button onClick={()=>setMenuOpen(!menuOpen)} className="md:hidden p-2" style={{color:'#6B7280'}}>{menuOpen?<X className="w-5 h-5"/>:<Menu className="w-5 h-5"/>}</button>
        </div>
        {menuOpen&&(<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="md:hidden absolute top-16 inset-x-0 p-6 space-y-4" style={{background:'rgba(250,251,252,0.97)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
          {[['Funcionalidades','features'],['A Ciência','science'],['Planos','pricing'],['FAQ','faq']].map(([l,id])=>(<button key={id} onClick={()=>scrollTo(id)} className="block w-full text-left text-sm" style={{color:'#6B7280'}}>{l}</button>))}
          <hr style={{borderColor:'rgba(0,0,0,0.06)'}}/>
          <button onClick={()=>navigate('/auth')} className="block w-full text-left text-sm font-medium" style={{color:'#1a1a2e'}}>Entrar</button>
          <button onClick={()=>navigate('/auth')} className="w-full h-11 rounded-full text-sm font-semibold text-white" style={{background:'linear-gradient(135deg,#4F7BF7,#6C63FF)'}}>Começar grátis</button>
        </motion.div>)}
      </nav>

      {/* ══════ HERO ══════ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{position:'absolute',top:'-20%',right:'-10%',width:'60vw',height:'60vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(79,123,247,0.07) 0%,transparent 60%)'}}/>
          <div style={{position:'absolute',bottom:'-10%',left:'-15%',width:'50vw',height:'50vw',borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.05) 0%,transparent 60%)'}}/>
        </div>
        <motion.div style={{y:heroY,opacity:heroOpacity}} className="relative text-center max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-8" style={{background:'rgba(79,123,247,0.06)',border:'1px solid rgba(79,123,247,0.12)'}}>
            <Brain className="w-4 h-4" style={{color:'#4F7BF7'}}/>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{color:'#4F7BF7',letterSpacing:'0.1em'}}>Projetado para mentes neurodivergentes</span>
          </motion.div>
          <motion.h1 variants={fadeUp} initial="hidden" animate="visible" custom={1} style={{fontFamily:serif,fontSize:'clamp(2.8rem,7vw,5rem)',color:'#1a1a2e',lineHeight:1.05,letterSpacing:'-0.02em'}}>
            Produtividade que{' '}<span style={{background:'linear-gradient(135deg,#4F7BF7 0%,#8B5CF6 50%,#A78BFA 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>respeita</span><br/>como você pensa.
          </motion.h1>
          <motion.p variants={fadeUp} initial="hidden" animate="visible" custom={2} className="mt-6 mb-10 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{color:'#6B7280'}}>O gerenciador de tarefas criado com base em pesquisas sobre TDAH, TEA e neurodiversidade. Menos culpa, mais tração. Uma tarefa de cada vez.</motion.p>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={()=>navigate('/auth')} className="h-14 px-10 rounded-full font-semibold text-base text-white flex items-center gap-2.5 transition-all duration-200" style={{background:'linear-gradient(135deg,#4F7BF7,#6C63FF)',boxShadow:'0 8px 30px rgba(79,123,247,0.3)'}} onMouseOver={e=>{e.currentTarget.style.boxShadow='0 12px 40px rgba(79,123,247,0.4)';e.currentTarget.style.transform='translateY(-2px)';}} onMouseOut={e=>{e.currentTarget.style.boxShadow='0 8px 30px rgba(79,123,247,0.3)';e.currentTarget.style.transform='translateY(0)';}}>
              Começar grátis <ArrowRight className="w-4 h-4"/>
            </button>
            <button onClick={()=>scrollTo('features')} className="h-14 px-10 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200" style={{border:'1px solid rgba(0,0,0,0.1)',color:'#6B7280',background:'rgba(255,255,255,0.6)',backdropFilter:'blur(8px)'}} onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(79,123,247,0.3)';e.currentTarget.style.color='#4F7BF7';}} onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,0.1)';e.currentTarget.style.color='#6B7280';}}>
              Conhecer mais <ChevronDown className="w-4 h-4"/>
            </button>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} style={{scale:heroScale}} className="relative mt-16 w-full max-w-6xl mx-auto px-4">
          <div className="relative">
            <div className="absolute -inset-8 rounded-3xl" style={{background:'radial-gradient(ellipse at center,rgba(79,123,247,0.12) 0%,transparent 70%)',filter:'blur(40px)'}}/>
            <img src={appMockup} alt="MeuFluxo — Dashboard Meu Dia" className="relative w-full h-auto block rounded-xl" loading="eager"/>
          </div>
        </motion.div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section id="features" className="py-28 px-6" style={{background:'#fff'}}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-80px'}} className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'#4F7BF7',letterSpacing:'0.12em'}}>Funcionalidades</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(1.8rem,4vw,2.8rem)',color:'#1a1a2e',lineHeight:1.15}}>Cada detalhe, com propósito.</h2>
            <p className="mt-4 max-w-lg mx-auto" style={{color:'#6B7280'}}>Cada decisão de design é baseada em pesquisas sobre neurodiversidade e redução de carga cognitiva.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f,i)=>{
              const isLarge=i<2;
              return(<motion.div key={f.title} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-40px'}} custom={i}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${isLarge?'lg:row-span-2 p-8':'p-6'}`}
                style={{background:'#fff',border:'1px solid rgba(0,0,0,0.06)'}}
                onMouseOver={e=>{e.currentTarget.style.borderColor=f.accent+'33';e.currentTarget.style.boxShadow=`0 8px 30px ${f.accent}12`;e.currentTarget.style.transform='translateY(-3px)';}}
                onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,0.06)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{background:f.accent+'12'}}><f.icon className="w-5 h-5" style={{color:f.accent}}/></div>
                <h3 className={`font-bold mb-2 ${isLarge?'text-lg':'text-[15px]'}`} style={{color:'#1a1a2e'}}>{f.title}</h3>
                <p className={`leading-relaxed ${isLarge?'text-sm':'text-[13px]'}`} style={{color:'#6B7280'}}>{f.desc}</p>
                <div className="absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{background:`radial-gradient(circle at top right,${f.accent}08,transparent 70%)`}}/>
              </motion.div>);
            })}
          </div>
        </div>
      </section>

      {/* ══════ SHOWCASES ══════ */}
      <section className="py-28 px-6" style={{background:'#FAFBFC'}}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-80px'}} className="text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'#4F7BF7',letterSpacing:'0.12em'}}>Como funciona</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(1.8rem,4vw,2.8rem)',color:'#1a1a2e',lineHeight:1.15}}>Tudo que você precisa, nada que não precisa.</h2>
          </motion.div>
          <div className="space-y-32">
            {[
              {icon:Sun,badge:'Meu Dia',title:'Comece o dia com clareza.',desc:'Suas tarefas organizadas por Manhã, Tarde e Noite. Sem listas infinitas — apenas o que importa hoje.',bullets:['Tarefas agrupadas por período','Badge de cliente em cada tarefa','Modo Foco com um clique'],img:screenshotMeuDia,reverse:false},
              {icon:ListChecks,badge:'Visão por Cliente',title:'Cada cliente, seu próprio espaço.',desc:'Organize entregas em seções personalizáveis. Arraste tarefas entre projetos com um gesto.',bullets:['Seções colapsáveis por tipo','Filtro temporal por mês','Drag & drop entre projetos'],img:screenshotCliente,reverse:true},
              {icon:Eye,badge:'Modo Foco',title:'Uma tarefa de cada vez.',desc:'Quando o mundo é demais, ative o Modo Foco. Veja apenas a tarefa atual. Sem distrações, sem ansiedade.',bullets:['Interface minimalista zen','Navegação por "Próxima"','Ideal para TDAH'],img:screenshotFoco,reverse:false},
            ].map((item,i)=>(
              <motion.div key={item.badge} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-80px'}}
                className={`flex flex-col ${item.reverse?'lg:flex-row-reverse':'lg:flex-row'} items-center gap-12 lg:gap-20`}>
                <div className="flex-1 max-w-md">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{background:'rgba(79,123,247,0.06)',border:'1px solid rgba(79,123,247,0.1)'}}>
                    <item.icon className="w-3.5 h-3.5" style={{color:'#4F7BF7'}}/><span className="text-[11px] font-semibold uppercase tracking-widest" style={{color:'#4F7BF7'}}>{item.badge}</span>
                  </div>
                  <h3 style={{fontFamily:serif,fontSize:'clamp(1.5rem,3vw,2.2rem)',color:'#1a1a2e',lineHeight:1.15,marginBottom:16}}>{item.title}</h3>
                  <p className="leading-relaxed mb-8" style={{color:'#6B7280',fontSize:15}}>{item.desc}</p>
                  <div className="space-y-3">
                    {item.bullets.map(b=>(<div key={b} className="flex items-center gap-3"><div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'rgba(79,123,247,0.1)'}}><CheckCircle className="w-3 h-3" style={{color:'#4F7BF7'}}/></div><span className="text-sm" style={{color:'#4B5563'}}>{b}</span></div>))}
                  </div>
                </div>
                <div className="flex-1 max-w-2xl relative">
                  <div className="absolute -inset-4 rounded-3xl" style={{background:'radial-gradient(ellipse,rgba(79,123,247,0.06) 0%,transparent 70%)',filter:'blur(30px)'}}/>
                  <div className="relative rounded-2xl overflow-hidden" style={{boxShadow:'0 30px 60px -15px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)'}}>
                    <img src={item.img} alt={item.badge} className="w-full h-auto block" loading="lazy"/>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ MORE FEATURES ══════ */}
      <section className="py-20 px-6" style={{background:'#fff',borderTop:'1px solid rgba(0,0,0,0.04)'}}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="text-center mb-12">
            <h3 style={{fontFamily:serif,fontSize:'clamp(1.4rem,3vw,1.8rem)',color:'#1a1a2e'}}>E muito mais.</h3>
            <p className="mt-2 text-sm" style={{color:'#9CA3AF'}}>Timeline, visão semanal, notas rápidas e templates de entrega.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {[{img:screenshotTimeline,alt:'Timeline View'},{img:screenshotSemana,alt:'Minha Semana'}].map((s,i)=>(
              <motion.div key={s.alt} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} custom={i} className="relative group">
                <div className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{background:'radial-gradient(ellipse,rgba(79,123,247,0.06) 0%,transparent 70%)',filter:'blur(20px)'}}/>
                <div className="relative rounded-2xl overflow-hidden transition-transform duration-300 group-hover:-translate-y-1" style={{boxShadow:'0 15px 40px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)'}}>
                  <img src={s.img} alt={s.alt} className="w-full h-auto block" loading="lazy"/>
                </div>
                <p className="mt-3 text-center text-xs font-medium" style={{color:'#9CA3AF'}}>{s.alt}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ SCIENCE ══════ */}
      <section id="science" className="py-28 px-6 relative overflow-hidden" style={{background:'#0F0F1A'}}>
        <div className="absolute inset-0 pointer-events-none" style={{opacity:0.15,backgroundImage:'radial-gradient(circle at 1px 1px,rgba(79,123,247,0.3) 1px,transparent 0)',backgroundSize:'32px 32px'}}/>
        <div className="max-w-4xl mx-auto relative">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="text-center mb-16">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-6" style={{background:'rgba(79,123,247,0.1)',border:'1px solid rgba(79,123,247,0.2)'}}><Shield className="w-4 h-4" style={{color:'#4F7BF7'}}/><span className="text-xs font-semibold uppercase tracking-widest" style={{color:'#4F7BF7'}}>Baseado em pesquisa</span></div>
            <h2 style={{fontFamily:serif,fontSize:'clamp(1.8rem,4vw,2.8rem)',color:'#fff',lineHeight:1.15}}>A ciência por trás do MeuFluxo</h2>
            <p className="mt-4 max-w-2xl mx-auto" style={{color:'rgba(255,255,255,0.5)'}}>Design fundamentado em estudos sobre como cérebros neurodivergentes processam informação.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            {SCIENCE.map((s,i)=>(
              <motion.div key={s.title} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} custom={i} className="p-6 rounded-2xl" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',backdropFilter:'blur(8px)'}}>
                <div className="flex gap-4"><div className="flex-shrink-0 w-1 rounded-full" style={{background:'linear-gradient(180deg,#4F7BF7,#A78BFA)'}}/><div><h4 className="text-sm font-bold mb-2" style={{color:'#fff'}}>{s.title}</h4><p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.5)'}}>{s.text}</p></div></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ PRICING ══════ */}
      <section id="pricing" className="py-28 px-6" style={{background:'#FAFBFC'}}>
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'#4F7BF7',letterSpacing:'0.12em'}}>Planos</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(1.8rem,4vw,2.8rem)',color:'#1a1a2e',lineHeight:1.15}}>Simples e transparente.</h2>
            <p className="mt-3" style={{color:'#6B7280'}}>Comece de graça, faça upgrade quando precisar.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} custom={0} className="p-8 rounded-2xl" style={{border:'1px solid rgba(0,0,0,0.08)',background:'#fff'}}>
              <h3 className="text-lg font-semibold mb-1" style={{color:'#1a1a2e'}}>Free</h3>
              <p className="text-sm mb-5" style={{color:'#6B7280'}}>Para começar sem pressão</p>
              <p className="mb-6"><span style={{fontFamily:serif,fontSize:40,color:'#1a1a2e'}}>R$0</span><span className="text-sm ml-1" style={{color:'#9CA3AF'}}>/mês</span></p>
              <ul className="space-y-3 mb-8">{['1 Workspace','3 Projetos','20 Tarefas por projeto','2 Membros','Dark & Light mode'].map(f=>(<li key={f} className="flex items-center gap-2.5 text-sm" style={{color:'#6B7280'}}><Check className="w-4 h-4 flex-shrink-0" style={{color:'#4F7BF7'}}/>{f}</li>))}</ul>
              <button onClick={()=>navigate('/auth')} className="w-full h-12 rounded-full text-sm font-medium transition-all duration-200" style={{border:'1px solid rgba(0,0,0,0.12)',color:'#1a1a2e'}} onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(79,123,247,0.3)';e.currentTarget.style.color='#4F7BF7';}} onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(0,0,0,0.12)';e.currentTarget.style.color='#1a1a2e';}}>Criar conta grátis</button>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} custom={1} className="relative p-8 rounded-2xl" style={{border:'2px solid #4F7BF7',background:'#fff',boxShadow:'0 8px 30px rgba(79,123,247,0.1)'}}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white" style={{background:'linear-gradient(135deg,#4F7BF7,#6C63FF)',letterSpacing:'0.1em'}}>Recomendado</div>
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{color:'#1a1a2e'}}>Pro <Sparkles className="w-4 h-4" style={{color:'#4F7BF7'}}/></h3>
              <p className="text-sm mb-5" style={{color:'#6B7280'}}>Para profissionais</p>
              <p className="mb-6"><span style={{fontFamily:serif,fontSize:40,color:'#1a1a2e'}}>R$29</span><span className="text-sm ml-1" style={{color:'#9CA3AF'}}>/mês</span></p>
              <ul className="space-y-3 mb-8">{['Tudo ilimitado','Timeline View','Tarefas Recorrentes','Rollover Automático','Notas ilimitadas','Upload de imagens'].map(f=>(<li key={f} className="flex items-center gap-2.5 text-sm" style={{color:'#1a1a2e'}}><CheckCircle className="w-4 h-4 flex-shrink-0" style={{color:'#4F7BF7'}}/>{f}</li>))}</ul>
              <button onClick={()=>navigate('/auth')} className="w-full h-12 rounded-full text-sm font-semibold text-white transition-all duration-200" style={{background:'linear-gradient(135deg,#4F7BF7,#6C63FF)',boxShadow:'0 4px 16px rgba(79,123,247,0.3)'}} onMouseOver={e=>{e.currentTarget.style.boxShadow='0 6px 24px rgba(79,123,247,0.4)';e.currentTarget.style.transform='translateY(-1px)';}} onMouseOut={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(79,123,247,0.3)';e.currentTarget.style.transform='translateY(0)';}}>Começar com Pro</button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════ FAQ ══════ */}
      <section id="faq" className="py-28 px-6" style={{background:'#fff'}}>
        <div className="max-w-3xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'#4F7BF7',letterSpacing:'0.12em'}}>FAQ</p>
            <h2 style={{fontFamily:serif,fontSize:'clamp(1.8rem,4vw,2.8rem)',color:'#1a1a2e',lineHeight:1.15}}>Perguntas frequentes</h2>
          </motion.div>
          <div className="space-y-3">
            {FAQ.map((item,i)=>(
              <motion.details key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} custom={i*0.15} className="group rounded-2xl overflow-hidden" style={{border:'1px solid rgba(0,0,0,0.06)',background:'#fff'}}>
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-sm font-medium list-none [&::-webkit-details-marker]:hidden" style={{color:'#1a1a2e'}}><span>{item.q}</span><ChevronDown className="w-4 h-4 flex-shrink-0 ml-4 transition-transform duration-200 group-open:rotate-180" style={{color:'#9CA3AF'}}/></summary>
                <div className="px-6 pb-5 text-sm leading-relaxed" style={{color:'#6B7280'}}>{item.a}</div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA FINAL ══════ */}
      <section className="py-32 px-6 relative overflow-hidden" style={{background:'linear-gradient(135deg,#0F0F1A 0%,#1a1a3e 100%)'}}>
        <div className="absolute inset-0 pointer-events-none" style={{opacity:0.12,backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.15) 1px,transparent 0)',backgroundSize:'24px 24px'}}/>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 pointer-events-none" style={{background:'radial-gradient(ellipse,rgba(79,123,247,0.2) 0%,transparent 70%)',filter:'blur(60px)'}}/>
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="max-w-2xl mx-auto text-center relative">
          <h2 className="mb-5" style={{fontFamily:serif,fontSize:'clamp(1.8rem,4vw,2.8rem)',color:'#fff',lineHeight:1.15}}>Seu cérebro merece ferramentas melhores.</h2>
          <p className="mb-10 max-w-md mx-auto" style={{color:'rgba(255,255,255,0.5)',fontSize:16}}>Descubra uma forma de trabalhar que não luta contra a forma como você pensa.</p>
          <button onClick={()=>navigate('/auth')} className="h-14 px-10 rounded-full font-semibold text-base flex items-center gap-2.5 mx-auto transition-all duration-200" style={{background:'#fff',color:'#1a1a2e',boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}} onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)';}} onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.2)';}}>
            Começar grátis agora <ArrowRight className="w-4 h-4"/>
          </button>
        </motion.div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="py-12 px-6" style={{background:'#0F0F1A',borderTop:'1px solid rgba(255,255,255,0.04)'}}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <span style={{fontFamily:serif,fontSize:18,color:'#fff'}}>MeuFluxo</span>
          <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>© {new Date().getFullYear()} MeuFluxo. Feito com cuidado para mentes que pensam diferente.</p>
          <div className="flex items-center gap-6">
            {[['Funcionalidades','features'],['Planos','pricing'],['FAQ','faq']].map(([l,id])=>(<button key={id} onClick={()=>scrollTo(id)} className="text-xs transition-colors duration-200" style={{color:'rgba(255,255,255,0.3)'}} onMouseOver={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>{l}</button>))}
            <button onClick={()=>navigate('/auth')} className="text-xs transition-colors duration-200" style={{color:'rgba(255,255,255,0.3)'}} onMouseOver={e=>e.currentTarget.style.color='rgba(255,255,255,0.7)'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>Entrar</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
