import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionChecked(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check super_admin role
  useEffect(() => {
    if (!session) { setIsSuperAdmin(false); return; }
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'super_admin')
      .maybeSingle()
      .then(({ data }) => setIsSuperAdmin(!!data));
  }, [session]);

  return { session, sessionChecked, isSuperAdmin };
}
