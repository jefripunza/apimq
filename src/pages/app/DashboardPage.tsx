import {
  useDashboardStore,
  type QueueItem,
} from "@/stores/dashboardStore";
import {
  Activity,
  Inbox,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  RefreshCw,
} from "lucide-react";

function StatCard({
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

function StatusBadge({ status }: { status: QueueItem["status"] }) {
  const config = {
    running: {
      color: "text-neon-green bg-neon-green/10 border-neon-green/20",
      dot: "bg-neon-green",
    },
    idle: {
      color: "text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20",
      dot: "bg-neon-yellow",
    },
    error: {
      color: "text-neon-red bg-neon-red/10 border-neon-red/20",
      dot: "bg-neon-red",
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono ${c.color}`}
    >
      <Circle className={`w-1.5 h-1.5 fill-current`} />
      {status}
    </span>
  );
}

function QueueTable({ queues }: { queues: QueueItem[] }) {
  return (
    <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-600/40 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Active Queues</h3>
          <p className="text-xs text-dark-400 mt-0.5 font-mono">
            {queues.length} queues registered
          </p>
        </div>
        <button className="text-dark-400 hover:text-foreground transition-colors p-2 rounded-lg hover:bg-dark-700/50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-600/30">
              <th className="text-left text-xs font-mono text-dark-400 px-5 py-3 font-medium">
                Queue Name
              </th>
              <th className="text-right text-xs font-mono text-dark-400 px-5 py-3 font-medium">
                Messages
              </th>
              <th className="text-right text-xs font-mono text-dark-400 px-5 py-3 font-medium">
                Consumers
              </th>
              <th className="text-right text-xs font-mono text-dark-400 px-5 py-3 font-medium">
                Publish/s
              </th>
              <th className="text-right text-xs font-mono text-dark-400 px-5 py-3 font-medium">
                Deliver/s
              </th>
              <th className="text-center text-xs font-mono text-dark-400 px-5 py-3 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {queues.map((q) => (
              <tr
                key={q.name}
                className="border-b border-dark-600/20 last:border-0 hover:bg-dark-700/20 transition-colors"
              >
                <td className="px-5 py-3.5">
                  <span className="text-sm font-mono text-accent-400">
                    {q.name}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm font-mono text-foreground">
                    {q.messages.toLocaleString()}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm font-mono text-dark-200">
                    {q.consumers}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm font-mono text-neon-green">
                    {q.publishRate}/s
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm font-mono text-neon-cyan">
                    {q.deliverRate}/s
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <StatusBadge status={q.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-dark-600/20">
        {queues.map((q) => (
          <div key={q.name} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-accent-400 truncate mr-2">
                {q.name}
              </span>
              <StatusBadge status={q.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-900/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-dark-400 font-mono">Messages</p>
                <p className="text-sm font-mono text-foreground">
                  {q.messages.toLocaleString()}
                </p>
              </div>
              <div className="bg-dark-900/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-dark-400 font-mono">
                  Consumers
                </p>
                <p className="text-sm font-mono text-dark-200">
                  {q.consumers}
                </p>
              </div>
              <div className="bg-dark-900/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-dark-400 font-mono">
                  Publish/s
                </p>
                <p className="text-sm font-mono text-neon-green">
                  {q.publishRate}
                </p>
              </div>
              <div className="bg-dark-900/40 rounded-lg px-3 py-2">
                <p className="text-[10px] text-dark-400 font-mono">
                  Deliver/s
                </p>
                <p className="text-sm font-mono text-neon-cyan">
                  {q.deliverRate}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { totalQueues, totalMessages, totalConsumers, messagesPerSecond, queues } =
    useDashboardStore();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-dark-300 mt-1">
          Real-time overview of your message queues and consumers
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Queues"
          value={totalQueues}
          icon={Inbox}
          color="indigo"
          trend={{ value: "+2", up: true }}
        />
        <StatCard
          label="Total Messages"
          value={totalMessages}
          icon={Activity}
          color="green"
          trend={{ value: "+12.5%", up: true }}
        />
        <StatCard
          label="Active Consumers"
          value={totalConsumers}
          icon={Users}
          color="cyan"
          trend={{ value: "-1", up: false }}
        />
        <StatCard
          label="Messages / sec"
          value={messagesPerSecond}
          icon={Zap}
          color="yellow"
          trend={{ value: "+8.3%", up: true }}
        />
      </div>

      {/* Queue table */}
      <QueueTable queues={queues} />
    </div>
  );
}
