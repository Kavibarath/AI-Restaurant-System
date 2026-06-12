'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, logout, isAuthenticated } from '@/services/authService';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: '📦' },
  { href: '/dashboard/ingredients', label: 'Ingredients', icon: '🥕' },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: '🚚' },
  { href: '/dashboard/waste', label: 'Waste AI', icon: '🗑️' },
  { href: '/dashboard/inventory-forecast', label: 'Forecast', icon: '📊' },
];

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared authenticated shell for all Inventory-module pages.
 * Handles auth-guard, top nav, sidebar and logout.
 */
export default function PageShell({ title, subtitle, children }: PageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    setUser(getCurrentUser());
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white shadow-md hidden md:flex flex-col">
        <div className="px-6 py-5 border-b">
          <h2 className="text-lg font-bold text-green-700">📦 Inventory AI</h2>
          <p className="text-xs text-gray-400 mt-1">Member B Module</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-green-100 text-green-800'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user.name} · <span className="capitalize">{user.role}</span>
              </span>
              <button onClick={handleLogout} className="btn-primary text-sm">
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

/* ---------- Reusable UI bits ---------- */

export function StatCard({
  label,
  value,
  accent = 'text-gray-800',
  icon,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  icon?: string;
}) {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${accent}`}>{value}</p>
      </div>
      {icon && <span className="text-4xl opacity-80">{icon}</span>}
    </div>
  );
}

export function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const map = {
    low: { cls: 'bg-green-100 text-green-800', dot: '🟢', text: 'Low' },
    medium: { cls: 'bg-yellow-100 text-yellow-800', dot: '🟡', text: 'Medium' },
    high: { cls: 'bg-red-100 text-red-800', dot: '🔴', text: 'High' },
  }[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${map.cls}`}>
      {map.dot} {map.text}
    </span>
  );
}

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-lg">{message}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  );
}
