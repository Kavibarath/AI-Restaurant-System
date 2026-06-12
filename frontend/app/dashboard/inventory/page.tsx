'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell, { StatCard, EmptyState } from '@/components/common/PageShell';
import {
  getInventory,
  createInventory,
  deleteInventory,
  getStockAlerts,
  getIngredients,
  getSuppliers,
  InventoryItem,
  InventorySummary,
  StockAlerts,
  Ingredient,
  Supplier,
} from '@/services/inventoryService';

const EMPTY_FORM = {
  ingredientId: '',
  supplierId: '',
  quantity: '',
  minStock: '',
  maxStock: '',
  expiryDate: '',
};

function stockStatus(item: InventoryItem) {
  if (item.quantity <= item.minStock)
    return { label: 'Low', cls: 'bg-red-100 text-red-700' };
  if (item.quantity >= item.maxStock)
    return { label: 'Full', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'OK', cls: 'bg-green-100 text-green-700' };
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [alerts, setAlerts] = useState<StockAlerts | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [inv, alert, ings, sups] = await Promise.all([
        getInventory(),
        getStockAlerts(),
        getIngredients(),
        getSuppliers(),
      ]);
      setItems(inv.inventory);
      setSummary(inv.summary);
      setAlerts(alert);
      setIngredients(ings.ingredients);
      setSuppliers(sups.suppliers);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createInventory({
        ingredientId: form.ingredientId,
        supplierId: form.supplierId,
        quantity: parseFloat(form.quantity),
        minStock: parseFloat(form.minStock),
        maxStock: parseFloat(form.maxStock),
        expiryDate: form.expiryDate || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this stock entry?')) return;
    try {
      await deleteInventory(id);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete');
    }
  };

  const noPrereqs = ingredients.length === 0 || suppliers.length === 0;

  return (
    <PageShell title="Inventory Dashboard" subtitle="Live stock levels & alerts">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Stock Items" value={summary?.totalItems ?? 0} icon="📦" />
        <StatCard
          label="Low Stock"
          value={summary?.lowStockItems ?? 0}
          accent="text-red-600"
          icon="⚠️"
        />
        <StatCard
          label="Expiring (7d)"
          value={alerts?.summary.expiringSoon ?? 0}
          accent="text-yellow-600"
          icon="⏳"
        />
        <StatCard
          label="Expired"
          value={alerts?.summary.expired ?? 0}
          accent="text-gray-700"
          icon="🚫"
        />
      </div>

      {/* Alerts banner */}
      {alerts && (alerts.summary.lowStock > 0 || alerts.summary.expiringSoon > 0) && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">🔔 Attention Needed</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            {alerts.alerts.lowStock.map((i) => (
              <span key={i.id} className="bg-red-100 text-red-700 px-2 py-1 rounded">
                {i.ingredient?.name}: low ({i.quantity}/{i.minStock})
              </span>
            ))}
            {alerts.alerts.expiringSoon.map((i) => (
              <span key={i.id} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {i.ingredient?.name}: expires in {daysUntil(i.expiryDate)}d
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add stock */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn-secondary text-sm"
          disabled={noPrereqs}
        >
          {showForm ? '✕ Cancel' : '➕ Add Stock'}
        </button>
      </div>

      {noPrereqs && (
        <div className="mb-4 text-sm text-gray-500">
          You need at least one{' '}
          <Link href="/dashboard/ingredients" className="text-green-700 underline">
            ingredient
          </Link>{' '}
          and one{' '}
          <Link href="/dashboard/suppliers" className="text-green-700 underline">
            supplier
          </Link>{' '}
          before adding stock.
        </div>
      )}

      {showForm && !noPrereqs && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Add Stock Entry</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              className="input-field"
              required
              value={form.ingredientId}
              onChange={(e) => setForm({ ...form, ingredientId: e.target.value })}
            >
              <option value="">Select ingredient</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
            <select
              className="input-field"
              required
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
            <input
              className="input-field"
              type="number"
              step="any"
              placeholder="Min stock"
              required
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: e.target.value })}
            />
            <input
              className="input-field"
              type="number"
              step="any"
              placeholder="Max stock"
              required
              value={form.maxStock}
              onChange={(e) => setForm({ ...form, maxStock: e.target.value })}
            />
            <input
              className="input-field"
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
            <div className="sm:col-span-3">
              <button type="submit" disabled={submitting} className="btn-secondary disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Stock'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">Current Stock</h3>
        {loading ? (
          <p className="text-gray-400 py-6 text-center">Loading...</p>
        ) : items.length === 0 ? (
          <EmptyState message="No stock entries yet" hint="Add stock using the button above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-3">Ingredient</th>
                  <th className="py-2 px-3">Qty</th>
                  <th className="py-2 px-3">Min / Max</th>
                  <th className="py-2 px-3">Supplier</th>
                  <th className="py-2 px-3">Expiry</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = stockStatus(item);
                  const d = daysUntil(item.expiryDate);
                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-gray-800">
                        {item.ingredient?.name}{' '}
                        <span className="text-gray-400">({item.ingredient?.unit})</span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-700">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-gray-500">
                        {item.minStock} / {item.maxStock}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{item.supplier?.name ?? '—'}</td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {item.expiryDate ? (
                          <span className={d !== null && d < 7 ? 'text-red-600 font-medium' : ''}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                            {d !== null && d >= 0 && ` (${d}d)`}
                            {d !== null && d < 0 && ' (expired)'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
