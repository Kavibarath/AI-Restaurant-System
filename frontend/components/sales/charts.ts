'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js pieces once; only pages that draw charts import this file
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

/* ---------- Chart styling (Sales module = red brand) ---------- */
export const CHART_COLORS = {
  primary: 'rgb(220, 38, 38)', // red-600
  primaryFill: 'rgba(220, 38, 38, 0.12)',
  muted: 'rgb(148, 163, 184)', // slate-400 (actuals / context)
  grid: 'rgba(148, 163, 184, 0.2)',
};

export const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
    y: { beginAtZero: true, grid: { color: CHART_COLORS.grid } },
  },
};

/** Short "16 Oct" label for chart axes */
export const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
