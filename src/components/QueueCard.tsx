import { useNavigate } from "react-router";
import { Switch } from "./ui/switch";
import { Settings, Activity, ArrowUpRight, FileText } from "lucide-react";
import { useQueueStore } from "@/stores/queueStore";
import type { Queue } from "@/types/queue";

export default function QueueCard({
  queue,
  onOpenErrors,
}: {
  queue: Queue;
  onOpenErrors: (queue: Queue) => void;
}) {
  const navigate = useNavigate();
  const toggleQueueEnabled = useQueueStore((s) => s.toggleEnabled);
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
          <button
            type="button"
            onClick={() => navigate(`/app/queue/${queue.key}/setup`)}
            className="text-left w-full"
            title="Open setup"
          >
            <h3 className="text-sm font-mono font-semibold text-accent-400 truncate hover:underline">
              {queue.name}
            </h3>
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 pl-1">
            {/* disini */}
            <Switch
              checked={queue.enabled}
              onCheckedChange={(checked) =>
                toggleQueueEnabled(queue.key, checked)
              }
              aria-label={queue.enabled ? "Queue enabled" : "Queue disabled"}
            />
            <button
              onClick={() => navigate(`/app/queue/${queue.key}/setup`)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700/50 transition-all opacity-100"
              title="Configure queue"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-dark-900/40 rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-dark-400" />
            <p className="text-[14px] text-dark-400 font-mono">
              Messages in queue
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground font-mono">
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
        <button
          type="button"
          onClick={() => onOpenErrors(queue)}
          className="flex items-center gap-1 text-xs font-mono text-neon-red cursor-pointer"
        >
          <FileText className="w-3 h-3" />
          <span>{queue.deliverRate}</span>
          <span className="text-dark-500 ml-1 underline">error</span>
        </button>
      </div>
    </div>
  );
}
