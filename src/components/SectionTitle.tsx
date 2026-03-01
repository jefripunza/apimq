export default function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1 bg-dark-600/40" />
      <span className="text-xs font-mono text-dark-400 uppercase tracking-wider px-2">
        {children}
      </span>
      <div className="h-px flex-1 bg-dark-600/40" />
    </div>
  );
}
