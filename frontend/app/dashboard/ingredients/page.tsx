'use client';

import { useEffect, useState } from 'react';
import PageShell, { EmptyState } from '@/components/common/PageShell';
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  Ingredient,
} from '@/services/inventoryService';

const UNITS = ['kg', 'g', 'liter', 'ml', 'pieces', 'dozen', 'pack'];

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', unit: 'kg' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', unit: 'kg' });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getIngredients();
      setIngredients(data.ingredients);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setSubmitting(true);
      await createIngredient({ name: form.name.trim(), unit: form.unit });
      setForm({ name: '', unit: 'kg' });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add ingredient');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditForm({ name: ing.name, unit: ing.unit });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) return;
    try {
      setSavingEdit(true);
      await updateIngredient(id, { name: editForm.name.trim(), unit: editForm.unit });
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update ingredient');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ingredient?')) return;
    try {
      await deleteIngredient(id);
      setIngredients((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Cannot delete (may be linked to inventory)');
    }
  };

  return (
    <PageShell title="Ingredients" subtitle="Manage the master list of ingredients">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Add form */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">➕ Add Ingredient</h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            className="input-field flex-1"
            placeholder="Ingredient name (e.g. Tomato)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="input-field sm:w-40"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button type="submit" disabled={submitting} className="btn-secondary disabled:opacity-50">
            {submitting ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-700">All Ingredients</h3>
          <span className="text-sm text-gray-400">{ingredients.length} total</span>
        </div>

        {loading ? (
          <p className="text-gray-400 py-6 text-center">Loading...</p>
        ) : ingredients.length === 0 ? (
          <EmptyState message="No ingredients yet" hint="Add your first ingredient above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Unit</th>
                  <th className="py-2 px-3">Stock Entries</th>
                  <th className="py-2 px-3">Waste Records</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const isEditing = editingId === ing.id;
                  return (
                    <tr key={ing.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-gray-800">
                        {isEditing ? (
                          <input
                            className="input-field py-1"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        ) : (
                          ing.name
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {isEditing ? (
                          <select
                            className="input-field py-1 w-28"
                            value={editForm.unit}
                            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        ) : (
                          ing.unit
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{ing.inventory?.length ?? 0}</td>
                      <td className="py-2.5 px-3 text-gray-600">{ing._count?.wasteRecords ?? 0}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(ing.id)}
                              disabled={savingEdit}
                              className="text-green-700 hover:text-green-900 text-xs font-medium mr-3 disabled:opacity-50"
                            >
                              {savingEdit ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(ing)}
                              className="text-green-700 hover:text-green-900 text-xs font-medium mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(ing.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
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
