import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

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
          navigate('/', { replace: true });
        }
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const pendingCode = localStorage.getItem('pending_invite_code');
        if (pendingCode) {
          navigate(`/invite/${pendingCode}`, { replace: true });
        } else {
          navigate('/', { replace: true });
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

  const inputClass = "w-full h-12 px-4 text-sm rounded-[10px] border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-nd-text-muted";

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(var(--bg-app))' }}>
      <div className="w-full max-w-[400px] space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-[28px] font-bold text-nd-text">MeuFluxo</h1>
          <p className="mt-2 text-sm text-nd-text-secondary">
            {mode === 'login' && 'Entre na sua conta'}
            {mode === 'signup' && 'Crie sua conta gratuitamente'}
            {mode === 'forgot' && 'Recupere sua senha'}
          </p>
        </div>

        {/* Card */}
        <div
          className="p-6 rounded-[14px] border border-nd-border space-y-5"
          style={{ background: 'hsl(var(--bg-surface))' }}
        >
          {/* Google login */}
          {mode !== 'forgot' && (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full h-12 flex items-center justify-center gap-3 rounded-[10px] border border-nd-border text-sm font-medium text-nd-text hover:bg-nd-hover transition-colors disabled:opacity-60"
                style={{ background: 'hsl(var(--bg-elevated))' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Conectando...' : 'Continuar com Google'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-nd-border" />
                <span className="text-[11px] text-nd-text-muted uppercase tracking-wider">ou</span>
                <div className="flex-1 h-px bg-nd-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-medium text-nd-text-secondary mb-1.5 block">Nome completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  style={{ background: 'hsl(var(--bg-elevated))', borderColor: 'hsl(240 14% 20%)' }}
                  placeholder="Seu nome"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-nd-text-secondary mb-1.5 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                style={{ background: 'hsl(var(--bg-elevated))', borderColor: 'hsl(240 14% 20%)' }}
                placeholder="seu@email.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="text-xs font-medium text-nd-text-secondary mb-1.5 block">Senha</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  style={{ background: 'hsl(var(--bg-elevated))', borderColor: 'hsl(240 14% 20%)' }}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="text-xs font-medium text-nd-text-secondary mb-1.5 block">Confirmar senha</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  style={{ background: 'hsl(var(--bg-elevated))', borderColor: 'hsl(240 14% 20%)' }}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            )}

            {message && (
              <div className={`text-sm p-3 rounded-[10px] ${
                message.type === 'error'
                  ? 'text-nd-overdue' : 'text-nd-done'
              }`} style={{ background: message.type === 'error' ? 'hsl(var(--status-overdue) / 0.12)' : 'hsl(var(--status-done) / 0.12)' }}>
                {message.text}
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setMessage(null); }}
                className="text-xs text-primary hover:underline"
              >
                Esqueci minha senha
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-[10px] bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar email de recuperação'}
            </button>
          </form>
        </div>

        {/* Mode switch */}
        <div className="text-center">
          {mode === 'forgot' ? (
            <button
              onClick={() => { setMode('login'); setMessage(null); }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              ← Voltar para o login
            </button>
          ) : (
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); setConfirmPassword(''); }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {mode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
