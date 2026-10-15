'use client';

import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import PageShell, { StatCard, EmptyState } from '@/components/common/PageShell';
import { CHART_COLORS, baseChartOptions, shortDate } from '@/components/sales/charts';
import { getSalesAnalytics, formatRs, SalesAnalytics } from '@/services/salesService';

const PERIODS = [7, 30, 90];

export default function SalesPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setData(await getSalesAnalytics(days));
        setError('');
      } catch (e: any) {
        setError(e.response?.data?.error || 'Failed to load sales analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  const revenueChart = data && {
    labels: data.revenueByDay.map((d) => shortDate(d.date)),
    datasets: [
      {
        label: 'Revenue',
        data: data.revenueByDay.map((d) => d.revenue),
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primaryFill,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const categoryChart = data && {
    labels: data.revenueByCategory.map((c) => c.category),
    datasets: [
      {
        label: 'Revenue',
        data: data.revenueByCategory.map((c) => c.revenue),
        backgroundColor: CHART_COLORS.primary,
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  };

  const rsTicks = { callback: (v: any) => `Rs. ${Number(v).toLocaleString('en-LK')}` };
  const rsTooltip = {
    callbacks: { label: (ctx: any) => ` ${formatRs(ctx.parsed.y ?? ctx.parsed.x)}` },
  };

  return (
    <PageShell title="Sales Dashboard" subtitle="Revenue and best-sellers from completed orders">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setDays(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              days === p ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Last {p} days
          </button>
        ))}
      </div>

      {loading && !data ? (
        <p className="text-gray-400 py-12 text-center">Loading...</p>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Revenue"
              value={formatRs(data.summary.totalRevenue)}
              accent="text-red-700"
              icon="💰"
            />
            <StatCard label="Completed Orders" value={data.summary.totalOrders} icon="🧾" />
            <StatCard label="Avg Order Value" value={formatRs(data.summary.avgOrderValue)} icon="🧮" />
            <StatCard
              label="Pending Orders"
              value={data.summary.byStatus.pending ?? 0}
              accent="text-yellow-600"
              icon="⏳"
            />
          </div>

          {data.summary.totalOrders === 0 ? (
            <div className="card">
              <EmptyState
                message="No completed orders in this period"
                hint="Complete some orders on the Orders page to see analytics."
              />
            </div>
          ) : (
            <>
              <div className="card mb-6">
                <h3 className="font-semibold text-gray-700 mb-4">Daily Revenue</h3>
                <div className="h-72">
                  <Line
                    data={revenueChart!}
                    options={{
                      ...baseChartOptions,
                      plugins: { ...baseChartOptions.plugins, tooltip: rsTooltip },
                      scales: {
                        ...baseChartOptions.scales,
                        y: { ...baseChartOptions.scales.y, ticks: rsTicks },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">Revenue by Category</h3>
                  <div className="h-64">
                    <Bar
                      data={categoryChart!}
                      options={{
                        ...baseChartOptions,
                        indexAxis: 'y' as const,
                        plugins: { ...baseChartOptions.plugins, tooltip: rsTooltip },
                        scales: {
                          x: { beginAtZero: true, grid: { color: CHART_COLORS.grid }, ticks: rsTicks },
                          y: { grid: { display: false } },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">Top 5 Items</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Item</th>
                        <th className="py-2 px-2 text-right">Sold</th>
                        <th className="py-2 px-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topItems.map((item, i) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2.5 px-2 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 px-2">
                            <p className="font-medium text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.category}</p>
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums">{item.quantity}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums">
                            {formatRs(item.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
