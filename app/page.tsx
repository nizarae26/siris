'use client';

import { useState, useEffect } from 'react';
import LogTracker from '../components/LogTracker';
import { User, Content, ScanLog, Role } from './api/rfid/database';

export default function Dashboard() {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeContent, setActiveContent] = useState<Content | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);

  // Fungsi pintar untuk otomatis mengubah link youtube biasa menjadi link embed!
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return url;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      // Browsers block autoplay if it has sound and user hasn't interacted with the page.
      // Menambahkan mute=1 memaksa browser untuk memutar video secara otomatis (meski tanpa suara awalnya)
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&mute=1&rel=0`;
    }
    return url;
  };

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

  // Auto-clear active session
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (activeUser) {
      const isYouTube = activeContent?.mediaUrl?.includes('youtube.com') || activeContent?.mediaUrl?.includes('youtu.be');
      const noVideo = activeContent?.mediaType !== 'video' || !activeContent?.mediaUrl;
      
      if (noVideo || isYouTube) {
        timeoutId = setTimeout(() => {
          setActiveUser(null);
          setActiveContent(null);
        }, 60000); // 60 seconds fallback
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeUser, activeContent]);

  const getGradient = (role?: Role) => {
    switch (role) {
      case 'Dosen':
        return 'from-blue-900 via-indigo-900 to-slate-900';
      case 'Mahasiswa':
        return 'from-emerald-900 via-teal-900 to-slate-900';
      case 'Tamu':
        return 'from-orange-900 via-rose-900 to-slate-900';
      default:
        return 'from-slate-900 via-gray-900 to-black';
    }
  };

  const getAccentColor = (role?: Role) => {
    switch (role) {
      case 'Dosen': return 'bg-blue-500';
      case 'Mahasiswa': return 'bg-emerald-500';
      case 'Tamu': return 'bg-orange-500';
      default: return 'bg-indigo-500';
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-1000 ease-in-out bg-gradient-to-br ${getGradient(activeUser?.role)} p-4 md:p-6 lg:p-8 flex flex-col font-sans relative overflow-hidden`}>
      
      {/* Decorative background blobs */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-20 pointer-events-none transition-colors duration-1000 ${getAccentColor(activeUser?.role)}`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000 ${getAccentColor(activeUser?.role)}`}></div>

      {/* Floating Header */}
      <header className="mb-8 w-full max-w-7xl mx-auto flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl shadow-2xl z-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg transition-colors duration-500 ${getAccentColor(activeUser?.role)}`}>
            S
          </div>
          <div>
            <h1 className="font-extrabold text-2xl text-white tracking-wider">SIRIS</h1>
            <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">Smart Interactive RFID</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3">

          <a 
            href="/admin" 
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Admin Panel
          </a>
        </div>
      </header>

      <div className="flex-grow flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full z-10">
        
        {/* Main Content Area */}
        <div className="flex-grow flex flex-col gap-6 w-full lg:w-2/3">
          
          {activeUser && activeContent ? (
            <div className="animate-fade-in-up flex flex-col gap-6 h-full">
              
              {/* Media Player Glass Card */}
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-2 shadow-2xl flex-grow flex flex-col">
                <div className={`px-6 py-4 flex items-center ${activeUser.role === 'Mahasiswa' ? 'justify-end' : 'justify-between'} border-b border-white/10`}>
                  {activeUser.role !== 'Mahasiswa' && (
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">{activeContent.title}</h2>
                      <p className="text-gray-300 text-sm mt-1">{activeContent.info}</p>
                    </div>
                  )}
                  <span className="px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-xs font-bold text-white uppercase tracking-wider backdrop-blur-md">
                    {activeUser.role} Portal
                  </span>
                </div>
                
                <div className="flex-grow p-4">
                  {activeContent.mediaType === 'video' && activeContent.mediaUrl ? (
                    <div className="w-full h-full min-h-[300px] lg:min-h-[400px] rounded-2xl overflow-hidden shadow-inner border border-white/10 bg-black/50 backdrop-blur-md">
                      {activeContent.mediaUrl.includes('youtube.com') || activeContent.mediaUrl.includes('youtu.be') ? (
                        <iframe 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" 
                          src={getYouTubeEmbedUrl(activeContent.mediaUrl)} 
                          title="Video Player" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen>
                        </iframe>
                      ) : (
                        <video 
                          className="w-full h-full object-cover"
                          src={activeContent.mediaUrl}
                          autoPlay
                          controls
                          onEnded={() => {
                            setActiveUser(null);
                            setActiveContent(null);
                          }}
                        ></video>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full min-h-[300px] flex items-center justify-center border-2 border-dashed border-white/20 rounded-2xl bg-white/5">
                      <p className="text-white/50 font-medium">Tidak ada video materi yang tersedia.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Jadwal Dosen (Semester) */}
              {activeContent.dosenSchedule && (
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                    <h4 className="text-white font-bold text-xl tracking-wide flex items-center gap-2">
                      <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      Jadwal Mengajar Anda Semester Ini
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    {activeContent.dosenSchedule.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">Belum ada jadwal yang didaftarkan untuk Anda.</p>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-indigo-300 uppercase bg-white/5 border-b border-white/10">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Hari</th>
                            <th className="px-4 py-3">Waktu</th>
                            <th className="px-4 py-3">Mata Kuliah</th>
                            <th className="px-4 py-3">Ruangan</th>
                            <th className="px-4 py-3 rounded-tr-lg">Kelas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeContent.dosenSchedule.sort((a: any, b: any) => {
                            const hariMap: any = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6, 'Minggu': 7 };
                            return (hariMap[a.hari] || 0) - (hariMap[b.hari] || 0);
                          }).map((j: any) => (
                            <tr key={j.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 font-semibold text-indigo-200">{j.hari}</td>
                              <td className="px-4 py-3 text-gray-300">{j.waktuMulai} - {j.waktuSelesai}</td>
                              <td className="px-4 py-3 text-white font-medium">{j.namaMk}</td>
                              <td className="px-4 py-3 text-emerald-300">{j.ruangan}</td>
                              <td className="px-4 py-3 text-gray-300">{j.kelas}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}



            </div>
          ) : (
            
            /* Modern Waiting Screen */
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
              
              <div className="relative flex items-center justify-center mb-10">
                {/* Pulsing rings */}
                <div className="absolute w-40 h-40 border-2 border-indigo-500/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                <div className="absolute w-56 h-56 border border-indigo-500/20 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
                <div className="absolute w-72 h-72 border border-indigo-500/10 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
                
                {/* Central RFID Icon */}
                <div className="relative z-10 w-28 h-28 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-3xl shadow-2xl shadow-indigo-500/50 flex items-center justify-center transform hover:scale-105 transition-transform">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
                  </svg>
                </div>
              </div>
              
              <h2 className="text-3xl font-black text-white tracking-tight mb-3 text-center">Tunggu Pemindaian...</h2>
              <p className="text-gray-400 font-medium text-center max-w-sm">
                Silakan tempelkan kartu RFID Anda pada alat pemindai untuk mengakses portal informasi.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: ID Card & Logs */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* Digital ID Card */}
          {activeUser && (
            <div className={`animate-fade-in-up bg-white/10 backdrop-blur-2xl border-t border-l border-white/30 rounded-3xl p-1 shadow-2xl relative overflow-hidden`}>
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              
              <div className="bg-black/20 rounded-[22px] p-6 h-full flex flex-col relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-white/60 text-xs font-bold uppercase tracking-widest">Digital ID</div>
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${getAccentColor(activeUser.role)} shadow-[0_0_10px_rgba(255,255,255,0.5)]`}></div>
                  </div>
                </div>

                <div className="flex items-center gap-5 mb-8">
                  <div className={`w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center text-3xl font-black text-white shadow-xl ${getAccentColor(activeUser.role)}`}>
                    {activeUser.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white leading-tight">{activeUser.name}</h3>
                    <p className="text-gray-300 font-medium mt-1">{activeUser.role}</p>
                  </div>
                </div>

                <div className="space-y-4 flex-grow border-t border-white/10 pt-6">
                  {activeUser.role === 'Dosen' && activeUser.nip && (
                    <div>
                      <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">NIP</p>
                      <p className="text-white font-mono text-lg">{activeUser.nip}</p>
                    </div>
                  )}
                  {activeUser.role === 'Mahasiswa' && (
                    <>
                      <div>
                        <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">NRP / NIM</p>
                        <p className="text-white font-mono text-lg">{activeUser.nrp}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Jurusan</p>
                          <p className="text-white font-medium">{activeUser.jurusan}</p>
                        </div>
                        <div className="w-1/3">
                          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Angkatan</p>
                          <p className="text-white font-medium">{activeUser.angkatan}</p>
                        </div>
                      </div>
                    </>
                  )}
                  {activeUser.role === 'Tamu' && activeUser.instansi && (
                    <div>
                      <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Asal Instansi</p>
                      <p className="text-white font-medium text-lg">{activeUser.instansi}</p>
                    </div>
                  )}
                </div>


              </div>
            </div>
          )}

          {/* Log Tracker */}
          <div className="flex-grow min-h-[300px]">
            <LogTracker logs={logs} />
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="w-full flex flex-col items-center justify-center z-10 space-y-1 opacity-80 hover:opacity-100 transition-opacity mt-8">
        <p className="text-white/40 text-[10px] font-medium tracking-widest uppercase">
          &copy; {new Date().getFullYear()} SIRIS Project. All rights reserved.
        </p>
        <p className="text-white/60 text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-1.5">
          Powered By <span className="text-indigo-400 font-black">24 Telkom D</span>
        </p>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
