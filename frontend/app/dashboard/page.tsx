'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, logout, isAuthenticated } from '@/services/authService';

export default function DashboardPage() {
  const router = useRouter();
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-red-700">
              🍽️ AI Restaurant Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back, {user.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-primary"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Welcome to the AI Restaurant Management System! 🎉
          </h2>
          <p className="text-gray-600">
            Role: <span className="font-semibold capitalize">{user.role}</span> |
            Email: <span className="font-semibold">{user.email}</span>
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales Module (Member A) */}
          <div className="card">
            <h3 className="text-xl font-bold text-red-700 mb-4">
              📊 Sales Intelligence
            </h3>
            <p className="text-gray-600 mb-4">
              Member A&apos;s Module - Manage menu, orders, and predict demand
            </p>
            <div className="space-y-2">
              <Link
                href="/dashboard/menu"
                className="block bg-red-50 hover:bg-red-100 p-3 rounded-lg text-red-700 font-medium"
              >
                📋 Menu Management
              </Link>
              <Link
                href="/dashboard/orders"
                className="block bg-red-50 hover:bg-red-100 p-3 rounded-lg text-red-700 font-medium"
              >
                🛒 Orders
              </Link>
              <Link
                href="/dashboard/sales"
                className="block bg-red-50 hover:bg-red-100 p-3 rounded-lg text-red-700 font-medium"
              >
                💰 Sales Dashboard
              </Link>
              <Link
                href="/dashboard/demand-forecast"
                className="block bg-red-50 hover:bg-red-100 p-3 rounded-lg text-red-700 font-medium"
              >
                📈 Demand Forecast
              </Link>
              <Link
                href="/dashboard/recommendations"
                className="block bg-red-50 hover:bg-red-100 p-3 rounded-lg text-red-700 font-medium"
              >
                ⭐ Recommendations
              </Link>
            </div>
          </div>

          {/* Inventory Module (Member B) */}
          <div className="card">
            <h3 className="text-xl font-bold text-green-700 mb-4">
              📦 Inventory Intelligence
            </h3>
            <p className="text-gray-600 mb-4">
              Member B&apos;s Module - Track inventory, suppliers, and predict waste
            </p>
            <div className="space-y-2">
              <Link
                href="/dashboard/inventory"
                className="block bg-green-50 hover:bg-green-100 p-3 rounded-lg text-green-700 font-medium"
              >
                📦 Inventory
              </Link>
              <Link
                href="/dashboard/ingredients"
                className="block bg-green-50 hover:bg-green-100 p-3 rounded-lg text-green-700 font-medium"
              >
                🥕 Ingredients
              </Link>
              <Link
                href="/dashboard/suppliers"
                className="block bg-green-50 hover:bg-green-100 p-3 rounded-lg text-green-700 font-medium"
              >
                🚚 Suppliers
              </Link>
              <Link
                href="/dashboard/waste"
                className="block bg-green-50 hover:bg-green-100 p-3 rounded-lg text-green-700 font-medium"
              >
                🗑️ Waste Dashboard
              </Link>
              <Link
                href="/dashboard/inventory-forecast"
                className="block bg-green-50 hover:bg-green-100 p-3 rounded-lg text-green-700 font-medium"
              >
                📊 Inventory Forecast
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
