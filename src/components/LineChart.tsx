import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

const HighchartsReactComponent =
  (HighchartsReact as unknown as { default?: typeof HighchartsReact })
    .default ?? HighchartsReact;

type LineChartSeries = {
  name: string;
  color: string;
  data: Array<[number, number]>;
};

export default function LineChart({
  data,
  highcharts,
  className,
}: {
  data: LineChartSeries[];
  highcharts?: typeof Highcharts;
  className?: string;
}) {
  const effectiveHighcharts = highcharts ?? Highcharts;

  const options: Highcharts.Options = {
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
          return effectiveHighcharts.dateFormat("%H:%M:%S", Number(this.value));
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
    series: data.map((s) => ({
      type: "spline",
      name: s.name,
      color: s.color,
      data: s.data as unknown as Highcharts.SeriesSplineOptions["data"],
    })),
  };

  return (
    <div className={className}>
      <HighchartsReactComponent
        highcharts={effectiveHighcharts}
        options={options}
      />
    </div>
  );
}
