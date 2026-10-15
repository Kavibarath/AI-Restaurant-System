'use client';

import { OrderStatus } from '@/services/salesService';

/* ---------- Order status badge ---------- */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map = {
    pending: { cls: 'bg-yellow-100 text-yellow-800', text: '⏳ Pending' },
    completed: { cls: 'bg-green-100 text-green-800', text: '✅ Completed' },
    cancelled: { cls: 'bg-gray-200 text-gray-700', text: '✕ Cancelled' },
  }[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map.cls}`}>
      {map.text}
    </span>
  );
}

/* ---------- Confidence bar (AI results) ---------- */
export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-red-600 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600 tabular-nums">{pct}%</span>
    </div>
  );
}
