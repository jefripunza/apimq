import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Inbox,
  Clock,
  AlertTriangle,
  Timer,
  CheckCircle2,
} from "lucide-react";

import StatCard from "@/components/StatCard";
import LineChart from "@/components/LineChart";

import { useDashboardStore } from "@/stores/dashboardStore";
import { clamp, randomWalk } from "@/utils/random";

export default function DashboardPage() {
  const { stats, queues, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const maxPoints = 60;

  const [seriesData, setSeriesData] = useState<
    Record<string, Array<[number, number]>>
  >({});

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setSeriesData((prev) => {
        const next: Record<string, Array<[number, number]>> = { ...prev };

        for (const q of queues) {
          const key = q.key;
          const base = Math.max(1, q.completedCount);
          const existing = next[key] ?? [];

          if (existing.length === 0) {
            next[key] = Array.from({ length: maxPoints }, (_, i) => {
              const ts = t - (maxPoints - 1 - i) * 1000;
              const y = clamp(
                base + (Math.random() - 0.5) * base * 0.3,
                0,
                base * 2,
              );
              return [ts, y];
            });
            continue;
          }

          const lastY = existing[existing.length - 1][1];
          const y = randomWalk(lastY, base);
          next[key] = [...existing, [t, y] as [number, number]].slice(
            -maxPoints,
          );
        }

        const activeKeys = new Set(queues.map((q) => q.key));
        for (const k of Object.keys(next)) {
          if (!activeKeys.has(k)) delete next[k];
        }

        return next;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [queues]);

  const chartData = useMemo(
    () =>
      queues.map((q) => ({
        name: q.name,
        color: q.color,
        data: seriesData[q.key] ?? [],
      })),
    [queues, seriesData],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-dark-300 mt-1">
          Real-time overview of your message queues
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Total Queues"
          value={stats.total_queues}
          icon={Inbox}
          color="indigo"
        />
        <StatCard
          label="Total Messages"
          value={stats.total_messages}
          icon={Activity}
          color="green"
        />
        <StatCard
          label="Completed"
          value={stats.total_completed}
          icon={CheckCircle2}
          color="cyan"
        />
        <StatCard
          label="Pending"
          value={stats.total_pending}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          label="Timing"
          value={stats.total_timing}
          icon={Timer}
          color="indigo"
        />
        <StatCard
          label="Failed"
          value={stats.total_failed}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Queue chart */}
      <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-600/40">
          <h3 className="text-sm font-semibold text-foreground">
            Queue Throughput
          </h3>
          <p className="text-xs text-dark-400 mt-0.5 font-mono">
            Live chart (updates every second) - 1 line per queue
          </p>
        </div>
        <div className="p-4">
          <LineChart data={chartData} />
        </div>
      </div>
    </div>
  );
}
