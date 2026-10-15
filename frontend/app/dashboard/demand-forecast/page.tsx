'use client';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import PageShell, { StatCard, EmptyState } from '@/components/common/PageShell';
import { CHART_COLORS, baseChartOptions, shortDate } from '@/components/sales/charts';
import { ConfidenceBar } from '@/components/sales/SalesUI';
import { getDemandForecast, formatRs, DemandForecast } from '@/services/salesService';

const HORIZONS = [7, 14];

const weekday = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });

export default function DemandForecastPage() {
  const [horizon, setHorizon] = useState(7);
  const [result, setResult] = useState<DemandForecast | null>(null);
  const [running, setRunning] = useState(false);
  const [aiError, setAiError] = useState('');

  const runForecast = async () => {
    try {
      setRunning(true);
      setAiError('');
      setResult(await getDemandForecast(horizon));
    } catch (e: any) {
      setAiError(
        e.response?.data?.error ||
          'AI service unavailable. Make sure the Python service is running on :8000.'
      );
    } finally {
      setRunning(false);
    }
  };

  const totals = result && {
    orders: result.forecast.reduce((s, d) => s + d.predicted_orders, 0),
    sales: result.forecast.reduce((s, d) => s + d.predicted_sales, 0),
    confidence:
      result.forecast.reduce((s, d) => s + d.confidence, 0) / Math.max(result.forecast.length, 1),
    peak: [...result.forecast].sort((a, b) => b.predicted_orders - a.predicted_orders)[0],
  };

  // History (grey) flows into forecast (red dashed); they share the last actual point
  const chart = result && {
    labels: [...result.history, ...result.forecast].map((d) => shortDate(d.date)),
    datasets: [
      {
        label: 'Actual orders',
        data: [...result.history.map((h) => h.orders), ...result.forecast.map(() => null)],
        borderColor: CHART_COLORS.muted,
        backgroundColor: CHART_COLORS.muted,
        tension: 0.3,
        pointRadius: 2,
        borderWidth: 2,
      },
      {
        label: 'Forecast',
        data: [
          ...result.history.map((h, i) => (i === result.history.length - 1 ? h.orders : null)),
          ...result.forecast.map((f) => f.predicted_orders),
        ],
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primary,
        borderDash: [6, 4],
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2,
      },
    ],
  };

  return (
    <PageShell title="Demand Forecast" subtitle="AI prediction of upcoming orders and sales">
      <div className="card mb-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="font-semibold text-gray-800">🤖 Random Forest Demand Model</h3>
            <p className="text-sm text-gray-500">
              Uses day of week, month, holidays and your last 7 days of real orders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  horizon === h ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {h} days
              </button>
            ))}
            <button onClick={runForecast} disabled={running} className="btn-primary text-sm disabled:opacity-50">
              {running ? '⏳ Forecasting...' : '⚡ Run Forecast'}
            </button>
          </div>
        </div>

        {aiError && (
          <div className="mt-4 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {aiError}
          </div>
        )}
      </div>

      {!result ? (
        <div className="card">
          <EmptyState
            message="No forecast yet"
            hint="Click 'Run Forecast' to predict the coming days."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label={`Predicted Orders (${horizon}d)`} value={totals!.orders} icon="🧾" />
            <StatCard
              label={`Predicted Sales (${horizon}d)`}
              value={formatRs(totals!.sales)}
              accent="text-red-700"
              icon="💰"
            />
            <StatCard
              label="Busiest Day"
              value={`${weekday(totals!.peak.date)} ${shortDate(totals!.peak.date)}`}
              icon="🔥"
            />
            <StatCard
              label="Avg Confidence"
              value={`${Math.round(totals!.confidence * 100)}%`}
              accent="text-green-600"
              icon="🎯"
            />
          </div>

          {result.basis.historyOrders === 0 && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              No completed orders in the last 14 days, so the forecast has no recent history to
              build on. Complete some orders for a more meaningful prediction.
            </div>
          )}

          <div className="card mb-6">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <h3 className="font-semibold text-gray-700">Orders: last 14 days → next {horizon} days</h3>
              <p className="text-xs text-gray-500">
                Based on avg {result.basis.past7AvgOrders} orders / {formatRs(result.basis.past7AvgSales)}{' '}
                per day last week
              </p>
            </div>
            <div className="h-72">
              <Line
                data={chart!}
                options={{
                  ...baseChartOptions,
                  plugins: {
                    legend: { display: true, position: 'bottom' as const },
                  },
                }}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Daily Forecast</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Orders</th>
                    <th className="py-2 px-3 text-right">Sales</th>
                    <th className="py-2 px-3">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {result.forecast.map((d) => (
                    <tr key={d.date} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-gray-800">
                        <span className="font-medium">{weekday(d.date)}</span>{' '}
                        <span className="text-gray-500">{shortDate(d.date)}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{d.predicted_orders}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{formatRs(d.predicted_sales)}</td>
                      <td className="py-2.5 px-3">
                        <ConfidenceBar value={d.confidence} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
