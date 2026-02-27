import { useNavigate } from "react-router";
import { useDashboardStore, type QueueItem } from "@/stores/dashboardStore";
import {
  Plus,
  Activity,
  Circle,
  ArrowUpRight,
  Settings2,
  FileText,
} from "lucide-react";

function StatusBadge({ status }: { status: QueueItem["status"] }) {
  const config = {
    running: {
      color: "text-neon-green bg-neon-green/10 border-neon-green/20",
    },
    idle: {
      color: "text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20",
    },
    error: {
      color: "text-neon-red bg-neon-red/10 border-neon-red/20",
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono ${c.color}`}
    >
      <Circle className="w-1.5 h-1.5 fill-current" />
      {status}
    </span>
  );
}

function QueueCard({ queue }: { queue: QueueItem }) {
  const navigate = useNavigate();
  const isError = queue.status === "error";

  return (
    <div
      className={`
        bg-dark-800/60 border rounded-2xl p-5 flex flex-col gap-4
        hover:border-dark-500/60 transition-all duration-200 group
        ${isError ? "border-neon-red/30" : "border-dark-600/40"}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-mono font-semibold text-accent-400 truncate">
            {queue.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={queue.status} />
          <button
            onClick={() => navigate(`/app/queue/${queue.key}/setup`)}
            className="p-1.5 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700/50 transition-all opacity-0 group-hover:opacity-100"
            title="Configure queue"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-dark-900/40 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-dark-400" />
            <p className="text-[10px] text-dark-400 font-mono">
              Messages in queue
            </p>
          </div>
          <p className="text-base font-bold text-foreground font-mono">
            {queue.messages.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Rate row */}
      <div className="flex items-center justify-between pt-1 border-t border-dark-600/30">
        <div className="flex items-center gap-1 text-xs font-mono text-neon-green">
          <ArrowUpRight className="w-3 h-3" />
          <span>{queue.publishRate}/s</span>
          <span className="text-dark-500 ml-1">throughput</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-neon-cyan">
          <FileText className="w-3 h-3" />
          <span>{queue.deliverRate}</span>
          <span className="text-dark-500 ml-1">done</span>
        </div>
      </div>
    </div>
  );
}

export default function QueuePage() {
  const { queues } = useDashboardStore();
  const navigate = useNavigate();

  const running = queues.filter((q) => q.status === "running").length;
  const idle = queues.filter((q) => q.status === "idle").length;
  const error = queues.filter((q) => q.status === "error").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Queues</h2>
          <p className="text-sm text-dark-300 mt-1">
            Manage and monitor your message queues
          </p>
        </div>
        <button
          onClick={() => navigate("/app/queues/new/setup")}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Queue</span>
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-dark-800/40 border border-dark-600/30 rounded-xl text-xs font-mono">
        <span className="text-dark-400">{queues.length} total</span>
        <span className="text-dark-600">|</span>
        <span className="text-neon-green">{running} running</span>
        <span className="text-dark-600">|</span>
        <span className="text-neon-yellow">{idle} idle</span>
        <span className="text-dark-600">|</span>
        <span className="text-neon-red">{error} error</span>
      </div>

      {/* Queue cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {queues.map((queue) => (
          <QueueCard key={queue.name} queue={queue} />
        ))}
      </div>
    </div>
  );
}
