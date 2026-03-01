import { useState, useEffect, useRef } from "react";
import appMockup from "@/assets/app-mockup.png";
import mockup1 from "@/assets/fluxo-mockup1.png";
import mockup3 from "@/assets/fluxo-mockup3.png";
import mockup8 from "@/assets/fluxo-mockup8.png";

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
@keyframes mf-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
@keyframes mf-faqOpen{from{max-height:0;opacity:0}to{max-height:500px;opacity:1}}
@keyframes mf-faqClose{from{max-height:500px;opacity:1}to{max-height:0;opacity:0}}
@keyframes mf-glow{0%,100%{opacity:0.4}50%{opacity:0.7}}
.mf-r{opacity:0;transform:translateY(32px)}
.mf-r.mf-v{animation:mf-fadeUp .7s cubic-bezier(.22,1,.36,1) forwards}
.mf-s>.mf-r:nth-child(1).mf-v{animation-delay:0s}
.mf-s>.mf-r:nth-child(2).mf-v{animation-delay:.08s}
.mf-s>.mf-r:nth-child(3).mf-v{animation-delay:.16s}
.mf-s>.mf-r:nth-child(4).mf-v{animation-delay:.24s}
.mf-s>.mf-r:nth-child(5).mf-v{animation-delay:.32s}
.mf-s>.mf-r:nth-child(6).mf-v{animation-delay:.4s}
.mf-img{opacity:0;transform:scale(0.95) translateY(20px)}
.mf-img.mf-v{animation:mf-scaleIn .9s cubic-bezier(.22,1,.36,1) forwards}
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
      if (e.isIntersecting) { el.querySelectorAll(".mf-r,.mf-img").forEach(c => c.classList.add("mf-v")); obs.unobserve(el); }
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
      <img src={src} alt={alt} loading="lazy" style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, position: "relative" }} />
    </div>
  );
}

