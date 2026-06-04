'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Simulator() {
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState<{ role: string, status: string } | null>(null);

  const simulateScan = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rfid?uid=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setLastScan({ role: data.user.role, status: 'Success' });
      } else {
        setLastScan({ role: 'Unknown', status: 'Failed' });
      }
    } catch (error) {
      console.error('Failed to fetch RFID data', error);
      setLastScan({ role: 'Error', status: 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-emerald-500 to-orange-500"></div>
        
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight mb-2">SIRIS</h1>
          <p className="text-gray-500 text-sm">Smart Interactive RFID System</p>
        </header>

        <div className="space-y-4">
          <button 
            onClick={() => simulateScan('123')}
            disabled={loading}
            className="w-full py-4 px-6 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold rounded-2xl border border-blue-200 hover:border-transparent transition-all flex items-center justify-between group active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-white/20 flex items-center justify-center text-lg">👨‍🏫</span>
              Tap as Dosen
            </span>
            <span className="text-sm opacity-50 group-hover:opacity-100 font-mono">UID: 123</span>
          </button>
          
          <button 
            onClick={() => simulateScan('456')}
            disabled={loading}
            className="w-full py-4 px-6 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold rounded-2xl border border-emerald-200 hover:border-transparent transition-all flex items-center justify-between group active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-100 group-hover:bg-white/20 flex items-center justify-center text-lg">👨‍🎓</span>
              Tap as Mahasiswa
            </span>
            <span className="text-sm opacity-50 group-hover:opacity-100 font-mono">UID: 456</span>
          </button>
          
          <button 
            onClick={() => simulateScan('789')}
            disabled={loading}
            className="w-full py-4 px-6 bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white font-bold rounded-2xl border border-orange-200 hover:border-transparent transition-all flex items-center justify-between group active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-orange-100 group-hover:bg-white/20 flex items-center justify-center text-lg">🧳</span>
              Tap as Tamu
            </span>
            <span className="text-sm opacity-50 group-hover:opacity-100 font-mono">UID: 789</span>
          </button>

          <button 
            onClick={() => simulateScan('999')}
            disabled={loading}
            className="w-full py-4 px-6 bg-gray-50 hover:bg-gray-600 text-gray-700 hover:text-white font-bold rounded-2xl border border-gray-200 hover:border-transparent transition-all flex items-center justify-between group active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-gray-200 group-hover:bg-white/20 flex items-center justify-center text-lg">❓</span>
              Tap Unknown Card
            </span>
            <span className="text-sm opacity-50 group-hover:opacity-100 font-mono">UID: 999</span>
          </button>
        </div>

        {lastScan && (
          <div className="mt-8 p-4 rounded-xl bg-gray-50 border border-gray-100 text-center animate-fade-in-up">
            <p className="text-sm text-gray-500 mb-1">Last scan result:</p>
            <p className="font-semibold text-gray-800">
              {lastScan.role} <span className={lastScan.status === 'Success' ? 'text-emerald-500' : 'text-red-500'}>({lastScan.status})</span>
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
      
      {/* Inline animation styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
}
