'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DiagnosticsPage() {
  const [hardwareStatus, setHardwareStatus] = useState<string>('Memuat status...');
  const [hardwareError, setHardwareError] = useState<string | null>(null);

  useEffect(() => {
    // Poll the status every 2 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/rfid?action=status');
        const data = await res.json();
        setHardwareStatus(data.status);
        setHardwareError(data.error);
      } catch (err) {
        setHardwareStatus('Gagal terhubung ke server Next.js');
        setHardwareError(String(err));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (hardwareStatus === 'Ready') return 'bg-emerald-500';
    if (hardwareStatus.includes('Error') || hardwareStatus.includes('Failed')) return 'bg-red-500';
    if (hardwareStatus.includes('Connecting') || hardwareStatus.includes('Waking')) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800 p-6 md:p-10">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Diagnostics & Hardware</h1>
            <p className="text-gray-500 mt-1">Cek koneksi RFID PN532 dan Troubleshooting</p>
          </div>
          <Link href="/" className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-semibold shadow-sm transition-all">
            Kembali ke Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold mb-6 border-b border-gray-100 pb-4">Status Perangkat Keras</h2>
          
          <div className="flex items-center gap-6 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div className="relative">
              <div className={`w-6 h-6 rounded-full ${getStatusColor()} ${hardwareStatus === 'Ready' ? 'animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]' : ''}`}></div>
              {hardwareStatus !== 'Ready' && !hardwareStatus.includes('Error') && (
                <div className="absolute inset-0 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Status Saat Ini</p>
              <p className="text-2xl font-black text-gray-900">{hardwareStatus}</p>
              {hardwareError && (
                <p className="text-red-500 mt-2 font-mono text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                  ⚠️ {hardwareError}
                </p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
              <h3 className="text-blue-800 font-bold text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">🔌</span> Cara Pemasangan Kabel
              </h3>
              <ul className="space-y-3 text-sm text-gray-700 font-medium">
                <li className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-blue-50">
                  <span>PN532 <strong className="text-red-600">VCC</strong></span> 
                  <span>➜</span> 
                  <span>CP2102 <strong className="text-red-600">5V / 3.3V</strong></span>
                </li>
                <li className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-blue-50">
                  <span>PN532 <strong className="text-black">GND</strong></span> 
                  <span>➜</span> 
                  <span>CP2102 <strong className="text-black">GND</strong></span>
                </li>
                <li className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-blue-50">
                  <span>PN532 <strong className="text-green-600">TXD</strong></span> 
                  <span>➜</span> 
                  <span>CP2102 <strong className="text-blue-600">RXD</strong> (Menyilang!)</span>
                </li>
                <li className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-blue-50">
                  <span>PN532 <strong className="text-blue-600">RXD</strong></span> 
                  <span>➜</span> 
                  <span>CP2102 <strong className="text-green-600">TXD</strong> (Menyilang!)</span>
                </li>
              </ul>
            </div>

            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
              <h3 className="text-orange-800 font-bold text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">⚙️</span> Pengaturan DIP Switch
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Untuk berkomunikasi lewat CP2102, modul PN532 <strong>WAJIB</strong> berada di mode <strong className="text-orange-700">HSU (High Speed UART)</strong>.
              </p>
              <div className="flex gap-4">
                <div className="flex-1 bg-white border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-xs font-bold text-gray-400 mb-1">Switch 1 (I0)</p>
                  <p className="text-xl font-black text-gray-800">OFF <span className="text-sm text-gray-400">(0)</span></p>
                </div>
                <div className="flex-1 bg-white border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-xs font-bold text-gray-400 mb-1">Switch 2 (I1)</p>
                  <p className="text-xl font-black text-gray-800">OFF <span className="text-sm text-gray-400">(0)</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8">
          <h2 className="text-indigo-900 font-bold text-xl mb-4">Troubleshooting Guide</h2>
          <div className="space-y-4">
            <details className="bg-white rounded-xl shadow-sm border border-indigo-50 [&_summary::-webkit-details-marker]:hidden">
              <summary className="font-bold text-indigo-800 p-4 cursor-pointer flex justify-between items-center">
                Status berhenti di "Port Connected, Waking PN532..."
                <span className="text-indigo-400">▼</span>
              </summary>
              <div className="p-4 pt-0 text-sm text-gray-600 leading-relaxed border-t border-gray-50 mt-2">
                Ini berarti komputer berhasil mendeteksi kabel CP2102 di Port COM yang diatur, namun <strong>komputer gagal berkomunikasi dengan chip PN532</strong>.
                <br/><br/>
                <strong>Solusi:</strong>
                <ol className="list-decimal pl-5 space-y-1 mt-2">
                  <li>Pastikan kabel <strong>TX dan RX sudah menyilang</strong> (TX ke RX, RX ke TX).</li>
                  <li>Pastikan DIP Switch I0 dan I1 benar-benar di posisi OFF.</li>
                  <li>Cek apakah lampu indikator daya di modul PN532 menyala merah. Jika tidak, cek kabel VCC dan GND.</li>
                </ol>
              </div>
            </details>

            <details className="bg-white rounded-xl shadow-sm border border-indigo-50 [&_summary::-webkit-details-marker]:hidden">
              <summary className="font-bold text-indigo-800 p-4 cursor-pointer flex justify-between items-center">
                Status "COM Port Error"
                <span className="text-indigo-400">▼</span>
              </summary>
              <div className="p-4 pt-0 text-sm text-gray-600 leading-relaxed border-t border-gray-50 mt-2">
                Ini berarti aplikasi Next.js tidak dapat membuka/menemukan <strong>Port COM yang diatur (di file .env)</strong>.
                <br/><br/>
                <strong>Solusi:</strong>
                <ol className="list-decimal pl-5 space-y-1 mt-2">
                  <li>Cabut dan tancapkan kembali kabel USB CP2102.</li>
                  <li>Buka <em>Device Manager</em> di Windows dan pastikan nomor COM (misal COM3, COM13) sesuai dengan yang ada di file <code>.env</code>.</li>
                  <li>Pastikan tidak ada aplikasi lain (seperti Arduino IDE atau Serial Monitor lain) yang sedang membuka Port COM tersebut secara bersamaan.</li>
                </ol>
              </div>
            </details>
          </div>
        </div>

      </div>
    </div>
  );
}
