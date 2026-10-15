'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageShell, { StatCard, EmptyState } from '@/components/common/PageShell';
import { OrderStatusBadge } from '@/components/sales/SalesUI';
import {
  getMenu,
  getOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  formatRs,
  MenuItem,
  Order,
  OrderStatus,
} from '@/services/salesService';

const TABS: { label: string; value?: OrderStatus }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function OrdersPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, completed: 0, cancelled: 0 });
  const [tab, setTab] = useState<OrderStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({ name: '', email: '' });
  const [placing, setPlacing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrders = async (status = tab) => {
    try {
      setLoading(true);
      const res = await getOrders(status);
      setOrders(res.data);
      // Status counts always reflect all orders, independent of the active tab
      setSummary(status ? (await getOrders()).summary : res.summary);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMenu()
      .then(setMenu)
      .catch(() => setError('Failed to load menu'));
    loadOrders(undefined);
  }, []);

  const switchTab = (value?: OrderStatus) => {
    setTab(value);
    loadOrders(value);
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => {
      const qty = (prev[id] || 0) + delta;
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  const cartLines = Object.entries(cart).map(([id, qty]) => ({
    item: menu.find((m) => m.id === id)!,
    qty,
  }));
  const cartTotal = cartLines.reduce((s, l) => s + (l.item?.price || 0) * l.qty, 0);

  const placeOrder = async () => {
    if (cartLines.length === 0) return;
    try {
      setPlacing(true);
      await createOrder({
        items: cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
        customerName: customer.name.trim() || undefined,
        customerEmail: customer.email.trim() || undefined,
      });
      setCart({});
      setCustomer({ name: '', email: '' });
      setShowBuilder(false);
      await loadOrders();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const setStatus = async (id: string, status: OrderStatus) => {
    try {
      setBusyId(id);
      await updateOrderStatus(id, status);
      await loadOrders();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update order');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this order permanently?')) return;
    try {
      setBusyId(id);
      await deleteOrder(id);
      await loadOrders();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete order');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageShell title="Orders" subtitle="Take new orders and track their status">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Orders" value={summary.total} icon="🧾" />
        <StatCard label="Pending" value={summary.pending} accent="text-yellow-600" icon="⏳" />
        <StatCard label="Completed" value={summary.completed} accent="text-green-600" icon="✅" />
        <StatCard label="Cancelled" value={summary.cancelled} accent="text-gray-600" icon="✕" />
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowBuilder((s) => !s)} className="btn-primary text-sm">
          {showBuilder ? '✕ Close' : '➕ New Order'}
        </button>
      </div>

      {/* ===== Order builder ===== */}
      {showBuilder && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">New Order</h3>
          {menu.length === 0 ? (
            <p className="text-sm text-gray-500">
              No menu items yet.{' '}
              <Link href="/dashboard/menu" className="text-red-700 underline">
                Add dishes to the menu
              </Link>{' '}
              first.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {menu.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between border rounded-lg px-3 py-2 ${
                      cart[m.id] ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        {m.category} · {formatRs(m.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQty(m.id, -1)}
                        disabled={!cart[m.id]}
                        className="w-7 h-7 rounded-full border text-gray-600 disabled:opacity-30"
                        aria-label={`Remove one ${m.name}`}
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm tabular-nums">{cart[m.id] || 0}</span>
                      <button
                        onClick={() => changeQty(m.id, 1)}
                        className="w-7 h-7 rounded-full bg-red-600 text-white"
                        aria-label={`Add one ${m.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex flex-col">
                <h4 className="font-semibold text-gray-700 mb-3">Order Summary</h4>
                {cartLines.length === 0 ? (
                  <p className="text-sm text-gray-400 flex-1">Add items using the + buttons.</p>
                ) : (
                  <ul className="text-sm space-y-1 flex-1">
                    {cartLines.map((l) => (
                      <li key={l.item.id} className="flex justify-between">
                        <span>
                          {l.qty} × {l.item.name}
                        </span>
                        <span className="tabular-nums">{formatRs(l.item.price * l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t mt-3 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatRs(cartTotal)}</span>
                </div>
                <input
                  className="input-field mt-3"
                  placeholder="Customer name (optional)"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
                <input
                  className="input-field mt-2"
                  type="email"
                  placeholder="Customer email (optional)"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
                <button
                  onClick={placeOrder}
                  disabled={placing || cartLines.length === 0}
                  className="btn-primary mt-3 disabled:opacity-50"
                >
                  {placing ? 'Placing...' : 'Place Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Orders table ===== */}
      <div className="card">
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.label}
              onClick={() => switchTab(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t.value ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 py-6 text-center">Loading...</p>
        ) : orders.length === 0 ? (
          <EmptyState message="No orders here" hint="Create one with the New Order button." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Items</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-gray-50 align-top">
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-gray-800">{o.customer?.name ?? '—'}</td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {o.orderItems
                        .map((oi) => `${oi.quantity}× ${oi.menuItem?.name ?? 'Item'}`)
                        .join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-800 tabular-nums whitespace-nowrap">
                      {formatRs(o.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {o.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setStatus(o.id, 'completed')}
                            disabled={busyId === o.id}
                            className="text-green-700 hover:text-green-900 text-xs font-medium mr-3 disabled:opacity-50"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => setStatus(o.id, 'cancelled')}
                            disabled={busyId === o.id}
                            className="text-gray-600 hover:text-gray-800 text-xs font-medium mr-3 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(o.id)}
                        disabled={busyId === o.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
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
    </PageShell>
  );
}
