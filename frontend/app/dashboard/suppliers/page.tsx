'use client';

import { useEffect, useState } from 'react';
import PageShell, { EmptyState } from '@/components/common/PageShell';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  Supplier,
} from '@/services/inventoryService';

const EMPTY = { name: '', contact: '', email: '', phone: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getSuppliers();
      setSuppliers(data.suppliers);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load suppliers');
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
      await createSupplier(form);
      setForm(EMPTY);
      setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to add supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setEditForm({ name: s.name, contact: s.contact, email: s.email, phone: s.phone });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSavingEdit(true);
      await updateSupplier(editing.id, editForm);
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update supplier');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      await deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      setError(e.response?.data?.error || 'Cannot delete (may be linked to inventory)');
    }
  };

  return (
    <PageShell title="Suppliers" subtitle="Manage ingredient suppliers and contacts">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm((s) => !s)} className="btn-secondary text-sm">
          {showForm ? '✕ Cancel' : '➕ New Supplier'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Add Supplier</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              className="input-field"
              placeholder="Company name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Contact person"
              required
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
            <input
              className="input-field"
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="input-field"
              placeholder="Phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <div className="sm:col-span-2">
              <button type="submit" disabled={submitting} className="btn-secondary disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-700">All Suppliers</h3>
          <span className="text-sm text-gray-400">{suppliers.length} total</span>
        </div>

        {loading ? (
          <p className="text-gray-400 py-6 text-center">Loading...</p>
        ) : suppliers.length === 0 ? (
          <EmptyState message="No suppliers yet" hint="Add your first supplier to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-3">Company</th>
                  <th className="py-2 px-3">Contact</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">Items Supplied</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 px-3 font-medium text-gray-800">{s.name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{s.contact}</td>
                    <td className="py-2.5 px-3 text-gray-600">{s.email}</td>
                    <td className="py-2.5 px-3 text-gray-600">{s.phone}</td>
                    <td className="py-2.5 px-3 text-gray-600">{s._count?.inventory ?? 0}</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-green-700 hover:text-green-900 text-xs font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-800">Edit Supplier</h3>
              <button
                onClick={() => setEditing(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                className="input-field"
                placeholder="Company name"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Contact person"
                required
                value={editForm.contact}
                onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
              />
              <input
                className="input-field"
                type="email"
                placeholder="Email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
              <input
                className="input-field"
                placeholder="Phone"
                required
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <div className="sm:col-span-2 flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
