import { useDashboardStore } from "@/stores/dashboardStore";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Inbox,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

const HighchartsReactComponent =
  (HighchartsReact as unknown as { default?: typeof HighchartsReact })
    .default ?? HighchartsReact;

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function randomWalk(prev: number, base: number) {
  const next = prev + (Math.random() - 0.5) * Math.max(1, base * 0.2);
  return clamp(next, 0, Math.max(10, base * 2));
}

export default function DashboardPage() {
  const {
    totalQueues,
    totalMessages,
    totalConsumers,
    messagesPerSecond,
    queues,
  } = useDashboardStore();

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
          const base = Math.max(1, q.deliverRate);
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

  const options = useMemo<Highcharts.Options>(() => {
    const palette = [
      "#6366f1",
      "#22c55e",
      "#06b6d4",
      "#eab308",
      "#f97316",
      "#ec4899",
      "#a855f7",
      "#14b8a6",
    ];

    return {
      time: {
        useUTC: false,
      } as unknown as Highcharts.TimeOptions,
      chart: {
        type: "spline",
        backgroundColor: "transparent",
        height: 360,
        animation: false,
        spacing: [12, 12, 12, 12],
      },
      title: { text: undefined },
      credits: { enabled: false },
      legend: {
        enabled: true,
        itemStyle: { color: "#cbd5e1", fontSize: "12px" },
        itemHoverStyle: { color: "#ffffff" },
      },
      xAxis: {
        type: "datetime",
        gridLineColor: "rgba(148, 163, 184, 0.08)",
        lineColor: "rgba(148, 163, 184, 0.18)",
        tickColor: "rgba(148, 163, 184, 0.18)",
        labels: {
          style: { color: "#94a3b8", fontFamily: "ui-monospace" },
          formatter: function () {
            return Highcharts.dateFormat("%H:%M:%S", Number(this.value));
          },
        },
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: "rgba(148, 163, 184, 0.08)",
        labels: { style: { color: "#94a3b8", fontFamily: "ui-monospace" } },
      },
      tooltip: {
        shared: true,
        backgroundColor: "rgba(2, 6, 23, 0.85)",
        borderColor: "rgba(148, 163, 184, 0.25)",
        style: { color: "#e2e8f0", fontFamily: "ui-monospace" },
        xDateFormat: "%H:%M:%S",
      },
      plotOptions: {
        series: {
          animation: false,
          marker: { enabled: false },
          lineWidth: 2,
        },
      },
      series: queues.map((q, idx) => ({
        type: "spline",
        name: q.name,
        color: palette[idx % palette.length],
        data: (seriesData[q.key] ??
          []) as unknown as Highcharts.SeriesSplineOptions["data"],
      })),
    };
  }, [queues, seriesData]);

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

      {/* Queue chart */}
      <div className="bg-dark-800/60 border border-dark-600/40 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-dark-600/40">
          <h3 className="text-sm font-semibold text-foreground">
            Queue Throughput
          </h3>
          <p className="text-xs text-dark-400 mt-0.5 font-mono">
            Live random chart (updates every second) - 1 line per queue
          </p>
        </div>
        <div className="p-4">
          <HighchartsReactComponent highcharts={Highcharts} options={options} />
        </div>
      </div>
    </div>
  );
}
