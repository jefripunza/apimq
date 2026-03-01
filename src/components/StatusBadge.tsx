import { Circle } from "lucide-react";
import type { QueueStatus } from "@/types/queue";

export default function StatusBadge({ status }: { status: QueueStatus }) {
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
