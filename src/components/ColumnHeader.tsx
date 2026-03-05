export function ColumnHeader() {
  return (
    <div
      className="hidden md:flex items-center relative"
      style={{
        height: 40,
        padding: '0 32px',
        marginTop: 16,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.3, color: 'var(--text-tertiary)' }}>
        Nome
      </span>
      <div style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 0,
        height: 1,
        background: 'var(--border-subtle)',
      }} />
    </div>
  );
}
