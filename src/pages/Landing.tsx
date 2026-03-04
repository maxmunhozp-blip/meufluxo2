import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import screenshotMeuDia from "@/assets/screenshot-meudia.png";
import screenshotFoco from "@/assets/screenshot-foco.png";
import screenshotCliente from "@/assets/screenshot-cliente.png";
import screenshotSemana from "@/assets/screenshot-semana.png";
import screenshotTimeline from "@/assets/screenshot-timeline.png";
import avatarAna from "@/assets/avatar-ana.jpg";

/* ── Design tokens — monochromatic, warm neutral ── */
const C = {
  bg: "#FAFAF9",
  dark: "#0A0A0C",
  accent: "#4F6DF5",
  accentP: "#7C3AED",
  accentSoft: "rgba(79,109,245,0.06)",
  text: "#18181B",
  muted: "#71717A",
  mutedL: "#A1A1AA",
  border: "rgba(0,0,0,0.06)",
  white: "#fff",
  mono: "#8888A0",
  monoSoft: "#A0A0B8",
};
const pf = '"Playfair Display",Georgia,serif';
const bd = '"DM Sans",system-ui,sans-serif';

/* ── Animations — CSS only, IntersectionObserver driven ── */
const ANIM_CSS = `
@keyframes mf-fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes mf-scaleIn{from{opacity:0;transform:scale(0.95) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes mf-slideLeft{from{opacity:0;transform:translateX(-48px)}to{opacity:1;transform:translateX(0)}}
@keyframes mf-slideRight{from{opacity:0;transform:translateX(48px)}to{opacity:1;transform:translateX(0)}}
@keyframes mf-blurIn{from{opacity:0;filter:blur(12px);transform:translateY(16px)}to{opacity:1;filter:blur(0);transform:translateY(0)}}
@keyframes mf-rotateIn{from{opacity:0;transform:rotate(-2deg) scale(0.96) translateY(24px)}to{opacity:1;transform:rotate(0) scale(1) translateY(0)}}
@keyframes mf-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
@keyframes mf-faqOpen{from{max-height:0;opacity:0}to{max-height:500px;opacity:1}}
@keyframes mf-faqClose{from{max-height:500px;opacity:1}to{max-height:0;opacity:0}}
@keyframes mf-glow{0%,100%{opacity:0.4}50%{opacity:0.7}}
.mf-r{opacity:0;transform:translateY(32px)}
.mf-r.mf-v{animation:mf-fadeUp .7s cubic-bezier(.22,1,.36,1) forwards}
.mf-sl{opacity:0;transform:translateX(-48px)}
.mf-sl.mf-v{animation:mf-slideLeft .8s cubic-bezier(.22,1,.36,1) forwards}
.mf-sr{opacity:0;transform:translateX(48px)}
.mf-sr.mf-v{animation:mf-slideRight .8s cubic-bezier(.22,1,.36,1) forwards}
.mf-bl{opacity:0;filter:blur(12px);transform:translateY(16px)}
.mf-bl.mf-v{animation:mf-blurIn .9s cubic-bezier(.22,1,.36,1) forwards}
.mf-rot{opacity:0;transform:rotate(-2deg) scale(0.96) translateY(24px)}
.mf-rot.mf-v{animation:mf-rotateIn .8s cubic-bezier(.22,1,.36,1) forwards}
.mf-s>.mf-r:nth-child(1).mf-v{animation-delay:0s}
.mf-s>.mf-r:nth-child(2).mf-v{animation-delay:.08s}
.mf-s>.mf-r:nth-child(3).mf-v{animation-delay:.16s}
.mf-s>.mf-r:nth-child(4).mf-v{animation-delay:.24s}
.mf-s>.mf-r:nth-child(5).mf-v{animation-delay:.32s}
.mf-s>.mf-r:nth-child(6).mf-v{animation-delay:.4s}
.mf-s>.mf-sl:nth-child(1).mf-v{animation-delay:0s}
.mf-s>.mf-sl:nth-child(2).mf-v{animation-delay:.1s}
.mf-s>.mf-sr:nth-child(1).mf-v{animation-delay:0s}
.mf-s>.mf-sr:nth-child(2).mf-v{animation-delay:.1s}
.mf-s>.mf-bl:nth-child(1).mf-v{animation-delay:0s}
.mf-s>.mf-bl:nth-child(2).mf-v{animation-delay:.12s}
.mf-s>.mf-bl:nth-child(3).mf-v{animation-delay:.24s}
.mf-img{opacity:0;transform:perspective(1200px) rotateX(4deg) scale(0.92) translateY(40px);filter:blur(2px)}
.mf-img.mf-v{animation:mf-imgReveal 1.1s cubic-bezier(.16,1,.3,1) forwards}
@keyframes mf-imgReveal{0%{opacity:0;transform:perspective(1200px) rotateX(4deg) scale(0.92) translateY(40px);filter:blur(2px)}60%{filter:blur(0)}100%{opacity:1;transform:perspective(1200px) rotateX(0) scale(1) translateY(0);filter:blur(0)}}
.mf-img .mf-mockup-glow{opacity:0;transition:opacity .6s ease .4s}
.mf-img.mf-v .mf-mockup-glow{opacity:1}
.mf-bounce{animation:mf-bounce 2s ease-in-out infinite}
.mf-faq{overflow:hidden;max-height:0;opacity:0}
.mf-faq.mf-open{animation:mf-faqOpen .35s ease forwards}
.mf-faq.mf-close{animation:mf-faqClose .25s ease forwards}
.mf-mockup-glow{animation:mf-glow 4s ease-in-out infinite}
`;

