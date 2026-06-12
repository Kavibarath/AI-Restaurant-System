'use client';

import { useEffect, useState } from 'react';
import PageShell, { StatCard, RiskBadge, EmptyState } from '@/components/common/PageShell';
import {
  predictAllWaste,
  getWasteRecords,
  createWasteRecord,
  getIngredients,
  WastePrediction,
  WasteRecord,
  Ingredient,
} from '@/services/inventoryService';

const REASONS = ['Expired', 'Spoiled', 'Overproduction', 'Damaged', 'Other'];

export default function WastePage() {
  const [predictions, setPredictions] = useState<WastePrediction[]>([]);
  const [predSummary, setPredSummary] = useState<{
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
  } | null>(null);
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');
  const [form, setForm] = useState({ ingredientId: '', quantity: '', reason: 'Expired' });
  const [submitting, setSubmitting] = useState(false);

  const loadBase = async () => {
    try {
      setLoading(true);
      const [waste, ings] = await Promise.all([getWasteRecords(), getIngredients()]);
      setRecords(waste.records);
      setIngredients(ings.ingredients);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load waste data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  const runPredictions = async () => {
    try {
      setPredicting(true);
      setAiError('');
      const data = await predictAllWaste();
      setPredictions(data.predictions);
      setPredSummary(data.summary);
    } catch (e: any) {
      setAiError(
        e.response?.data?.details ||
          e.response?.data?.error ||
          'AI service unavailable. Make sure the Python service is running on :8000.'
      );
    } finally {
      setPredicting(false);
    }
  };

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createWasteRecord({
        ingredientId: form.ingredientId,
        quantity: parseFloat(form.quantity),
        reason: form.reason,
      });
      setForm({ ingredientId: '', quantity: '', reason: 'Expired' });
      await loadBase();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to log waste');
    } finally {
      setSubmitting(false);
    }
  };

  // sort predictions high -> low risk
  const order = { high: 0, medium: 1, low: 2 };
  const sortedPreds = [...predictions].sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);

  return (
    <PageShell title="Waste Intelligence" subtitle="AI-powered waste risk predictions">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ===== AI Prediction Panel ===== */}
      <div className="card mb-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              🤖 Waste Risk Prediction
            </h3>
            <p className="text-sm text-gray-500">
              Random Forest model scores every stock item by spoilage risk.
            </p>
          </div>
          <button
            onClick={runPredictions}
            disabled={predicting}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {predicting ? '⏳ Analyzing...' : '⚡ Run AI Prediction'}
          </button>
        </div>

        {aiError && (
          <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {aiError}
          </div>
        )}

        {predSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <StatCard label="Items Scored" value={predSummary.total} icon="🧮" />
            <StatCard label="High Risk" value={predSummary.highRisk} accent="text-red-600" icon="🔴" />
            <StatCard
              label="Medium Risk"
              value={predSummary.mediumRisk}
              accent="text-yellow-600"
              icon="🟡"
            />
            <StatCard label="Low Risk" value={predSummary.lowRisk} accent="text-green-600" icon="🟢" />
          </div>
        )}

        {sortedPreds.length === 0 ? (
          <EmptyState
            message="No predictions yet"
            hint="Click 'Run AI Prediction' to analyze your current stock."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-3">Ingredient</th>
                  <th className="py-2 px-3">Stock</th>
                  <th className="py-2 px-3">Expiry (days)</th>
                  <th className="py-2 px-3">Risk</th>
                  <th className="py-2 px-3">Confidence</th>
                  <th className="py-2 px-3">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {sortedPreds.map((p) => (
                  <tr key={p.inventoryId} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-800">{p.ingredient}</td>
                    <td className="py-2.5 px-3 text-gray-600">{p.quantity}</td>
                    <td className="py-2.5 px-3 text-gray-600">{p.expiryDays}</td>
                    <td className="py-2.5 px-3">
                      <RiskBadge level={p.riskLevel} />
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {(p.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{p.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Log Waste ===== */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">📝 Log Waste Record</h3>
        <form onSubmit={handleLog} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <select
            className="input-field"
            required
            value={form.ingredientId}
            onChange={(e) => setForm({ ...form, ingredientId: e.target.value })}
          >
            <option value="">Select ingredient</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            type="number"
            step="any"
            placeholder="Quantity"
            required
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <select
            className="input-field"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="submit" disabled={submitting} className="btn-secondary disabled:opacity-50">
            {submitting ? 'Saving...' : 'Log Waste'}
          </button>
        </form>
      </div>

      {/* ===== Recent Records ===== */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">Recent Waste Records</h3>
        {loading ? (
          <p className="text-gray-400 py-6 text-center">Loading...</p>
        ) : records.length === 0 ? (
          <EmptyState message="No waste logged yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-3">Ingredient</th>
                  <th className="py-2 px-3">Quantity</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-800">{r.ingredient?.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{r.quantity}</td>
                    <td className="py-2.5 px-3 text-gray-600">{r.reason}</td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
