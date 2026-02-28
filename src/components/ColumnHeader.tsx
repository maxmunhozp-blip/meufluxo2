export function ColumnHeader() {
  return (
    <div
      className="h-9 px-4 md:px-6 border-b border-nd-border items-center hidden md:flex"
      style={{ background: 'hsl(var(--bg-app))' }}
    >
      <span className="text-[12px] font-medium text-nd-text-secondary uppercase tracking-[0.05em]">
        Nome
      </span>
    </div>
  );
}
