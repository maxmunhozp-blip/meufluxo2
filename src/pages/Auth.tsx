import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate('/', { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ type: 'error', text: error.message });
    } else {
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(var(--bg-app))' }}>
      <div className="w-full max-w-sm space-y-8 animate-in fade-in duration-500">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-nd-text">MeuFluxo</h2>
          <p className="mt-2 text-sm text-nd-text-secondary">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta gratuitamente'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-nd-text">Nome completo</label>
                <input
                  type="text"
                  required={!isLogin}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-nd-border bg-nd-input px-3 py-2 text-nd-text placeholder-nd-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-nd-text">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-nd-border bg-nd-input px-3 py-2 text-nd-text placeholder-nd-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-nd-text">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-nd-border bg-nd-input px-3 py-2 text-nd-text placeholder-nd-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {message && (
            <div className={`text-sm p-3 rounded-md ${
              message.type === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-green-500/15 text-green-500'
            }`}>
              {message.text}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar conta'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setMessage(null); }}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
