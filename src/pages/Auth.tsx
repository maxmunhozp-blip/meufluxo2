import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { motion, AnimatePresence } from 'framer-motion';
import screenshotMeuDia from '@/assets/screenshot-meudia.png';

/*
  Auth page — neurodivergent-friendly, Apple-quality design
  
  Research basis:
  - W3C WCAG o6p01: Login that doesn't rely on memory → prominent Google SSO
  - W3C WCAG o6p02: Simple, single-step login → minimal fields, clear hierarchy
  - W3C WCAG o6p03: Less words → concise labels, no walls of text
  - WCAG 3.3.8: Accessible authentication → SSO first, no cognitive tests
  
  Design principles:
  - Split layout: product context left, clean form right
  - SSO prominently placed (reduces memory load)
  - Warm, non-clinical aesthetic (reduces anxiety)
  - Large touch targets (48px+), generous spacing
  - Single visible action at a time
*/

const pf = '"Playfair Display",Georgia,serif';
const bd = '"DM Sans",system-ui,sans-serif';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const pendingCode = localStorage.getItem('pending_invite_code');
        if (pendingCode) {
          navigate(`/invite/${pendingCode}`, { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const pendingCode = localStorage.getItem('pending_invite_code');
        if (pendingCode) {
          navigate(`/invite/${pendingCode}`, { replace: true });
        } else {
          navigate('/app', { replace: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setMessage({ type: 'error', text: error.message });
      else setMessage({ type: 'success', text: 'Email de recuperação enviado. Verifique sua caixa de entrada.' });
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ type: 'error', text: error.message });
    } else {
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'As senhas não coincidem.' });
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) setMessage({ type: 'error', text: error.message });
      else setMessage({ type: 'success', text: 'Verifique seu email para confirmar o cadastro.' });
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setMessage(null);
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Erro ao fazer login com Google.' });
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: bd }}>
      
      {/* LEFT — Product context panel */}
      <div style={{
        flex: "1 1 50%",
        background: "#0A0A0C",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 48px",
        position: "relative",
        overflow: "hidden",
      }}
        className="hidden lg:flex"
      >
        {/* Subtle gradient glow */}
        <div style={{
          position: "absolute",
          top: "20%",
          left: "30%",
          width: "60%",
          height: "60%",
          background: "radial-gradient(ellipse, rgba(79,109,245,0.12) 0%, transparent 60%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }} />
        
        {/* Brand */}
        <div style={{ position: "relative", maxWidth: 480, width: "100%", textAlign: "left", marginBottom: 48 }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: pf, fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>MeuFluxo</span>
          </a>
          <h2 style={{ fontFamily: pf, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 600, lineHeight: 1.15, color: "#fff", marginTop: 20, letterSpacing: "-0.02em" }}>
            Produtividade que<br />
            <span style={{ background: "linear-gradient(135deg, #4F6DF5, #7C3AED, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>respeita</span> seu cérebro.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 14, lineHeight: 1.6 }}>
            Projetado para mentes com TDAH e TEA.
          </p>
        </div>

        {/* App screenshot in browser frame */}
        <div style={{ position: "relative", maxWidth: 520, width: "100%", borderRadius: 10, overflow: "hidden", boxShadow: "0 20px 60px -10px rgba(0,0,0,0.5)" }}>
          {/* Mini browser chrome */}
          <div style={{ background: "#1E1E22", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FEBC2E" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28C840" }} />
            </div>
            <div style={{ flex: 1, marginLeft: 10, padding: "4px 12px", borderRadius: 5, background: "rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "SF Mono, Monaco, monospace" }}>app.meufluxo.com</span>
            </div>
          </div>
          <img src={screenshotMeuDia} alt="MeuFluxo app" loading="eager" style={{ width: "100%", height: "auto", display: "block" }} />
        </div>

        {/* Social proof */}
        <div style={{ position: "relative", maxWidth: 480, width: "100%", marginTop: 36, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex" }}>
            {["🧠", "💡", "✨"].map((e, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(79,109,245,0.15)", border: "2px solid #0A0A0C", marginLeft: i > 0 ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{e}</div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
            Baseado em pesquisas de<br />Le Cunff, Sonuga-Barke e Schwartz
          </p>
        </div>
      </div>

      {/* RIGHT — Auth form */}
      <div style={{
        flex: "1 1 50%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 24px",
        background: "#FAFAF9",
        position: "relative",
      }}>
        {/* Back to landing */}
        <a href="/" style={{
          position: "absolute",
          top: 24,
          left: 28,
          fontSize: 13,
          color: "#71717A",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span style={{ fontSize: 16 }}>←</span> Voltar
        </a>

        {/* Mobile logo (hidden on desktop where left panel shows it) */}
        <div className="lg:hidden" style={{ marginBottom: 32, textAlign: "center" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: pf, fontSize: 28, fontWeight: 700, color: "#18181B", letterSpacing: "-0.03em" }}>MeuFluxo</span>
          </a>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "100%", maxWidth: 380 }}
          >
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: pf, fontSize: 28, fontWeight: 700, color: "#18181B", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {mode === 'login' && 'Bem-vindo de volta.'}
              {mode === 'signup' && 'Crie sua conta.'}
              {mode === 'forgot' && 'Recuperar senha.'}
            </h1>
            <p style={{ fontSize: 14, color: "#71717A", marginTop: 8, lineHeight: 1.5 }}>
              {mode === 'login' && 'Continue de onde parou — sem pressa.'}
              {mode === 'signup' && 'Leva menos de 30 segundos. Sem cartão de crédito.'}
              {mode === 'forgot' && 'Enviaremos um link para redefinir sua senha.'}
            </p>
          </div>

          {/* Google SSO — primary action (WCAG: reduce memory load) */}
          {mode !== 'forgot' && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                style={{
                  width: "100%",
                  height: 52,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#18181B",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  fontFamily: bd,
                  opacity: googleLoading ? 0.6 : 1,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Conectando...' : 'Continuar com Google'}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "24px 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
                <span style={{ fontSize: 11, color: "#A1A1AA", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>ou com email</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#71717A", marginBottom: 6, display: "block", letterSpacing: "0.02em" }}>Nome</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Como quer ser chamado"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#71717A", marginBottom: 6, display: "block", letterSpacing: "0.02em" }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={inputStyle}
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#71717A", letterSpacing: "0.02em" }}>Senha</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setMessage(null); }}
                      style={{ fontSize: 12, color: "#4F6DF5", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: bd }}
                    >
                      Esqueci
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  style={inputStyle}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#71717A", marginBottom: 6, display: "block", letterSpacing: "0.02em" }}>Confirmar senha</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  style={inputStyle}
                />
              </div>
            )}

            {/* Messages */}
            {message && (
              <div style={{
                fontSize: 13,
                padding: "12px 16px",
                borderRadius: 10,
                lineHeight: 1.5,
                background: message.type === 'error' ? "rgba(217,119,6,0.08)" : "rgba(16,185,129,0.08)",
                color: message.type === 'error' ? "#D97706" : "#10B981",
                border: `1px solid ${message.type === 'error' ? "rgba(217,119,6,0.15)" : "rgba(16,185,129,0.15)"}`,
              }}>
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 52,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #4F6DF5, #7C3AED)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: "0 4px 16px rgba(79,109,245,0.3)",
                opacity: loading ? 0.6 : 1,
                fontFamily: bd,
                marginTop: 4,
              }}
            >
              {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta grátis' : 'Enviar link de recuperação'}
            </button>
          </form>

          {/* Mode switch */}
          <div style={{ textAlign: "center", marginTop: 28 }}>
            {mode === 'forgot' ? (
              <button
                onClick={() => { setMode('login'); setMessage(null); }}
                style={{ fontSize: 13, color: "#4F6DF5", background: "none", border: "none", cursor: "pointer", fontWeight: 500, fontFamily: bd }}
              >
                ← Voltar para o login
              </button>
            ) : (
              <p style={{ fontSize: 13, color: "#71717A" }}>
                {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
                <button
                  onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); setConfirmPassword(''); }}
                  style={{ color: "#4F6DF5", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: bd, fontSize: 13 }}
                >
                  {mode === 'login' ? 'Criar conta grátis' : 'Entrar'}
                </button>
              </p>
            )}
          </div>

          {/* Trust line */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#A1A1AA", marginTop: 32, lineHeight: 1.5 }}>
            Seus dados são protegidos com criptografia.<br />Sem spam. Cancele quando quiser.
          </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 16px",
  fontSize: 14,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  background: "#fff",
  color: "#18181B",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  fontFamily: '"DM Sans",system-ui,sans-serif',
  boxSizing: "border-box" as const,
};

export default Auth;