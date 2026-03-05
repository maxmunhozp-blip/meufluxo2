export function ColumnHeader() {
  return (
    <div
      className="hidden md:flex items-center justify-center relative"
      style={{
        height: 24,
        marginTop: 16,
      }}
    >
      <div style={{
        width: '50%',
        height: 1,
        background: 'var(--border-subtle)',
      }} />
    </div>
  );
}