/* ── Reveal Components ── */
function RevealGroup({ children, className = "", style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.querySelectorAll(".mf-r,.mf-sl,.mf-sr,.mf-bl,.mf-rot,.mf-img").forEach(c => c.classList.add("mf-v")); obs.unobserve(el); }
    }, { threshold: 0.1, rootMargin: "-40px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`mf-s ${className}`} style={style}>{children}</div>;
}

function Reveal({ children, style = {}, className = "" }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("mf-v"); obs.unobserve(el); }
    }, { threshold: 0.15, rootMargin: "-40px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={`mf-r ${className}`} style={style}>{children}</div>;
}

function RevealImg({ src, alt, style = {} }: { src: string; alt: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add("mf-v"); obs.unobserve(el); }
    }, { threshold: 0.1, rootMargin: "-60px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="mf-img" style={{ position: "relative", ...style }}>
      <div className="mf-mockup-glow" style={{ position: "absolute", inset: -20, borderRadius: 32, background: "radial-gradient(ellipse at 50% 80%, rgba(79,109,245,0.15) 0%, transparent 60%)", filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", boxShadow: "0 16px 48px -8px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Desktop chrome */}
        <div className="hidden sm:flex" style={{ background: "#1E1E22", padding: "8px 14px", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28C840" }} />
          </div>
          <div style={{ flex: 1, marginLeft: 10, padding: "4px 12px", borderRadius: 5, background: "rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "SF Mono, Monaco, monospace" }}>app.meufluxo.com</span>
          </div>
        </div>
        {/* Mobile chrome */}
        <div className="flex sm:hidden" style={{ background: "#1E1E22", padding: "5px 10px", alignItems: "center", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#28C840" }} />
          </div>
          <div style={{ flex: 1, marginLeft: 6, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "SF Mono, Monaco, monospace" }}>app.meufluxo.com</span>
          </div>
        </div>
        <img src={src} alt={alt} loading="lazy" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    </div>
  );
}

/* ── Data ── */
const STORIES = [
  {
    id: "cog",
    photo: avatarAna,
    name: "Ana, 28",
    role: "Designer freelancer · TDAH",
    quote: "Eu abria o Trello e já sentia uma onda de ansiedade. Tantas colunas, tantos cards. Meu cérebro simplesmente desligava.",
    studyTitle: "Sobrecarga Cognitiva e TDAH",
    studyBody: "Pessoas com TDAH já gastam mais energia cognitiva em tarefas comuns. Quando uma interface apresenta muitos elementos competindo por atenção, a fadiga decisional se intensifica — e o cérebro para de processar. Carga cognitiva adicional degrada performance e eficiência neural de forma desproporcional no TDAH.",
    cite1: "Le Cunff et al., 2024 · Cognitive Load and Neurodiversity (Frontiers in Education)",
    cite2: "Machida et al., 2023 · Brain Network Efficiency in ADHD (PMC10727773)",
    label: "Carga Cognitiva Reduzida",
    solution: "Interface com hierarquia visual mínima. Uma informação por vez. Espaçamento generoso. Zero barras de progresso, zero contadores, zero métricas competindo pela sua atenção.",
    mockup: screenshotMeuDia,
  },
  {
    id: "pun",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80",
    name: "Lucas, 34",
    role: "Gerente de projetos · TDAH + Ansiedade",
    quote: "Toda vez que eu via a barra vermelha, 37% concluído, eu sentia que era um fracasso. A ferramenta que deveria me ajudar estava me julgando.",
    studyTitle: "Recompensa, Punição e Ansiedade",
    studyBody: "Sistemas de recompensa/punição ativam respostas de ansiedade em cérebros neurodivergentes. Barras de progresso, streaks e alertas vermelhos ativam exatamente esse circuito. Duolingo redesenhou suas notificações por esse motivo — substituindo culpa por encorajamento gentil.",
    cite1: "Sonuga-Barke, 2005 · Reward/Punishment Sensitivity in ADHD",
    cite2: "Aufait UX, 2025 · Duolingo replaced guilt-based reminders with gentle messages",
    label: "Feedback Não-Punitivo",
    solution: "Zero barras de progresso. Zero streaks. Tarefas atrasadas recebem tom âmbar discreto e são gentilmente movidas para o dia seguinte com Rollover Automático. A ferramenta te informa, nunca te julga.",
    mockup: screenshotTimeline,
  },
  {
    id: "dec",
    photo: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&q=80",
    name: "Mariana, 31",
    role: "Empreendedora · TDAH",
    quote: "Eu tinha 47 tarefas no Asana. Qual fazer primeiro? Meu cérebro travava. Passava 2 horas decidindo e não fazia nenhuma.",
    studyTitle: "Paralisia por Decisão",
    studyBody: "O 'Paradoxo da Escolha' é amplificado em TDAH. Muitas opções geram ansiedade sobre a escolha 'errada'. Design minimalista com apenas informações necessárias é essencial — está ok scrollar, nem tudo precisa caber numa tela.",
    cite1: "Schwartz, 2004 · The Paradox of Choice",
    cite2: "Wolf, 2023 · Software Accessibility for ADHD Users (UX Collective)",
    label: "Modo Foco",
    solution: "Uma tarefa de cada vez, em tela cheia. Sem sidebar, sem lista. Apenas a tarefa atual e dois botões — 'Feito' e 'Próxima'. Quando tudo é demais, menos é tudo.",
    mockup: screenshotFoco,
  },
  {
    id: "sen",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80",
    name: "Pedro, 26",
    role: "Desenvolvedor · TEA",
    quote: "Interfaces com muitas cores e contrastes fortes me causam desconforto físico. Preciso de consistência visual pra conseguir trabalhar.",
    studyTitle: "Sensibilidade Sensorial no TEA",
    studyBody: "Anomalias no processamento sensorial afetam até 95% das pessoas no espectro autista. Paletas de cores neurodivergent-friendly usam tons suaves e mutados ao invés de cores brilhantes e saturadas, criando um ambiente mais confortável e menos estimulante.",
    cite1: "Ben-Sasson et al., 2019 · Meta-análise sensorial no TEA (55 estudos)",
    cite2: "Adchitects, 2024 · Neurodivergent-friendly color palettes minimize sensory overload",
    label: "Consistência Sensorial",
    solution: "Dark mode com pretos quentes (#0C0C0E). Transições suaves. Paleta consistente com contraste calculado. Sem animações abruptas, sem flashes, sem surpresas visuais.",
    mockup: screenshotCliente,
  },
];

const FAQ_DATA = [
  { q: 'O que significa "projetado para neurodivergentes"?', a: "Cada decisão de design foi baseada em pesquisas sobre TDAH, TEA e dificuldades executivas. Não é marketing — é metodologia." },
  { q: "Preciso ter um diagnóstico?", a: "Não. Se ferramentas tradicionais te sobrecarregam, o MeuFluxo foi feito pra você. 1 em cada 5 pessoas é neurodivergente — a maioria sem diagnóstico." },
  { q: "Diferença Free vs Pro?", a: "Free: 3 projetos, 20 tarefas. Pro: tudo ilimitado + Timeline, recorrentes, rollover automático, notas e uploads." },
  { q: "Posso cancelar?", a: "Sim, sem compromisso. Downgrade quando quiser." },
];

/* ── FAQ ── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const toggle = () => {
    if (open) { setClosing(true); setTimeout(() => { setOpen(false); setClosing(false); }, 250); }
    else setOpen(true);
  };
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={toggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", background: "none", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 500, color: C.text, textAlign: "left", fontFamily: bd }}>
        <span>{q}</span>
        <span style={{ fontSize: 20, color: C.mutedL, transform: open && !closing ? "rotate(45deg)" : "none", transition: "transform 0.2s", flexShrink: 0, marginLeft: 16 }}>+</span>
      </button>
      {(open || closing) && <div className={`mf-faq ${closing ? "mf-close" : "mf-open"}`}><p style={{ paddingBottom: 20, fontSize: 14, lineHeight: 1.7, color: C.muted }}>{a}</p></div>}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN LANDING
   ═══════════════════════════════════════ */
const Landing = () => {
  const [sc, setSc] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroProgress, setHeroProgress] = useState(0);

  useEffect(() => {
    if (!document.getElementById("mf-css")) {
      const s = document.createElement("style");
      s.id = "mf-css";
      s.textContent = ANIM_CSS;
      document.head.appendChild(s);
    }
    const f = () => {
      setSc(window.scrollY > 30);
      // Scroll-driven progress for hero mockup (0 → 1 over first 800px)
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const viewH = window.innerHeight;
        // Progress: 0 when mockup enters view, 1 when it's scrolled past
        const raw = 1 - (rect.top / viewH);
        setHeroProgress(Math.max(0, Math.min(1, raw)));
      }
    };
    window.addEventListener("scroll", f, { passive: true });
    f(); // initial calc
    return () => window.removeEventListener("scroll", f);
  }, []);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div style={{ fontFamily: bd, background: C.bg, color: C.text, overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, transition: "all 0.3s", background: sc || mobileMenu ? "rgba(250,250,249,0.95)" : "transparent", backdropFilter: sc || mobileMenu ? "blur(20px) saturate(180%)" : "none", borderBottom: sc ? "1px solid rgba(0,0,0,0.05)" : "1px solid transparent" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="/meufluxo-logo.svg" alt="MeuFluxo" style={{ height: 22, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
          {/* Desktop nav */}
          <div className="hidden sm:flex" style={{ alignItems: "center", gap: 16 }}>
            {[["A Ciência", "stories"], ["Planos", "pricing"], ["FAQ", "faq"]].map(([l, id]) => (
              <button key={id} onClick={() => go(id)} style={{ fontSize: 14, fontWeight: 500, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>{l}</button>
            ))}
            <a href="/auth" style={{ fontSize: 14, fontWeight: 500, color: C.muted, textDecoration: "none", cursor: "pointer" }}>Login</a>
            <a href="/auth" style={{ height: 40, padding: "0 22px", borderRadius: 999, fontSize: 14, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg,${C.accent},${C.accentP})`, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(79,109,245,0.3)", display: "inline-flex", alignItems: "center", textDecoration: "none", whiteSpace: "nowrap" }}>Começar grátis</a>
          </div>
          {/* Mobile hamburger */}
          <div className="flex sm:hidden" style={{ alignItems: "center", gap: 12 }}>
            <a href="/auth" style={{ height: 36, padding: "0 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg,${C.accent},${C.accentP})`, display: "inline-flex", alignItems: "center", textDecoration: "none", whiteSpace: "nowrap" }}>Começar</a>
            <button onClick={() => setMobileMenu(!mobileMenu)} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: C.text, borderRadius: 10 }} aria-label="Menu">
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {/* Mobile menu overlay */}
        {mobileMenu && (
          <div className="sm:hidden" style={{ padding: "8px 20px 24px", display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
            {[["A Ciência", "stories"], ["Planos", "pricing"], ["FAQ", "faq"]].map(([l, id]) => (
              <button key={id} onClick={() => { go(id); setMobileMenu(false); }} style={{ fontSize: 15, fontWeight: 500, color: C.text, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "14px 8px", borderRadius: 10 }}>{l}</button>
            ))}
            <a href="/auth" style={{ fontSize: 15, fontWeight: 500, color: C.text, textDecoration: "none", padding: "14px 8px", borderRadius: 10 }}>Login</a>
          </div>
        )}
      </nav>

      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "visible" }} className="px-4 sm:px-6 pt-24 pb-16 sm:pt-[120px] sm:pb-[100px]">
        <div style={{ position: "absolute", top: "-30%", right: "-15%", width: "65vw", height: "65vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(79,109,245,0.06) 0%,transparent 55%)", pointerEvents: "none" }} />
        <RevealGroup style={{ textAlign: "center", maxWidth: 900 }}>
          <div className="mf-r" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 20px", borderRadius: 999, background: C.accentSoft, border: "1px solid rgba(79,109,245,0.12)", marginBottom: 32 }}>
            <span className="text-[10px] sm:text-[11px]" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.accent }}>Projetado para mentes neurodivergentes</span>
          </div>
          <h1 className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(2.2rem,7.5vw,6rem)", fontWeight: 700, lineHeight: 1.02, letterSpacing: "-0.03em", marginBottom: 24 }}>
            Produtividade que<br /><span style={{ background: `linear-gradient(135deg,${C.accent},${C.accentP},#A78BFA)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>respeita</span> como<br />você pensa.
          </h1>
          <p className="mf-r text-[15px] sm:text-[18px]" style={{ lineHeight: 1.6, color: C.muted, maxWidth: 520, margin: "0 auto 40px" }}>Cada feature nasceu de um estudo científico.<br />Cada estudo nasceu de uma dor real.</p>
          <div className="mf-r flex gap-3 sm:gap-[14px] justify-center flex-wrap">
            <a href="/auth" className="h-12 sm:h-14 px-6 sm:px-9 text-[14px] sm:text-[15px]" style={{ borderRadius: 999, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg,${C.accent},${C.accentP})`, border: "none", cursor: "pointer", boxShadow: "0 8px 32px rgba(79,109,245,0.35)", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>Começar grátis <span style={{ color: "rgba(255,255,255,0.6)" }}>→</span></a>
            <button onClick={() => go("stories")} className="h-12 sm:h-14 px-6 sm:px-9 text-[14px] sm:text-[15px]" style={{ borderRadius: 999, fontWeight: 500, color: C.muted, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>Ver a ciência <span style={{ color: C.mutedL }}>↓</span></button>
          </div>
        </RevealGroup>

        {/* Hero — Browser Chrome Frame + scroll-driven 3D */}
        <Reveal className="w-full max-w-[1100px] mx-auto mt-10 sm:mt-14" style={{ position: "relative", perspective: 1200 }}>
          <div style={{ position: "absolute", inset: -40, borderRadius: 32, background: "radial-gradient(ellipse at 50% 80%,rgba(79,109,245,0.12) 0%,transparent 60%)", filter: "blur(50px)", pointerEvents: "none", opacity: 0.4 + heroProgress * 0.6 }} />
          <div
            ref={heroRef}
            style={{
              position: "relative",
              willChange: "transform",
              transform: `
                scale(${0.88 + heroProgress * 0.12})
                rotateX(${(1 - heroProgress) * 8}deg)
                translateY(${(1 - heroProgress) * 30}px)
              `,
              transformOrigin: "center bottom",
              transition: "transform 0.05s linear",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: `0 ${20 + heroProgress * 40}px ${40 + heroProgress * 60}px -${10 + heroProgress * 10}px rgba(0,0,0,${0.15 + heroProgress * 0.2})`,
            }}
          >
            {/* Browser chrome bar — hidden on very small screens */}
            <div className="hidden sm:flex" style={{
              background: "#1E1E22",
              padding: "10px 16px",
              alignItems: "center",
              gap: 8,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <div style={{
                flex: 1,
                marginLeft: 12,
                padding: "5px 14px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "SF Mono, Monaco, monospace", letterSpacing: "0.02em" }}>app.meufluxo.com</span>
              </div>
            </div>
            {/* Compact mobile chrome bar */}
            <div className="flex sm:hidden" style={{
              background: "#1E1E22",
              padding: "6px 12px",
              alignItems: "center",
              gap: 5,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FEBC2E" }} />
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <div style={{ flex: 1, marginLeft: 6, padding: "3px 10px", borderRadius: 5, background: "rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "SF Mono, Monaco, monospace" }}>app.meufluxo.com</span>
              </div>
            </div>
            <img src={screenshotMeuDia} alt="MeuFluxo — visão Meu Dia com sidebar e detalhes de tarefa" loading="eager" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </Reveal>

        <div className="mf-bounce hidden sm:block" style={{ position: "absolute", bottom: 32, color: C.mutedL, fontSize: 24 }}>↓</div>
      </section>

      {/* INTRO — 2ª dobra: acolhimento + autoridade */}
      <section className="py-16 sm:py-[100px] px-4 sm:px-6" style={{ background: C.white, textAlign: "center" }}>
        <RevealGroup style={{ maxWidth: 740, margin: "0 auto" }}>
          <p className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(1.2rem,3vw,2rem)", lineHeight: 1.4, fontWeight: 500 }}>
            Ferramentas de produtividade <em style={{ fontStyle: "normal", color: C.accent }}>tradicionais</em> foram projetadas para cérebros neurotípicos.<br />Se você tem TDAH ou TEA, elas <strong style={{ fontWeight: 700 }}>não</strong> foram feitas pra você.
          </p>
          <p className="mf-r text-sm sm:text-base" style={{ color: C.muted, marginTop: 24, lineHeight: 1.7, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            Não é falta de disciplina. Não é preguiça. A ciência mostra que seu cérebro processa informação de forma diferente — e precisa de ferramentas que respeitem isso.
          </p>
          <p className="mf-r text-[13px] sm:text-[15px]" style={{ color: C.text, marginTop: 20, fontWeight: 500, lineHeight: 1.6 }}>O MeuFluxo foi construído para como o <em style={{ fontStyle: "italic" }}>seu</em> cérebro funciona.<br /><span style={{ color: C.muted, fontWeight: 400, fontSize: "inherit" }}>E temos a pesquisa pra provar.</span></p>
        </RevealGroup>
      </section>

      {/* PONTE — contexto empático antes das stories (hidden on mobile to reduce redundancy) */}
      <section className="hidden sm:block py-10 sm:py-[60px] px-4 sm:px-6 pb-14 sm:pb-20" style={{ background: C.bg, textAlign: "center" }}>
        <RevealGroup style={{ maxWidth: 720, margin: "0 auto" }}>
          <p className="mf-bl text-sm sm:text-base" style={{ fontFamily: bd, lineHeight: 1.7, color: C.muted }}>
            Ferramentas tradicionais foram desenhadas para um tipo de cérebro — o que foca naturalmente, prioriza sem esforço e não se paralisa diante de listas. Se isso não descreve você, o MeuFluxo foi construído para como o <em style={{ fontStyle: "italic", color: C.text }}>seu</em> cérebro realmente funciona.
          </p>
        </RevealGroup>
      </section>

      {/* STORIES — real screenshots */}
      <div id="stories">
        {STORIES.map((st, i) => (
          <section key={st.id} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
            <div style={{ position: "relative", overflow: "hidden" }} className="min-h-[320px] sm:min-h-[460px]">
              <div style={{ position: "absolute", inset: 0, background: `url(${st.photo}) center/cover`, filter: "brightness(0.3)" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.7))" }} />
              <RevealGroup className="relative max-w-[680px] mx-auto px-5 sm:px-8 py-16 sm:py-[100px]" style={{ color: "#fff" }}>
                <div className="mf-bl flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex-shrink-0" style={{ background: `url(${st.photo}) center/cover`, border: "2px solid rgba(255,255,255,0.3)" }} />
                  <div><p className="text-sm sm:text-[15px] font-semibold">{st.name}</p><p className="text-[11px] sm:text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{st.role}</p></div>
                </div>
                <blockquote className="mf-bl" style={{ fontFamily: pf, fontSize: "clamp(1.1rem,3vw,1.9rem)", lineHeight: 1.35, fontWeight: 500, fontStyle: "italic", margin: 0 }}>"{st.quote}"</blockquote>
              </RevealGroup>
            </div>
            <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-12 sm:py-[72px]">
              <RevealGroup className="flex flex-col lg:flex-row gap-8 sm:gap-14 items-center">
                <div className={`w-full lg:flex-1 lg:min-w-[300px] ${i % 2 === 0 ? '' : 'lg:order-2'}`}>
                  <div className={i % 2 === 0 ? 'mf-sl' : 'mf-sr'}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, background: C.accentSoft, border: "1px solid rgba(79,109,245,0.1)", marginBottom: 18 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.accent }}>O estudo</span>
                    </div>
                  </div>
                  <h3 className={i % 2 === 0 ? 'mf-sl' : 'mf-sr'} style={{ fontFamily: pf, fontSize: "clamp(1.3rem,3vw,2rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: 14 }}>{st.studyTitle}</h3>
                  <p className={`${i % 2 === 0 ? 'mf-sl' : 'mf-sr'} text-[14px] sm:text-[15px]`} style={{ lineHeight: 1.7, color: C.muted, marginBottom: 14 }}>{st.studyBody}</p>
                  <div className={i % 2 === 0 ? 'mf-sl' : 'mf-sr'} style={{ padding: 14, borderRadius: 10, background: C.accentSoft, border: "1px solid rgba(79,109,245,0.08)" }}>
                    <p style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 4 }}>Referências</p>
                    <p style={{ fontSize: 11, lineHeight: 1.5, color: C.muted }}>{st.cite1}</p>
                    <p style={{ fontSize: 11, lineHeight: 1.5, color: C.muted }}>{st.cite2}</p>
                  </div>
                  <div className={i % 2 === 0 ? 'mf-sl' : 'mf-sr'} style={{ marginTop: 28 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)", marginBottom: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10B981" }}>{st.label}</span>
                    </div>
                    <p className="text-[14px] sm:text-[15px]" style={{ lineHeight: 1.7, color: "#374151" }}>{st.solution}</p>
                  </div>
                </div>
                <div className={`${i % 2 === 0 ? 'mf-rot' : 'mf-rot'} w-full lg:flex-1 lg:min-w-[300px] ${i % 2 === 0 ? '' : 'lg:order-1'}`} style={{ position: "relative" }}>
                  <RevealImg src={st.mockup} alt={`MeuFluxo — ${st.label}`} />
                </div>
              </RevealGroup>
            </div>
          </section>
        ))}
      </div>

      {/* PRICING */}
      <section id="pricing" className="py-16 sm:py-[120px] px-4 sm:px-6" style={{ background: C.dark, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "radial-gradient(circle at 1px 1px,rgba(79,109,245,0.4) 1px,transparent 0)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ maxWidth: 780, margin: "0 auto", position: "relative" }}>
          <RevealGroup style={{ textAlign: "center", marginBottom: 56 }}>
            <p className="mf-r" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: C.accent, marginBottom: 14 }}>Planos</p>
            <h2 className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(1.8rem,4vw,3rem)", fontWeight: 700, lineHeight: 1.1, color: "#fff" }}>Simples e transparente.</h2>
          </RevealGroup>
          <RevealGroup className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="mf-sl p-5 sm:p-7" style={{ borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Free</h3>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>Para começar sem pressão</p>
              <p style={{ marginBottom: 22 }}><span className="text-3xl sm:text-[40px]" style={{ fontFamily: pf, fontWeight: 700, color: "#fff" }}>R$0</span><span className="text-xs sm:text-[13px]" style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>/mês</span></p>
              {["1 Workspace", "3 Projetos", "20 Tarefas/projeto", "Dark & Light mode"].map(f => (
                <div key={f} className="flex items-center gap-2 mb-2 text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}><span style={{ color: C.mono }}>✓</span>{f}</div>
              ))}
              <a href="/auth" className="block w-full h-[42px] mt-4 text-[13px] font-semibold text-center leading-[42px]" style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>Criar conta grátis</a>
            </div>
            <div className="mf-sr p-5 sm:p-7 relative mt-6 sm:mt-0" style={{ borderRadius: 20, background: "rgba(79,109,245,0.08)", border: "2px solid rgba(79,109,245,0.3)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1" style={{ borderRadius: 999, background: `linear-gradient(135deg,${C.accent},${C.accentP})`, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff", whiteSpace: "nowrap" }}>Recomendado</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Pro</h3>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>Para profissionais</p>
              <p style={{ marginBottom: 22 }}><span className="text-3xl sm:text-[40px]" style={{ fontFamily: pf, fontWeight: 700, color: "#fff" }}>R$29</span><span className="text-xs sm:text-[13px]" style={{ color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>/mês</span></p>
              {["Tudo ilimitado", "Timeline View", "Recorrentes", "Rollover Auto", "Notas", "Uploads"].map(f => (
                <div key={f} className="flex items-center gap-2 mb-2 text-[13px] font-medium" style={{ color: "#fff" }}><span style={{ color: C.accent }}>✓</span>{f}</div>
              ))}
              <a href="/auth" className="block w-full h-[42px] mt-4 text-[13px] font-semibold text-center leading-[42px]" style={{ borderRadius: 999, border: "none", background: `linear-gradient(135deg,${C.accent},${C.accentP})`, color: "#fff", boxShadow: "0 4px 16px rgba(79,109,245,0.3)", textDecoration: "none" }}>Começar com Pro</a>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 sm:py-[100px] px-4 sm:px-6" style={{ background: C.white }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: pf, fontSize: "clamp(1.6rem,4vw,2.6rem)", fontWeight: 700, lineHeight: 1.1 }}>Perguntas frequentes</h2>
          </Reveal>
          {FAQ_DATA.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-[120px] px-4 sm:px-6 text-center" style={{ background: C.dark, position: "relative", overflow: "hidden" }}>
        <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[180px] sm:h-[250px]" style={{ background: "radial-gradient(ellipse,rgba(79,109,245,0.2) 0%,transparent 60%)", filter: "blur(80px)", pointerEvents: "none" }} />
        <RevealGroup style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
          <h2 className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(1.8rem,5vw,3.2rem)", fontWeight: 700, lineHeight: 1.08, color: "#fff", marginBottom: 16 }}>Seu cérebro merece<br />ferramentas melhores.</h2>
          <p className="mf-r text-sm sm:text-[15px]" style={{ color: "rgba(255,255,255,0.4)", marginBottom: 36 }}>Cada feature nasceu de um estudo. Cada estudo nasceu de uma dor.<br />O MeuFluxo foi construído por quem vive isso.</p>
          <div className="mf-r"><a href="/auth" className="h-12 sm:h-14 px-8 sm:px-10 text-[14px] sm:text-[15px]" style={{ borderRadius: 999, fontWeight: 700, color: C.dark, background: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>Começar grátis agora <span style={{ color: C.mutedL }}>→</span></a></div>
        </RevealGroup>
      </section>

      <footer style={{ padding: "36px 24px", background: C.dark, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <span style={{ fontFamily: pf, fontSize: 18, fontWeight: 700, color: "#fff" }}>MeuFluxo</span>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>© 2026 MeuFluxo. Feito para mentes que pensam diferente.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
