'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell, { EmptyState } from '@/components/common/PageShell';
import { ConfidenceBar } from '@/components/sales/SalesUI';
import {
  getMenu,
  getRecommendations,
  formatRs,
  MenuItem,
  RecommendationResult,
} from '@/services/salesService';

const METHOD_LABEL: Record<string, string> = {
  'association-rules': 'Association rules (market basket analysis)',
  'popularity-fallback': 'Best-sellers fallback (no basket history for this item yet)',
  'no-data': 'No completed orders to analyse yet',
};

export default function RecommendationsPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMenu()
      .then((items) => {
        setMenu(items);
        if (items.length) setSelectedId(items[0].id);
      })
      .catch((e) => setError(e.response?.data?.error || 'Failed to load menu'))
      .finally(() => setLoadingMenu(false));
  }, []);

  const run = async (id = selectedId) => {
    if (!id) return;
    try {
      setRunning(true);
      setError('');
      setResult(await getRecommendations(id));
    } catch (e: any) {
      setError(
        e.response?.data?.error ||
          'AI service unavailable. Make sure the Python service is running on :8000.'
      );
    } finally {
      setRunning(false);
    }
  };

  const priceOf = (id: string) => menu.find((m) => m.id === id)?.price;

  return (
    <PageShell title="Recommendations" subtitle="AI cross-sell suggestions from real order baskets">
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-800 mb-1">⭐ Frequently Bought Together</h3>
        <p className="text-sm text-gray-500 mb-4">
          Pick a dish to see what customers most often order with it.
        </p>

        {loadingMenu ? (
          <p className="text-gray-400">Loading menu...</p>
        ) : menu.length === 0 ? (
          <p className="text-sm text-gray-500">
            No menu items yet.{' '}
            <Link href="/dashboard/menu" className="text-red-700 underline">
              Add dishes to the menu
            </Link>{' '}
            first.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              className="input-field flex-1"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setResult(null);
              }}
            >
              {menu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category})
                </option>
              ))}
            </select>
            <button onClick={() => run()} disabled={running} className="btn-primary disabled:opacity-50">
              {running ? '⏳ Analysing...' : '⚡ Get Recommendations'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {result && (
        <div className="card">
          <div className="flex flex-wrap justify-between items-start gap-2 mb-5">
            <div>
              <p className="text-sm text-gray-500">Customers who order</p>
              <h3 className="text-xl font-bold text-gray-800">{result.item.name}</h3>
              <p className="text-sm text-gray-500">also tend to order:</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>{METHOD_LABEL[result.method] ?? result.method}</p>
              <p>{result.transactionsAnalyzed} completed orders analysed (last 90 days)</p>
            </div>
          </div>

          {result.recommendations.length === 0 ? (
            <EmptyState
              message="No recommendations yet"
              hint="Complete more orders so the model has baskets to learn from."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.recommendations.map((r, i) => (
                <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                      #{i + 1}
                    </span>
                    {priceOf(r.id) !== undefined && (
                      <span className="text-sm text-gray-500 tabular-nums">{formatRs(priceOf(r.id)!)}</span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-800 mb-3">{r.name}</p>
                  <p className="text-xs text-gray-500 mb-1">Confidence</p>
                  <ConfidenceBar value={r.confidence} />
                  <dl className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div>
                      <dt className="text-gray-500">Lift</dt>
                      <dd className={`font-semibold ${r.lift > 1 ? 'text-green-700' : 'text-gray-700'}`}>
                        {r.lift.toFixed(2)}×
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Together in</dt>
                      <dd className="font-semibold text-gray-700">{r.frequency} orders</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-5">
            Confidence = share of {result.item.name} orders that also contained the item. Lift above
            1× means they are bought together more often than chance.
          </p>
        </div>
      )}
    </PageShell>
  );
}
