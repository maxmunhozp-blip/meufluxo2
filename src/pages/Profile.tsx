import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Camera } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/auth', { replace: true }); return; }
      setSession(session);
      supabase.from('profiles').select('full_name, avatar_url').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name || '');
            setAvatarUrl(data.avatar_url);
          }
        });
    });
  }, [navigate]);

  const handleAvatarUpload = async (file: File) => {
    if (!session) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${session.user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { console.error(error); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id);
    setAvatarUrl(url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', session.user.id);
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  if (!session) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-[480px] rounded-xl p-8" style={{ background: 'var(--bg-surface)' }}>
        <h1 className="text-[20px] font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Perfil</h1>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden group"
            style={{ background: 'var(--border-subtle)' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[28px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                {(fullName || session.user.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--overlay-bg)' }}>
              <Camera className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
            </div>
            {uploading && <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--overlay-bg)' }}><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--text-primary)', borderTopColor: 'transparent' }} /></div>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }} />
        </div>

        {/* Name */}
        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome de exibição</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full h-10 px-3 text-[14px] rounded-lg border mb-4 focus:outline-none focus:ring-1"
          style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}
        />

        {/* Email */}
        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
        <div className="w-full h-10 px-3 flex items-center text-[14px] rounded-lg mb-6" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          {session.user.email}
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-10 rounded-lg text-[14px] font-medium transition-colors mb-3"
          style={{ background: 'var(--accent-blue)', color: 'var(--btn-text)' }}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full h-10 text-[14px] transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          Sair
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full h-10 text-[13px] mt-2 transition-colors"
          style={{ color: 'var(--text-placeholder)' }}
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}
