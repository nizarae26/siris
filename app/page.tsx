'use client';

import { useState, useEffect } from 'react';
import LogTracker from '../components/LogTracker';
import { User, Content, ScanLog, Role } from './api/rfid/database';

export default function Dashboard() {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeContent, setActiveContent] = useState<Content | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  useEffect(() => {
    // Connect to Server-Sent Events (SSE) for real-time hardware updates
    const eventSource = new EventSource('/api/rfid');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setActiveUser(data.user);
        setActiveContent(data.content);
        setLogs(data.logs);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Auto-clear active session after 30 seconds of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (activeUser) {
      timeoutId = setTimeout(() => {
        setActiveUser(null);
        setActiveContent(null);
      }, 30000); // 30 seconds
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeUser, logs]);

  const getBackgroundColor = (role?: Role) => {
    switch (role) {
      case 'Dosen':
        return 'bg-blue-50'; // Soft blue
      case 'Mahasiswa':
        return 'bg-emerald-50'; // Pastel emerald
      case 'Tamu':
        return 'bg-orange-50'; // Warm orange
      default:
        return 'bg-gray-50'; // Default gray
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 ease-in-out ${getBackgroundColor(activeUser?.role)} p-4 md:p-8 flex flex-col font-sans`}>
      <header className="mb-8 mt-4 text-center relative">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-800 tracking-tight">- SIRIS -</h1>
        <p className="text-gray-500 mt-2 font-medium text-lg">Smart Interactive RFID System</p>
        <div className="absolute top-0 right-0 hidden md:flex items-center gap-3">
          <a 
            href="/admin" 
            className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Panel
          </a>
          <a 
            href="/simulator" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Simulator
          </a>
        </div>
      </header>

      <div className="flex-grow flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
        {/* Main Content Area */}
        <div className="flex-grow flex flex-col gap-6">
          <div className="bg-white/80 backdrop-blur-md shadow-xl border border-white rounded-3xl p-6 md:p-10 flex-grow relative overflow-hidden">
            {/* Decorative background circle */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700
              ${activeUser?.role === 'Dosen' ? 'bg-blue-500' : activeUser?.role === 'Mahasiswa' ? 'bg-emerald-500' : activeUser?.role === 'Tamu' ? 'bg-orange-500' : 'bg-gray-400'}`}>
            </div>

            {activeUser && activeContent ? (
              <div className="animate-fade-in-up relative z-10">
                <div className="flex items-center gap-5 mb-8">
                  <div className={`w-20 h-20 rounded-2xl shadow-md flex items-center justify-center text-3xl font-bold text-white
                    ${activeUser.role === 'Dosen' ? 'bg-blue-600' : activeUser.role === 'Mahasiswa' ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                    {activeUser.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{activeContent.title}</h2>
                    <span className="inline-block mt-1 px-3 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg">
                      {activeUser.role} Portal
                    </span>
                  </div>
                </div>
                
                {/* User Details Profile Card */}
                <div className="bg-white/90 border border-gray-100 rounded-2xl p-5 mb-8 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3">Informasi Pengguna</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Nama Lengkap</p>
                      <p className="font-semibold text-gray-900 text-base">{activeUser.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Role</p>
                      <p className="font-semibold text-gray-900 text-base">{activeUser.role}</p>
                    </div>
                    
                    {activeUser.role === 'Dosen' && activeUser.nip && (
                      <div>
                        <p className="text-gray-500 font-medium">NIP</p>
                        <p className="font-semibold text-gray-900 text-base">{activeUser.nip}</p>
                      </div>
                    )}

                    {activeUser.role === 'Mahasiswa' && (
                      <>
                        <div>
                          <p className="text-gray-500 font-medium">NRP (NIM)</p>
                          <p className="font-semibold text-gray-900 text-base">{activeUser.nrp}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Jurusan</p>
                          <p className="font-semibold text-gray-900 text-base">{activeUser.jurusan}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Angkatan</p>
                          <p className="font-semibold text-gray-900 text-base">{activeUser.angkatan}</p>
                        </div>
                      </>
                    )}

                    {activeUser.role === 'Tamu' && activeUser.instansi && (
                      <div>
                        <p className="text-gray-500 font-medium">Asal Instansi</p>
                        <p className="font-semibold text-gray-900 text-base">{activeUser.instansi}</p>
                      </div>
                    )}

                    <div className="sm:col-span-2 mt-2 pt-2 border-t border-gray-50">
                      <p className="text-gray-500 font-medium">Waktu Tap Kartu</p>
                      <p className="font-semibold text-gray-900 text-base">
                        {logs.length > 0 ? new Date(logs[0].time).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' }) : '-'}
                      </p>
                    </div>
                  </div>
                </div>


                <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-6 mb-8 shadow-inner">
                  <p className="text-lg text-gray-700 leading-relaxed font-medium mb-4">
                    {activeContent.info}
                  </p>

                  {/* Dynamic Media Video */}
                  {activeContent.mediaType === 'video' && activeContent.mediaUrl && (
                    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-md border border-gray-200">
                      <iframe 
                        className="w-full h-full"
                        src={activeContent.mediaUrl} 
                        title="Video Player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen>
                      </iframe>
                    </div>
                  )}

                  {/* Dynamic Lab Info for Mahasiswa */}
                  {activeContent.labInfo && (
                    <div className="bg-white border border-emerald-100 rounded-xl p-5 shadow-sm mt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <h4 className="text-emerald-800 font-bold text-lg">Live di {activeContent.labInfo.room}</h4>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">Dosen yang sedang berada di ruangan saat ini:</p>
                      <ul className="flex flex-wrap gap-2">
                        {activeContent.labInfo.dosenPresent.map((dosen, i) => (
                          <li key={i} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-emerald-100">
                            👨‍🏫 {dosen}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold mb-4 text-gray-800">Quick Access</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {activeContent.widgets.map((widget, index) => (
                    <div key={index} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 hover:-translate-y-1 transition-all cursor-pointer flex items-center justify-center min-h-[110px] text-center font-semibold text-gray-700 group">
                      <span className="group-hover:text-blue-600 transition-colors">{widget}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
                <div className="w-24 h-24 mb-6 rounded-full bg-gray-100 flex items-center justify-center animate-pulse">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                  </svg>
                </div>
                <p className="text-xl font-semibold text-gray-500">Waiting for RFID Scan...</p>
                <p className="text-sm text-gray-400 mt-2">Please tap a card to view content</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
          <LogTracker logs={logs} />
        </div>
      </div>
      
      {/* Inline animation styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
