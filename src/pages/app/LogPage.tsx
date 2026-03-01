import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { formatDate } from "@/utils/datetime";
import { formatDuration } from "@/utils/format";
import type { StatusFilter, LogEntry } from "@/types/log";
import { logService } from "@/services/log.service";
import { getSocket } from "@/lib/socket";

const statusIcon = {
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-neon-green" />,
  failed: <XCircle className="w-3.5 h-3.5 text-neon-red" />,
  processing: <Clock className="w-3.5 h-3.5 text-neon-yellow" />,
};

const statusBadge = {
  completed: "text-neon-green bg-neon-green/10 border-neon-green/20",
  failed: "text-neon-red bg-neon-red/10 border-neon-red/20",
  processing: "text-neon-yellow bg-neon-yellow/10 border-neon-yellow/20",
};

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Fetch logs
  const fetchLogs = useCallback(
    async (cursor?: string, reset = false) => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        const res = await logService.getLogs({
          limit: 25,
          cursor,
          status: statusFilter,
        });
        if (res.data) {
          setLogs((prev) =>
            reset ? res.data.logs : [...prev, ...res.data.logs],
          );
          setNextCursor(res.data.next_cursor || null);
          setHasMore(!!res.data.next_cursor);
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, isLoading],
  );

  // Initial load and filter change
  useEffect(() => {
    setLogs([]);
    setNextCursor(null);
    setHasMore(true);
    fetchLogs(undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Socket.io for real-time log updates
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_update_log");

    const handleNewLog = (log: LogEntry) => {
      // Add new log to the top if it matches current filter
      if (statusFilter === "all" || log.status === statusFilter) {
        setLogs((prev) => [log, ...prev]);
      }
    };

    socket.on("update_log", handleNewLog);

    return () => {
      socket.emit("leave_update_log");
      socket.off("update_log", handleNewLog);
    };
  }, [statusFilter]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && nextCursor) {
          fetchLogs(nextCursor);
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, isLoading, nextCursor, fetchLogs]);

  // Filter logs by search
  const filtered = logs.filter((log) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        log.queue_key.toLowerCase().includes(q) ||
        log.queue_name.toLowerCase().includes(q) ||
        log.method.toLowerCase().includes(q) ||
        (log.error_message?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const counts = {
    all: logs.length,
    completed: logs.filter((l) => l.status === "completed").length,
    failed: logs.filter((l) => l.status === "failed").length,
    processing: logs.filter((l) => l.status === "processing").length,
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
          {(["all", "completed", "failed", "processing"] as StatusFilter[]).map(
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
              onClick={() => setSelectedLog(log)}
              className="bg-dark-800/60 border border-dark-600/40 rounded-xl p-4 hover:border-dark-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{statusIcon[log.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-accent-400">
                      {log.queue_name}
                    </span>
                    <span className="text-xs text-dark-400 font-mono">
                      ({log.queue_key})
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-mono ${statusBadge[log.status]}`}
                    >
                      {log.status}
                    </span>
                    <span className="text-xs text-dark-400 font-mono">
                      {log.method}
                    </span>
                  </div>
                  {log.error_message && (
                    <p className="text-xs text-neon-red font-mono mt-1 break-all">
                      {log.error_message}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-dark-400 font-mono">
                    {formatDate(log.created_at)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-dark-300 font-mono mt-1 justify-end">
                    {formatDuration(log.duration)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        {/* Infinite scroll trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="py-4 text-center">
            {isLoading && (
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-dark-400" />
            )}
          </div>
        )}
        {!hasMore && logs.length > 0 && (
          <div className="py-4 text-center text-xs text-dark-400 font-mono">
            No more logs
          </div>
        )}
      </div>
      {/* Log Detail Dialog */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Detail</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 mt-2">
              {/* Status & Queue */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="shrink-0">{statusIcon[selectedLog.status]}</div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-mono ${statusBadge[selectedLog.status]}`}
                >
                  {selectedLog.status}
                </span>
                <span className="text-sm font-mono font-semibold text-accent-400">
                  {selectedLog.queue_name}
                </span>
                <span className="text-xs text-dark-400 font-mono">
                  ({selectedLog.queue_key})
                </span>
              </div>

              {/* Detail fields */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400 font-mono">Log ID</span>
                  <span className="text-foreground font-mono text-xs break-all text-right max-w-[60%]">
                    {selectedLog.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400 font-mono">Queue ID</span>
                  <span className="text-foreground font-mono text-xs break-all text-right max-w-[60%]">
                    {selectedLog.queue_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400 font-mono">Message ID</span>
                  <span className="text-foreground font-mono text-xs break-all text-right max-w-[60%]">
                    {selectedLog.message_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400 font-mono">Method</span>
                  <span className="text-foreground font-mono text-xs">
                    {selectedLog.method}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400 font-mono">Duration</span>
                  <span className="text-foreground font-mono text-xs">
                    {formatDuration(selectedLog.duration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400 font-mono">Created At</span>
                  <span className="text-foreground font-mono text-xs">
                    {formatDate(selectedLog.created_at)}
                  </span>
                </div>
              </div>

              {/* Error message */}
              {selectedLog.error_message && (
                <div className="space-y-1">
                  <p className="text-xs text-dark-400 font-mono">
                    Error Message
                  </p>
                  <div className="bg-neon-red/5 border border-neon-red/20 rounded-lg p-3">
                    <p className="text-xs text-neon-red font-mono break-all whitespace-pre-wrap">
                      {selectedLog.error_message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
