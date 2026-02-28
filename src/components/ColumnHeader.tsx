export function ColumnHeader() {
  return (
    <div
      className="h-10 px-8 border-b items-center hidden md:flex"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-tertiary)' }}>
        Nome
      </span>
    </div>
  );
}
