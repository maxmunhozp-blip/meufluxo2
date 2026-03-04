import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'meufluxo-theme';

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme(preference: Theme): 'dark' | 'light' {
  return preference === 'system' ? getSystemTheme() : preference;
}

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  root.style.setProperty('transition', 'background-color 150ms ease, color 150ms ease');
  root.setAttribute('data-theme', theme);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#FAFAF9' : '#0A0A0C');
  }

  setTimeout(() => root.style.removeProperty('transition'), 200);
}

async function syncThemeToProfile(preference: Theme) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase.from('profiles') as any).update({ theme_preference: preference }).eq('id', user.id);
}

// Apply theme synchronously on module load (before any React render)
const _initialPref = (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark';
applyTheme(resolveTheme(_initialPref));

export function useTheme() {
  const [preference, setPreference] = useState<Theme>(_initialPref);

  const effective = resolveTheme(preference);

  // Keep DOM in sync when preference changes (after initial)
  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  // Listen for system changes when set to 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      if (preference === 'system') applyTheme(getSystemTheme());
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  // Load preference from profile on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase.from('profiles') as any).select('theme_preference').eq('id', user.id).single();
      if (data?.theme_preference && data.theme_preference !== preference) {
        const pref = data.theme_preference as Theme;
        localStorage.setItem(STORAGE_KEY, pref);
        setPreference(pref);
      }
    })();
  }, []);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
    syncThemeToProfile(next).catch(console.warn);
  }, []);

  const cycleTheme = useCallback(() => {
    const next: Theme =
      preference === 'dark' ? 'light' :
      preference === 'light' ? 'system' : 'dark';
    setTheme(next);
    return next;
  }, [preference, setTheme]);

  return { preference, effective, setTheme, cycleTheme };
}
