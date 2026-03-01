import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: { value: string; up: boolean };
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-accent-500/10 text-accent-400 border-accent-500/20",
    green: "bg-neon-green/10 text-neon-green border-neon-green/20",
    cyan: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20",
    yellow: "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/20",
  };

  return (
    <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl p-5 hover:border-dark-500/60 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-mono ${trend.up ? "text-neon-green" : "text-neon-red"}`}
          >
            {trend.up ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-dark-300 mt-1">{label}</p>
    </div>
  );
}
