import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Persists section collapsed state per user in the database.
 * Stores only collapsed section IDs (compact array) with debounced saves.
 * Falls back to localStorage for instant hydration while DB loads.
 */
export function useSectionPreferences(userId: string | undefined) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('meufluxo_expanded_sections');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // Load from DB on mount
  useEffect(() => {
    if (!userId || loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('collapsed_sections')
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.collapsed_sections) {
        const collapsed = data.collapsed_sections as string[];
        const record: Record<string, boolean> = {};
        collapsed.forEach(id => { record[id] = false; });
        setExpandedSections(record);
        localStorage.setItem('meufluxo_expanded_sections', JSON.stringify(record));
      }
    })();
  }, [userId]);

  // Debounced save to DB
  const persistToDB = useCallback((record: Record<string, boolean>) => {
    if (!userId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      const collapsed = Object.entries(record)
        .filter(([, v]) => v === false)
        .map(([k]) => k);

      await supabase
        .from('user_preferences')
        .upsert(
          { user_id: userId, collapsed_sections: collapsed },
          { onConflict: 'user_id' }
        );
    }, 500);
  }, [userId]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [sectionId]: prev[sectionId] === false ? true : false };
      localStorage.setItem('meufluxo_expanded_sections', JSON.stringify(next));
      persistToDB(next);
      return next;
    });
  }, [persistToDB]);

  const expandSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      if (prev[sectionId] !== false) return prev; // already expanded
      const next = { ...prev, [sectionId]: true };
      localStorage.setItem('meufluxo_expanded_sections', JSON.stringify(next));
      persistToDB(next);
      return next;
    });
  }, [persistToDB]);

  const isSectionExpanded = useCallback((sectionId: string) => {
    return expandedSections[sectionId] !== false;
  }, [expandedSections]);

  return { expandedSections, toggleSection, expandSection, isSectionExpanded };
}
