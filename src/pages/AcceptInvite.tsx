import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AcceptInvite = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'checking' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    if (!code) { setStatus('error'); setMessage('Código de convite inválido.'); return; }

    // Store invite code for after auth
    localStorage.setItem('pending_invite_code', code);

    const checkAndAccept = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not logged in - redirect to auth
        navigate('/auth', { replace: true });
        return;
      }

      setStatus('checking');

      const { data, error } = await supabase.functions.invoke('accept-invite', {
        body: { invite_code: code },
      });

      if (error || data?.error) {
        setStatus('error');
        setMessage(data?.error || 'Erro ao aceitar convite.');
        localStorage.removeItem('pending_invite_code');
        return;
      }

      localStorage.removeItem('pending_invite_code');
      setWorkspaceName(data.workspace_name);
      setStatus('success');

      // Redirect to main app after 2s
      setTimeout(() => navigate('/', { replace: true }), 2000);
    };

    checkAndAccept();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(var(--bg-app))' }}>
      <div className="w-full max-w-[400px] text-center space-y-4">
        <h1 className="text-[28px] font-bold text-foreground">MeuFluxo</h1>

        {(status === 'loading' || status === 'checking') && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {status === 'loading' ? 'Verificando convite...' : 'Aceitando convite...'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="text-sm text-foreground">
              Você entrou no workspace <strong>{workspaceName}</strong>!
            </p>
            <p className="text-xs text-muted-foreground">Redirecionando...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-foreground">{message}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Ir para o início
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
