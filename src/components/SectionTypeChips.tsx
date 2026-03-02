import { SectionType } from '@/types/task';

export const SECTION_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  recurrent: { icon: '🔁', label: 'Recorrente', color: '#6C9CFC' },
  project: { icon: '📌', label: 'Projeto', color: '#A78BFA' },
  buffer: { icon: '📥', label: 'Entrada', color: '#34D399' },
  adhoc: { icon: '⚡', label: 'Ad Hoc', color: '#F59E0B' },
};

interface SectionTypeChipsProps {
  value: SectionType;
  onChange: (type: SectionType) => void;
}

export function SectionTypeChips({ value, onChange }: SectionTypeChipsProps) {
  const types = Object.entries(SECTION_TYPE_CONFIG) as [string, typeof SECTION_TYPE_CONFIG[string]][];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {types.map(([key, config]) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(selected ? null : (key as SectionType))}
            className="flex items-center gap-1 transition-all"
            style={{
              padding: '3px 10px',
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid ${selected ? config.color : 'var(--border-subtle)'}`,
              background: selected ? `${config.color}26` : 'var(--bg-elevated)',
              color: selected ? config.color : 'var(--text-secondary)',
              opacity: selected ? 1 : 0.6,
              cursor: 'pointer',
            }}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SectionTypeIcon({ sectionType }: { sectionType: SectionType }) {
  if (!sectionType) return null;
  const config = SECTION_TYPE_CONFIG[sectionType];
  if (!config) return null;
  return (
    <span style={{ fontSize: 14, opacity: 0.5, lineHeight: 1 }} title={config.label}>
      {config.icon}
    </span>
  );
}
