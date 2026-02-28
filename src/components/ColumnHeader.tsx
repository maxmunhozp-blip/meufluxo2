export function ColumnHeader() {
  return (
    <div
      className="hidden md:flex items-center"
      style={{
        height: 40,
        padding: '0 32px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-base)',
        marginTop: 16,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-tertiary)' }}>
        Nome
      </span>
    </div>
  );
}