/* ── Data ── */
const STORIES = [
  {
    id: "cog",
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&q=80",
    name: "Ana, 28",
    role: "Designer freelancer · TDAH",
    quote: "Eu abria o Trello e já sentia uma onda de ansiedade. Tantas colunas, tantos cards. Meu cérebro simplesmente desligava.",
    studyTitle: "Sobrecarga Cognitiva e TDAH",
    studyBody: "Pessoas com TDAH já gastam mais energia cognitiva em tarefas comuns. Quando uma interface apresenta muitos elementos competindo por atenção, a fadiga decisional se intensifica — e o cérebro para de processar. Carga cognitiva adicional degrada performance e eficiência neural de forma desproporcional no TDAH.",
    cite1: "Le Cunff et al., 2024 · Cognitive Load and Neurodiversity (Frontiers in Education)",
    cite2: "Machida et al., 2023 · Brain Network Efficiency in ADHD (PMC10727773)",
    label: "Carga Cognitiva Reduzida",
    solution: "Interface com hierarquia visual mínima. Uma informação por vez. Espaçamento generoso. Zero barras de progresso, zero contadores, zero métricas competindo pela sua atenção.",
    mockup: mockup1,
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
    mockup: mockup3,
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
    mockup: mockup8,
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
    mockup: mockup1,
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
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, transition: "all 0.3s", background: sc ? "rgba(250,250,249,0.85)" : "transparent", backdropFilter: sc ? "blur(20px) saturate(180%)" : "none", borderBottom: sc ? "1px solid rgba(0,0,0,0.05)" : "1px solid transparent" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: pf, fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>MeuFluxo</span>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[["A Ciência", "stories"], ["Planos", "pricing"], ["FAQ", "faq"]].map(([l, id]) => (
              <button key={id} onClick={() => go(id)} style={{ fontSize: 14, fontWeight: 500, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>{l}</button>
            ))}
            <a href="/auth" style={{ height: 40, padding: "0 22px", borderRadius: 999, fontSize: 14, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg,${C.accent},${C.accentP})`, border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(79,109,245,0.3)", display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Começar grátis</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 60px", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-30%", right: "-15%", width: "65vw", height: "65vw", borderRadius: "50%", background: "radial-gradient(circle,rgba(79,109,245,0.06) 0%,transparent 55%)", pointerEvents: "none" }} />
        <RevealGroup style={{ textAlign: "center", maxWidth: 900 }}>
          <div className="mf-r" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 20px", borderRadius: 999, background: C.accentSoft, border: "1px solid rgba(79,109,245,0.12)", marginBottom: 32 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.accent }}>Projetado para mentes neurodivergentes</span>
          </div>
          <h1 className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(3.2rem,7.5vw,6rem)", fontWeight: 700, lineHeight: 1.02, letterSpacing: "-0.03em", marginBottom: 24 }}>
            Produtividade que<br /><span style={{ background: `linear-gradient(135deg,${C.accent},${C.accentP},#A78BFA)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>respeita</span> como<br />você pensa.
          </h1>
          <p className="mf-r" style={{ fontSize: 18, lineHeight: 1.6, color: C.muted, maxWidth: 520, margin: "0 auto 40px" }}>Cada feature nasceu de um estudo científico.<br />Cada estudo nasceu de uma dor real.</p>
          <div className="mf-r" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/auth" style={{ height: 56, padding: "0 36px", borderRadius: 999, fontSize: 15, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg,${C.accent},${C.accentP})`, border: "none", cursor: "pointer", boxShadow: "0 8px 32px rgba(79,109,245,0.35)", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>Começar grátis <span style={{ color: "rgba(255,255,255,0.6)" }}>→</span></a>
            <button onClick={() => go("stories")} style={{ height: 56, padding: "0 36px", borderRadius: 999, fontSize: 15, fontWeight: 500, color: C.muted, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>Ver a ciência <span style={{ color: C.mutedL }}>↓</span></button>
          </div>
        </RevealGroup>

        {/* Hero Mockup — scroll-driven 3D perspective */}
        <Reveal style={{ width: "100%", maxWidth: 1100, margin: "56px auto 0", position: "relative", perspective: 1200 }}>
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
            }}
          >
            <img src={appMockup} alt="MeuFluxo — visão Meu Dia com sidebar e detalhes de tarefa" loading="eager" style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </Reveal>

        <div className="mf-bounce" style={{ position: "absolute", bottom: 32, color: C.mutedL, fontSize: 24 }}>↓</div>
      </section>

      {/* INTRO */}
      <section style={{ padding: "80px 24px", background: C.white, textAlign: "center" }}>
        <RevealGroup style={{ maxWidth: 700, margin: "0 auto" }}>
          <p className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(1.4rem,3vw,2rem)", lineHeight: 1.4, fontWeight: 500 }}>Ferramentas de produtividade são projetadas para cérebros neurotípicos. Se você tem TDAH ou TEA, elas não foram feitas pra você.</p>
          <p className="mf-r" style={{ fontSize: 16, color: C.muted, marginTop: 20, lineHeight: 1.6 }}>O MeuFluxo foi. E temos a pesquisa pra provar.</p>
        </RevealGroup>
      </section>

      {/* STORIES — real mockups */}
      <div id="stories">
        {STORIES.map((st, i) => (
          <section key={st.id} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
            <div style={{ position: "relative", overflow: "hidden", minHeight: 460 }}>
              <div style={{ position: "absolute", inset: 0, background: `url(${st.photo}) center/cover`, filter: "brightness(0.3)" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.7))" }} />
              <RevealGroup style={{ position: "relative", maxWidth: 680, margin: "0 auto", padding: "100px 32px", color: "#fff" }}>
                <div className="mf-r" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: `url(${st.photo}) center/cover`, border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
                  <div><p style={{ fontSize: 15, fontWeight: 600 }}>{st.name}</p><p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{st.role}</p></div>
                </div>
                <blockquote className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(1.3rem,3vw,1.9rem)", lineHeight: 1.35, fontWeight: 500, fontStyle: "italic", margin: 0 }}>"{st.quote}"</blockquote>
              </RevealGroup>
            </div>
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 32px" }}>
              <RevealGroup style={{ display: "flex", gap: 56, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 400px", minWidth: 300 }}>
                  <div className="mf-r">
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, background: C.accentSoft, border: "1px solid rgba(79,109,245,0.1)", marginBottom: 18 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.accent }}>O estudo</span>
                    </div>
                  </div>
                  <h3 className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: 14 }}>{st.studyTitle}</h3>
                  <p className="mf-r" style={{ fontSize: 15, lineHeight: 1.7, color: C.muted, marginBottom: 14 }}>{st.studyBody}</p>
                  <div className="mf-r" style={{ padding: 14, borderRadius: 10, background: C.accentSoft, border: "1px solid rgba(79,109,245,0.08)" }}>
                    <p style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 4 }}>Referências</p>
                    <p style={{ fontSize: 11, lineHeight: 1.5, color: C.muted }}>{st.cite1}</p>
                    <p style={{ fontSize: 11, lineHeight: 1.5, color: C.muted }}>{st.cite2}</p>
                  </div>
                  <div className="mf-r" style={{ marginTop: 28 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)", marginBottom: 14 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#10B981" }}>{st.label}</span>
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: "#374151" }}>{st.solution}</p>
                  </div>
                </div>
                <div className="mf-r" style={{ flex: "1 1 420px", minWidth: 300, position: "relative" }}>
                  <RevealImg src={st.mockup} alt={`MeuFluxo — ${st.label}`} />
                </div>
              </RevealGroup>
            </div>
          </section>
        ))}
      </div>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "120px 24px", background: C.dark, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "radial-gradient(circle at 1px 1px,rgba(79,109,245,0.4) 1px,transparent 0)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ maxWidth: 780, margin: "0 auto", position: "relative" }}>
          <RevealGroup style={{ textAlign: "center", marginBottom: 56 }}>
            <p className="mf-r" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: C.accent, marginBottom: 14 }}>Planos</p>
            <h2 className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, lineHeight: 1.1, color: "#fff" }}>Simples e transparente.</h2>
          </RevealGroup>
          <RevealGroup style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="mf-r" style={{ padding: 28, borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Free</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>Para começar sem pressão</p>
              <p style={{ marginBottom: 22 }}><span style={{ fontFamily: pf, fontSize: 40, fontWeight: 700, color: "#fff" }}>R$0</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>/mês</span></p>
              {["1 Workspace", "3 Projetos", "20 Tarefas/projeto", "Dark & Light mode"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, fontSize: 13, color: "rgba(255,255,255,0.5)" }}><span style={{ color: C.mono }}>✓</span>{f}</div>
              ))}
              <a href="/auth" style={{ display: "block", width: "100%", height: 42, marginTop: 16, borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center", lineHeight: "42px" }}>Criar conta grátis</a>
            </div>
            <div className="mf-r" style={{ padding: 28, borderRadius: 20, background: "rgba(79,109,245,0.08)", border: "2px solid rgba(79,109,245,0.3)", position: "relative" }}>
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", padding: "4px 14px", borderRadius: 999, background: `linear-gradient(135deg,${C.accent},${C.accentP})`, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#fff" }}>Recomendado</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Pro</h3>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 18 }}>Para profissionais</p>
              <p style={{ marginBottom: 22 }}><span style={{ fontFamily: pf, fontSize: 40, fontWeight: 700, color: "#fff" }}>R$29</span><span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>/mês</span></p>
              {["Tudo ilimitado", "Timeline View", "Recorrentes", "Rollover Auto", "Notas", "Uploads"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, fontSize: 13, color: "#fff", fontWeight: 500 }}><span style={{ color: C.accent }}>✓</span>{f}</div>
              ))}
              <a href="/auth" style={{ display: "block", width: "100%", height: 42, marginTop: 16, borderRadius: 999, border: "none", background: `linear-gradient(135deg,${C.accent},${C.accentP})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(79,109,245,0.3)", textDecoration: "none", textAlign: "center", lineHeight: "42px" }}>Começar com Pro</a>
            </div>
          </RevealGroup>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "100px 24px", background: C.white }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: pf, fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, lineHeight: 1.1 }}>Perguntas frequentes</h2>
          </Reveal>
          {FAQ_DATA.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "120px 24px", background: C.dark, position: "relative", overflow: "hidden", textAlign: "center" }}>
        <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 500, height: 250, background: "radial-gradient(ellipse,rgba(79,109,245,0.2) 0%,transparent 60%)", filter: "blur(80px)", pointerEvents: "none" }} />
        <RevealGroup style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
          <h2 className="mf-r" style={{ fontFamily: pf, fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 700, lineHeight: 1.08, color: "#fff", marginBottom: 16 }}>Seu cérebro merece<br />ferramentas melhores.</h2>
          <p className="mf-r" style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 36 }}>Cada feature nasceu de um estudo. Cada estudo nasceu de uma dor.<br />O MeuFluxo foi construído por quem vive isso.</p>
          <div className="mf-r"><a href="/auth" style={{ height: 56, padding: "0 40px", borderRadius: 999, fontSize: 15, fontWeight: 700, color: C.dark, background: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.2)", display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>Começar grátis agora <span style={{ color: C.mutedL }}>→</span></a></div>
        </RevealGroup>
      </section>

      <footer style={{ padding: "36px 24px", background: C.dark, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: pf, fontSize: 18, fontWeight: 700, color: "#fff" }}>MeuFluxo</span>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>© 2026 MeuFluxo. Feito para mentes que pensam diferente.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
