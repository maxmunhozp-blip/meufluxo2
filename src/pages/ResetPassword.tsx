import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery type in URL hash
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso! Redirecionando...' });
      setTimeout(() => navigate('/', { replace: true }), 2000);
    }
    setLoading(false);
  };

  const inputClass = "w-full h-12 px-4 text-sm rounded-[10px] border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-nd-text-muted";

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(var(--bg-app))' }}>
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center">
          <h1 className="text-[28px] font-bold text-nd-text">MeuFluxo</h1>
          <p className="mt-2 text-sm text-nd-text-secondary">Defina sua nova senha</p>
        </div>

        <div
          className="p-6 rounded-[14px] border border-nd-border space-y-5"
          style={{ background: 'hsl(var(--bg-surface))' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-nd-text-secondary mb-1.5 block">Nova senha</label>
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
            <div>
              <label className="text-xs font-medium text-nd-text-secondary mb-1.5 block">Confirmar nova senha</label>
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

            {message && (
              <div className={`text-sm p-3 rounded-[10px] ${
                message.type === 'error' ? 'text-nd-overdue' : 'text-nd-done'
              }`} style={{ background: message.type === 'error' ? 'hsl(var(--status-overdue) / 0.12)' : 'hsl(var(--status-done) / 0.12)' }}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-[10px] bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loading ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
