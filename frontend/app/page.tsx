'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-700 mb-4">
          🍽️ AI Restaurant System
        </h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
