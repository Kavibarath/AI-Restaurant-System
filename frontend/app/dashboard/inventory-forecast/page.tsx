'use client';

import { useEffect, useState } from 'react';
import PageShell, { EmptyState } from '@/components/common/PageShell';
import {
  getIngredients,
  predictIngredientInventory,
  Ingredient,
} from '@/services/inventoryService';

interface ForecastResult {
  ingredientName: string;
  currentStock: number;
  requiredQuantity: number;
  reorderNeeded: boolean;
  raw: Record<string, any>;
}

export default function InventoryForecastPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [demand, setDemand] = useState('100');
  const [forecasting, setForecasting] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getIngredients();
        setIngredients(data.ingredients);
        if (data.ingredients.length) setSelectedId(data.ingredients[0].id);
      } catch (e: any) {
        setError(e.response?.data?.error || 'Failed to load ingredients');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    try {
      setForecasting(true);
      setAiError('');
      setResult(null);
      const data = await predictIngredientInventory(selectedId, parseFloat(demand));
      const required = data.prediction.required_quantity;
      setResult({
        ingredientName: data.ingredient.name,
        currentStock: data.ingredient.currentStock,
        requiredQuantity: required,
        reorderNeeded:
          data.prediction.reorder_needed ?? required > data.ingredient.currentStock,
        raw: data.prediction,
      });
    } catch (e: any) {
      setAiError(
        e.response?.data?.details ||
          e.response?.data?.error ||
          'AI service unavailable. Make sure the Python service is running on :8000.'
      );
    } finally {
      setForecasting(false);
    }
  };

  return (
    <PageShell title="Inventory Forecast" subtitle="Predict reorder quantities with AI">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="card mb-6">
        <h3 className="font-semibold text-gray-800 mb-1">📊 Demand-Based Forecast</h3>
        <p className="text-sm text-gray-500 mb-4">
          The Random Forest regressor estimates how much stock you need given expected demand.
        </p>

        {loading ? (
          <p className="text-gray-400 py-4">Loading ingredients...</p>
        ) : ingredients.length === 0 ? (
          <EmptyState message="No ingredients" hint="Add ingredients first to forecast." />
        ) : (
          <form onSubmit={runForecast} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              className="input-field"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
            <input
              className="input-field"
              type="number"
              step="any"
              placeholder="Expected demand"
              value={demand}
              onChange={(e) => setDemand(e.target.value)}
            />
            <button
              type="submit"
              disabled={forecasting}
              className="btn-secondary disabled:opacity-50"
            >
              {forecasting ? '⏳ Forecasting...' : '⚡ Forecast'}
            </button>
          </form>
        )}

        {aiError && (
          <div className="mt-4 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {aiError}
          </div>
        )}
      </div>

      {result && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">
            Forecast for <span className="text-green-700">{result.ingredientName}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Current Stock</p>
              <p className="text-2xl font-bold text-gray-800">{result.currentStock}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Recommended Quantity</p>
              <p className="text-2xl font-bold text-green-700">
                {result.requiredQuantity.toFixed(1)}
              </p>
            </div>
            <div
              className={`rounded-lg p-4 ${
                result.reorderNeeded ? 'bg-red-50' : 'bg-blue-50'
              }`}
            >
              <p className="text-sm text-gray-500">Action</p>
              <p
                className={`text-2xl font-bold ${
                  result.reorderNeeded ? 'text-red-600' : 'text-blue-600'
                }`}
              >
                {result.reorderNeeded ? '🛒 Reorder' : '✅ Sufficient'}
              </p>
            </div>
          </div>

          {result.reorderNeeded && (
            <p className="mt-4 text-sm text-gray-600">
              Suggested order:{' '}
              <span className="font-semibold text-gray-800">
                {Math.max(0, result.requiredQuantity - result.currentStock).toFixed(1)}
              </span>{' '}
              additional units to meet projected demand.
            </p>
          )}
        </div>
      )}
    </PageShell>
  );
}
