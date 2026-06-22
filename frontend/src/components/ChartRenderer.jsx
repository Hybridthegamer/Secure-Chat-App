/**
 * ChartRenderer.jsx
 * Renders a Chart.js chart for the given chart record.
 * Supports: bar, line, pie, scatter.
 */
import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Pie, Scatter } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler
);

const PALETTE = [
  "#2563eb","#7c3aed","#10b981","#f59e0b",
  "#ef4444","#06b6d4","#ec4899","#84cc16"
];

function applyPalette(datasets) {
  return datasets.map((ds, i) => ({
    ...ds,
    backgroundColor: ds.backgroundColor || PALETTE[i % PALETTE.length],
    borderColor:     ds.borderColor     || PALETTE[i % PALETTE.length],
  }));
}

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      labels: { color: "#94a3b8", font: { size: 13 } }
    },
    tooltip: {
      backgroundColor: "#1e293b",
      titleColor:      "#f1f5f9",
      bodyColor:       "#94a3b8",
      borderColor:     "#334155",
      borderWidth:     1,
    }
  },
  scales: {
    x: {
      ticks: { color: "#64748b" },
      grid:  { color: "rgba(51,65,85,0.5)" }
    },
    y: {
      ticks: { color: "#64748b" },
      grid:  { color: "rgba(51,65,85,0.5)" }
    }
  }
};

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: "bottom",
      labels: { color: "#94a3b8", font: { size: 13 }, padding: 16 }
    },
    tooltip: BASE_OPTIONS.plugins.tooltip,
  }
};

export default function ChartRenderer({ chart, height = 320 }) {
  const data = useMemo(() => {
    try {
      const labels   = JSON.parse(chart.labelsJSON   || "[]");
      const datasets = applyPalette(JSON.parse(chart.datasetsJSON || "[]"));
      return { labels, datasets };
    } catch {
      return { labels: [], datasets: [] };
    }
  }, [chart.labelsJSON, chart.datasetsJSON]);

  const style = { height };

  switch (chart.chartType?.toLowerCase()) {
    case "bar":
      return <Bar     data={data} options={BASE_OPTIONS} style={style} />;
    case "line":
      return <Line    data={data} options={BASE_OPTIONS} style={style} />;
    case "pie":
      return <Pie     data={data} options={PIE_OPTIONS}  style={style} />;
    case "scatter":
      return <Scatter data={data} options={BASE_OPTIONS} style={style} />;
    default:
      return (
        <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
          Unknown chart type: {chart.chartType}
        </div>
      );
  }
}
