export function ColumnHeader() {
  return (
    <div
      className="h-9 px-4 md:px-6 border-b border-nd-border items-center hidden md:grid"
      style={{
        gridTemplateColumns: '1fr minmax(80px, 130px) minmax(60px, 100px)',
        background: 'hsl(var(--bg-app))',
      }}
    >
      <span className="text-[12px] font-medium text-nd-text-secondary uppercase tracking-[0.05em]">
        Nome
      </span>
      <span className="text-[12px] font-medium text-nd-text-secondary uppercase tracking-[0.05em]">
        Responsável
      </span>
      <span className="text-[12px] font-medium text-nd-text-secondary uppercase tracking-[0.05em]">
        Data
      </span>
    </div>
  );
}
