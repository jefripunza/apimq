import { useState } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

import { mockLogs } from "@/mock";
import { formatDate } from "@/utils/datetime";
import { formatDuration } from "@/utils/format";
import type { StatusFilter } from "@/types/log";

const statusIcon = {
  success: <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />,
  error: <XCircle className="w-3.5 h-3.5 text-neon-red" />,
  pending: <Clock className="w-3.5 h-3.5 text-neon-yellow" />,
};

const statusBadge = {
  success: "text-neon-green bg-neon-green/10 border-neon-green/20",
  error: "text-neon-red bg-neon-red/10 border-neon-red/20",
  pending: "text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20",
};

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = mockLogs.filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.queue.toLowerCase().includes(q) ||
        log.message.toLowerCase().includes(q) ||
        (log.detail?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const counts = {
    all: mockLogs.length,
    success: mockLogs.filter((l) => l.status === "success").length,
    error: mockLogs.filter((l) => l.status === "error").length,
    pending: mockLogs.filter((l) => l.status === "pending").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Log</h2>
          <p className="text-sm text-dark-300 mt-1">
            Delivery activity and message processing history
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-dark-300 hover:text-foreground border border-dark-600/50 hover:border-dark-500/60 rounded-xl transition-all">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queue, message, detail..."
            className="w-full pl-10 pr-4 py-2.5 bg-dark-800/60 border border-dark-600/40 rounded-xl text-foreground placeholder-dark-400 focus:outline-none focus:border-accent-500/60 focus:ring-1 focus:ring-accent-500/30 transition-all font-mono text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-dark-400 shrink-0" />
          {(["all", "success", "error", "pending"] as StatusFilter[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  statusFilter === s
                    ? "text-foreground bg-dark-700/60 border-dark-500/60"
                    : "text-dark-400 border-dark-600/30 hover:text-foreground hover:border-dark-500/50"
                }`}
              >
                {s} ({counts[s]})
              </button>
            ),
          )}
        </div>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-sm text-dark-300 font-mono bg-dark-800/40 border border-dark-600/30 rounded-xl p-6 text-center">
            No log entries found.
          </div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className="bg-dark-800/60 border border-dark-600/40 rounded-xl p-4 hover:border-dark-500/50 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{statusIcon[log.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-accent-400">
                      {log.queue}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-mono ${statusBadge[log.status]}`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{log.message}</p>
                  {log.detail && (
                    <p className="text-xs text-dark-300 font-mono mt-1">
                      {log.detail}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-dark-400 font-mono">
                    {formatDate(log.at)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-dark-300 font-mono mt-1 justify-end">
                    <ArrowUpRight className="w-3 h-3" />
                    {formatDuration(log.duration)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
