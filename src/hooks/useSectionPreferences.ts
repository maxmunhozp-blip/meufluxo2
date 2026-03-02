import { useState, useCallback } from 'react';

const STORAGE_KEY = 'meufluxo_sections_expanded';

function getExpandedSections(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Persists section collapsed state per user in localStorage only.
 * Default = collapsed. Only explicitly expanded sections are stored.
 * Zero delay, zero flash — purely synchronous.
 */
export function useSectionPreferences(_userId?: string) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(getExpandedSections);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = { ...prev };
      if (next[sectionId]) {
        delete next[sectionId];
      } else {
        next[sectionId] = true;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const expandSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      if (prev[sectionId]) return prev;
      const next = { ...prev, [sectionId]: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isSectionExpanded = useCallback((sectionId: string) => {
    return expandedSections[sectionId] === true;
  }, [expandedSections]);

  return { expandedSections, toggleSection, expandSection, isSectionExpanded };
}
