import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Theme = 'dark' | 'light' | 'light-contrast';

const STORAGE_KEY = 'meufluxo-theme';

function resolveTheme(preference: Theme): 'dark' | 'light' | 'light-contrast' {
  return preference;
}

function applyTheme(theme: 'dark' | 'light' | 'light-contrast') {
  const root = document.documentElement;

  // Apple-style: temporarily force smooth transitions on ALL elements
  // to prevent harsh color flashes that cause sensory discomfort
  // (W3C COGA O4P01 + WCAG 2.3.3 Animation from Interactions)
  root.classList.add('theme-transitioning');
  root.setAttribute('data-theme', theme);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#0A0A0C' : '#FAFAF9');
  }

  // Remove transition override after animation completes
  // 450ms = transition duration (350ms) + small buffer for paint
  setTimeout(() => root.classList.remove('theme-transitioning'), 450);
}

async function syncThemeToProfile(preference: Theme) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase.from('profiles') as any).update({ theme_preference: preference }).eq('id', user.id);
}

// Apply theme synchronously on module load (before any React render)
const _initialPref = (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark';
// Migrate old 'system' preference to 'dark'
const _migrated: Theme = _initialPref === 'system' as any ? 'dark' : _initialPref;
if (_migrated !== _initialPref) localStorage.setItem(STORAGE_KEY, _migrated);
applyTheme(resolveTheme(_migrated));

export function useTheme() {
  const [preference, setPreference] = useState<Theme>(_migrated);

  const effective = resolveTheme(preference);

  // Keep DOM in sync when preference changes (after initial)
  useEffect(() => {
    applyTheme(effective);
  }, [effective]);

  // Load preference from profile on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase.from('profiles') as any).select('theme_preference').eq('id', user.id).single();
      if (data?.theme_preference && data.theme_preference !== preference) {
        let pref = data.theme_preference as Theme;
        // Migrate old 'system' value
        if (pref === 'system' as any) pref = 'dark';
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
      preference === 'light' ? 'light-contrast' : 'dark';
    setTheme(next);
    return next;
  }, [preference, setTheme]);

  return { preference, effective, setTheme, cycleTheme };
}
