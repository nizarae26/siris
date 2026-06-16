'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';

const ModernSwal = Swal.mixin({
  background: '#1e293b',
  color: '#f8fafc',
  customClass: {
    popup: 'rounded-2xl border border-white/10 shadow-2xl',
    confirmButton: 'bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-bold',
    cancelButton: 'bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-5 py-2.5 font-bold ml-3',
  },
  buttonsStyling: false
});

type VideoType = 'youtube' | 'upload';

interface MataKuliah {
  id: string;
  nama: string;
  videoType: VideoType;
  videoUrl: string;
  fileName?: string;
  fileObj?: File;
}

interface JadwalHarian {
  id: string;
  hari: string;
  waktuMulai: string;
  waktuSelesai: string;
  mkId: string;
  dosen: string;
  ruangan: string;
  kelas: string;
}

export type Role = 'Dosen' | 'Mahasiswa' | 'Tamu';

export interface UserData {
  uid: string;
  name: string;
  role: Role;
  nip?: string;
  nrp?: string;
  jurusan?: string;
  angkatan?: number | string;
  instansi?: string;
  videoType?: VideoType;
  videoUrl?: string;
  fileName?: string;
  fileObj?: File;
}

interface JadwalConfigData {
  semesterSchedule: JadwalHarian[];
}

const getDefaultSchedule = (): JadwalHarian[] => [];



// Fungsi pintar untuk otomatis mengubah link youtube biasa menjadi link embed!
const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=0`;
  }
  return url;
};

export default function AdminDashboard() {
  const [mataKuliahList, setMataKuliahList] = useState<MataKuliah[]>([
    {
      id: 'mk1',
      nama: 'Komunikasi Data',
      videoType: 'youtube',
      videoUrl: 'https://www.youtube.com/embed/EngW7tLk6R8',
    }
  ]);

  const [activeTab, setActiveTab] = useState<'matakuliah' | 'tamu' | 'jadwal' | 'users' | 'riwayat'>('matakuliah');
  const [jadwalConfig, setJadwalConfig] = useState<JadwalConfigData>({
    semesterSchedule: []
  });
    const [activeMkId, setActiveMkId] = useState<string>('mk1');
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  
  // State for Auto-Fill UID from Scanner
  const [lastScannedUid, setLastScannedUid] = useState<string>('');
  
  // Tamu state
  const [tamuVideoType, setTamuVideoType] = useState<VideoType>('youtube');
  const [tamuVideoUrl, setTamuVideoUrl] = useState('https://www.youtube.com/embed/5_zZ0n0-TDI');
  const [tamuFileName, setTamuFileName] = useState('');
  const [tamuFileObj, setTamuFileObj] = useState<File | null>(null);

  
  // Riwayat State
  const [riwayatData, setRiwayatData] = useState<any[]>([]);
  const [riwayatMonth, setRiwayatMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMk = mataKuliahList.find(mk => mk.id === activeMkId);

  // Listen for RFID Scans for Auto-Fill
  
  useEffect(() => {
    if (activeTab === 'riwayat') {
      const fetchRiwayat = async () => {
        setLoadingRiwayat(true);
        try {
          const startOfMonth = new Date(`${riwayatMonth}-01T00:00:00.000Z`).toISOString();
          const [year, month] = riwayatMonth.split('-');
          const nextMonthDate = new Date(Date.UTC(parseInt(year), parseInt(month), 1));
          const endOfMonth = nextMonthDate.toISOString();

          const { data, error } = await supabase
            .from('scan_logs')
            .select('*')
            .gte('created_at', startOfMonth)
            .lt('created_at', endOfMonth)
            .order('created_at', { ascending: false });

          if (!error && data) {
            setRiwayatData(data);
          } else {
            setRiwayatData([]);
          }
        } catch (e) {
          console.error(e);
        }
        setLoadingRiwayat(false);
      };
      fetchRiwayat();
    }
  }, [activeTab, riwayatMonth]);

useEffect(() => {
    const eventSource = new EventSource('/api/rfid');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.user?.uid && data.user.uid !== 'Unknown') {
          setLastScannedUid(data.user.uid);
        } else if (data?.user?.uid) {
          setLastScannedUid(data.user.uid);
        }
      } catch (error) {}
    };
    return () => eventSource.close();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: mkRows } = await supabase.from('settings').select('data').eq('id', 1).order('created_at', { ascending: false }).limit(1);
        const { data: tamuRows } = await supabase.from('settings').select('data').eq('id', 2).order('created_at', { ascending: false }).limit(1);
        const { data: jadwalRows } = await supabase.from('settings').select('data').eq('id', 3).order('created_at', { ascending: false }).limit(1);
        const { data: usersRows } = await supabase.from('settings').select('data').eq('id', 4).order('created_at', { ascending: false }).limit(1);
        
        const mkData = mkRows?.[0];
        const tamuData = tamuRows?.[0];
        const jadwalData = jadwalRows?.[0];
        const usersData = usersRows?.[0];
        
        if (mkData?.data) setMataKuliahList(mkData.data);
        if (tamuData?.data) {
          setTamuVideoType(tamuData.data.videoType);
          setTamuVideoUrl(tamuData.data.videoUrl);
        }
        if (jadwalData?.data) {
          const loadedData = jadwalData.data as JadwalConfigData;
          setJadwalConfig({ semesterSchedule: loadedData.semesterSchedule || [] });
        }
        if (usersData?.data) setUsersList(usersData.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedMataKuliahList = [...mataKuliahList];

      // Process uploads for MataKuliah
      for (let i = 0; i < updatedMataKuliahList.length; i++) {
        const mk = { ...updatedMataKuliahList[i] };
        if (mk.videoType === 'upload' && mk.fileObj) {
          const fileName = `videos/${Date.now()}_${mk.fileObj.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
          const { error: uploadError } = await supabase.storage
            .from('rfid-assets')
            .upload(fileName, mk.fileObj, { cacheControl: '3600', upsert: true });
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from('rfid-assets').getPublicUrl(fileName);
          mk.videoUrl = publicUrlData.publicUrl;
          delete mk.fileObj;
        }
        updatedMataKuliahList[i] = mk;
      }

      // Process tamu upload
      let finalTamuUrl = tamuVideoUrl;
      const finalTamuType = tamuVideoType;
      
      if (tamuVideoType === 'upload' && tamuFileObj) {
        const fileName = `videos/tamu_${Date.now()}_${tamuFileObj.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('rfid-assets')
          .upload(fileName, tamuFileObj, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('rfid-assets')
          .getPublicUrl(fileName);

        finalTamuUrl = publicUrlData.publicUrl;
        setTamuFileObj(null); // Clean up
        setTamuVideoUrl(finalTamuUrl);
      }

      // Save to Supabase Database
      const { error: mkError } = await supabase
        .from('settings')
        .upsert({ id: 1, data: updatedMataKuliahList });
      if (mkError) throw mkError;

      const { error: tamuError } = await supabase
        .from('settings')
        .upsert({ id: 2, data: { videoType: finalTamuType, videoUrl: finalTamuUrl } });
      if (tamuError) throw tamuError;

      const { error: jadwalError } = await supabase
        .from('settings')
        .upsert({ id: 3, data: jadwalConfig });
      if (jadwalError) throw jadwalError;

      // Process uploads for Users (Dosen videos)
      const updatedUsersList = [...usersList];
      for (let i = 0; i < updatedUsersList.length; i++) {
        const u = { ...updatedUsersList[i] };
        if (u.role === 'Dosen' && u.videoType === 'upload' && u.fileObj) {
          const fileName = `videos/dosen_${Date.now()}_${u.fileObj.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
          const { error: uploadError } = await supabase.storage
            .from('rfid-assets')
            .upload(fileName, u.fileObj, { cacheControl: '3600', upsert: true });
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from('rfid-assets').getPublicUrl(fileName);
          u.videoUrl = publicUrlData.publicUrl;
          delete u.fileObj;
          delete u.fileName;
        }
        updatedUsersList[i] = u;
      }

      const { error: usersError } = await supabase
        .from('settings')
        .upsert({ id: 4, data: updatedUsersList });
      if (usersError) throw usersError;

      setMataKuliahList(updatedMataKuliahList);
      setUsersList(updatedUsersList);
      setLastScannedUid(''); // Hapus alert kartu baru setelah berhasil disimpan
      setShowSuccess(true);
      ModernSwal.fire({
        title: 'Berhasil!',
        text: 'Pengaturan berhasil disimpan ke Database',
        icon: 'success',
        timer: 3000
      });
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      ModernSwal.fire({
        title: 'Gagal!',
        text: 'Gagal menyimpan data ke Database. Pastikan koneksi stabil.',
        icon: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tambahMataKuliah = () => {
    const newId = 'mk' + Date.now();
    setMataKuliahList(prev => [
      ...prev,
      {
        id: newId,
        nama: 'Mata Kuliah Baru',
        videoType: 'youtube',
        videoUrl: ''
      }
    ]);
    setActiveMkId(newId);
  };

  const hapusMataKuliah = async (mkId: string) => {
    const result = await ModernSwal.fire({
      title: 'Hapus Mata Kuliah?',
      text: "Seluruh pertemuan di dalam mata kuliah ini akan ikut terhapus. Lanjutkan?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });
    if(!result.isConfirmed) return;
    setMataKuliahList(prev => {
      const filtered = prev.filter(mk => mk.id !== mkId);
      if (filtered.length > 0) {
        if (activeMkId === mkId) setActiveMkId(filtered[0].id);
      } else {
        setActiveMkId('');
      }
      return filtered;
    });
  };

  const editNamaMataKuliah = (mkId: string, newNama: string) => {
    setMataKuliahList(prev => prev.map(mk => {
      if (mk.id !== mkId) return mk;
      return { ...mk, nama: newNama };
    }));
  };

  // Pagination for Users
  const USERS_PER_PAGE = 5;
  const usersTotalPages = Math.ceil(usersList.length / USERS_PER_PAGE);
  const paginatedUsers = usersList.slice(
    (usersCurrentPage - 1) * USERS_PER_PAGE,
    usersCurrentPage * USERS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-gray-800 tracking-tight">SIRIS Admin</h1>
            <p className="text-xs font-medium text-gray-500">Content Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
            Halaman Utama
          </Link>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-sm font-semibold rounded-lg transition-colors">
            Logout
          </button>
        </div>
      </nav>

      <div className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full p-4 md:p-8 gap-6">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">Kategori Konten</div>
          
          <button 
            onClick={() => setActiveTab('matakuliah')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'matakuliah' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm' : 'text-gray-600 hover:bg-white border border-transparent'}`}
          >
            <span className="text-lg">📚</span> Mata Kuliah (Lab)
          </button>
          
          <button 
            onClick={() => setActiveTab('tamu')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'tamu' ? 'bg-orange-50 text-orange-700 border border-orange-100 shadow-sm' : 'text-gray-600 hover:bg-white border border-transparent'}`}
          >
            <span className="text-lg">🧳</span> Tamu Umum
          </button>
          
          <button 
            onClick={() => setActiveTab('jadwal')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'jadwal' ? 'bg-green-50 text-green-700 border border-green-100 shadow-sm' : 'text-gray-600 hover:bg-white border border-transparent'}`}
          >
            <span className="text-lg">📅</span> Jadwal Harian
          </button>
          
          
          <button 
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'riwayat' ? 'bg-teal-50 text-teal-700 border border-teal-100 shadow-sm' : 'text-gray-600 hover:bg-white border border-transparent'}`}
          >
            <span className="text-lg">⏱️</span> Riwayat Tap
          </button>
<button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeTab === 'users' ? 'bg-purple-50 text-purple-700 border border-purple-100 shadow-sm' : 'text-gray-600 hover:bg-white border border-transparent'}`}
          >
            <span className="text-lg">👥</span> Pengelola Pengguna
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-grow bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          
          {activeTab === 'matakuliah' && (
            <div className="p-6 md:p-8 flex-grow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Manajemen Mata Kuliah</h2>
                  <p className="text-gray-500 mt-1 text-sm">Kelola materi pembelajaran untuk mahasiswa & dosen di lab.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <select 
                    value={activeMkId}
                    onChange={(e) => setActiveMkId(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {mataKuliahList.map(mk => (
                      <option key={mk.id} value={mk.id}>{mk.nama}</option>
                    ))}
                  </select>
                  <button 
                    onClick={tambahMataKuliah}
                    className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200 transition-colors"
                    title="Tambah Mata Kuliah"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  </button>
                </div>
              </div>

              {activeMk && (
                <>
                  <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm gap-4">
                    <div className="flex-grow">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Mata Kuliah Aktif</label>
                      <input 
                        type="text"
                        value={activeMk.nama}
                        onChange={(e) => editNamaMataKuliah(activeMk.id, e.target.value)}
                        className="w-full font-bold text-xl text-gray-800 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-indigo-500 outline-none transition-colors"
                      />
                    </div>
                    <button 
                      onClick={() => hapusMataKuliah(activeMk.id)}
                      className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold border border-red-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      Hapus Matkul
                    </button>
                  </div>

                                    <div className="border border-gray-100 bg-gray-50/50 rounded-2xl p-5 shadow-sm">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Sumber Video Mata Kuliah</label>
                          <div className="flex gap-2 mb-4 p-1 bg-gray-200/50 rounded-lg w-max">
                            <button 
                              onClick={() => {
                                setMataKuliahList(prev => prev.map(m => m.id === activeMk.id ? {...m, videoType: 'youtube'} : m));
                              }}
                              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeMk.videoType === 'youtube' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              YouTube Link
                            </button>
                            <button 
                              onClick={() => {
                                setMataKuliahList(prev => prev.map(m => m.id === activeMk.id ? {...m, videoType: 'upload'} : m));
                              }}
                              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeMk.videoType === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              Upload File
                            </button>
                          </div>

                          {activeMk.videoType === 'youtube' ? (
                            <input 
                              type="text" 
                              value={activeMk.videoUrl}
                              onChange={(e) => {
                                setMataKuliahList(prev => prev.map(m => m.id === activeMk.id ? {...m, videoUrl: e.target.value} : m));
                              }}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                              placeholder="https://www.youtube.com/embed/..."
                            />
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 bg-white rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                              <input 
                                type="file" 
                                accept="video/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setMataKuliahList(prev => prev.map(m => m.id === activeMk.id ? {
                                      ...m,
                                      fileObj: file,
                                      fileName: file.name,
                                      videoUrl: URL.createObjectURL(file)
                                    } : m));
                                  }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                              />
                              <div className="flex flex-col items-center gap-2">
                                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                <span className="text-sm font-medium text-gray-600">
                                  {activeMk.fileName ? activeMk.fileName : 'Klik atau seret video ke sini'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Video Preview */}
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-gray-200 relative">
                          {activeMk.videoUrl ? (
                            activeMk.videoType === 'youtube' ? (
                              <iframe className="w-full h-full" src={getYouTubeEmbedUrl(activeMk.videoUrl)} frameBorder="0" allowFullScreen></iframe>
                            ) : (
                              <video className="w-full h-full object-cover" src={activeMk.videoUrl} controls></video>
                            )
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-gray-100">Belum ada video</div>
                          )}
                        </div>
                      </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'tamu' && (
            <div className="p-6 md:p-8 flex-grow">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Konten Tamu Umum</h2>
              <p className="text-gray-500 mb-8 text-sm">Kelola video profil atau pengenalan lab untuk pengunjung (Tamu).</p>
              
              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Sumber Video Tamu</label>
                <div className="flex gap-2 mb-4 p-1 bg-white border border-orange-200 rounded-lg w-max shadow-sm">
                  <button 
                    onClick={() => setTamuVideoType('youtube')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${tamuVideoType === 'youtube' ? 'bg-orange-100 text-orange-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    YouTube Link
                  </button>
                  <button 
                    onClick={() => setTamuVideoType('upload')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${tamuVideoType === 'upload' ? 'bg-orange-100 text-orange-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Upload File
                  </button>
                </div>

                {tamuVideoType === 'youtube' ? (
                  <input 
                    type="text" 
                    value={tamuVideoUrl}
                    onChange={(e) => setTamuVideoUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm mb-6"
                    placeholder="https://www.youtube.com/embed/..."
                  />
                ) : (
                  <div className="border-2 border-dashed border-orange-300 bg-white rounded-xl p-6 text-center hover:bg-orange-50 transition-colors relative mb-6">
                    <input 
                      type="file" 
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setTamuFileObj(file);
                          setTamuFileName(file.name);
                          setTamuVideoUrl(URL.createObjectURL(file));
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                      <span className="text-sm font-medium text-gray-600">
                        {tamuFileName ? tamuFileName : 'Klik atau seret video ke sini'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="aspect-video w-full md:w-3/4 max-w-2xl rounded-xl overflow-hidden bg-black border border-gray-200">
                  {tamuVideoUrl ? (
                    tamuVideoType === 'youtube' ? (
                      <iframe className="w-full h-full" src={getYouTubeEmbedUrl(tamuVideoUrl)} frameBorder="0" allowFullScreen></iframe>
                    ) : (
                      <video className="w-full h-full object-cover" src={tamuVideoUrl} controls></video>
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100">No Preview</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jadwal' && (
            <div className="p-6 md:p-8 flex-grow overflow-y-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Jadwal Perkuliahan</h2>
                  <p className="text-gray-500 mt-1 text-sm">Atur dan tambahkan jadwal untuk dosen (Senin - Jumat) selama satu semester.</p>
                </div>
                <button 
                  onClick={async () => {
                    const { value: hari } = await ModernSwal.fire({
                      title: 'Tambah Jadwal',
                      text: 'Pilih hari untuk jadwal baru:',
                      input: 'select',
                      inputOptions: {
                        'Senin': 'Senin',
                        'Selasa': 'Selasa',
                        'Rabu': 'Rabu',
                        'Kamis': 'Kamis',
                        'Jumat': 'Jumat'
                      },
                      inputPlaceholder: 'Pilih Hari',
                      showCancelButton: true,
                      customClass: {
                        popup: 'rounded-2xl border border-white/10 shadow-2xl',
                        confirmButton: 'bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-bold',
                        cancelButton: 'bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-5 py-2.5 font-bold ml-3',
                        input: '!text-black !bg-white border-2 border-gray-300 rounded-lg px-4 py-3 mx-auto max-w-[80%] outline-none'
                      }
                    });
                    
                    if (hari) {
                      setJadwalConfig(prev => ({
                        ...prev,
                        semesterSchedule: [
                          ...(prev.semesterSchedule || []), 
                          { id: Date.now().toString(), hari: hari, waktuMulai: '08:00', waktuSelesai: '10:00', mkId: '', dosen: '', ruangan: 'JJ-305', kelas: 'A' }
                        ]
                      }));
                    }
                  }}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  Tambah Jadwal
                </button>
              </div>

              <div className="space-y-4">
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map(hari => {
                  const jadwalHariIni = (jadwalConfig.semesterSchedule || []).filter(j => j.hari === hari);
                  return (
                    <div key={hari} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-6">
                      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wider">{hari}</h3>
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">{jadwalHariIni.length} Sesi</span>
                      </div>
                      <div className="p-6 space-y-4">
                        {jadwalHariIni.length === 0 ? (
                          <div className="text-center text-gray-400 py-4 font-medium text-sm border-2 border-dashed border-gray-200 rounded-xl">Belum ada jadwal di hari {hari}</div>
                        ) : (
                          jadwalHariIni.map(jadwal => (
                            <div key={jadwal.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 relative group hover:border-indigo-200 transition-colors">
                              <div className="col-span-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Mulai</label>
                                <input type="time" value={jadwal.waktuMulai} onChange={e => {
                                  const newVal = e.target.value;
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.map(j => j.id === jadwal.id ? {...j, waktuMulai: newVal} : j) }));
                                }} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" />
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Selesai</label>
                                <input type="time" value={jadwal.waktuSelesai} onChange={e => {
                                  const newVal = e.target.value;
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.map(j => j.id === jadwal.id ? {...j, waktuSelesai: newVal} : j) }));
                                }} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Mata Kuliah</label>
                                <select value={jadwal.mkId} onChange={e => {
                                  const newVal = e.target.value;
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.map(j => j.id === jadwal.id ? {...j, mkId: newVal} : j) }));
                                }} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm">
                                  <option value="">-- Pilih Mata Kuliah --</option>
                                  {mataKuliahList.map(mk => <option key={mk.id} value={mk.id}>{mk.nama}</option>)}
                                </select>
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Dosen Pengampu</label>
                                <select value={jadwal.dosen} onChange={e => {
                                  const newVal = e.target.value;
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.map(j => j.id === jadwal.id ? {...j, dosen: newVal} : j) }));
                                }} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm">
                                  <option value="">-- Dosen --</option>
                                  {usersList.filter(u => u.role === 'Dosen').map(u => <option key={u.uid} value={u.name}>{u.name}</option>)}
                                </select>
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Ruangan</label>
                                <input type="text" value={jadwal.ruangan} onChange={e => {
                                  const newVal = e.target.value;
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.map(j => j.id === jadwal.id ? {...j, ruangan: newVal} : j) }));
                                }} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" />
                              </div>
                              <div className="col-span-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Kelas</label>
                                <select value={jadwal.kelas} onChange={e => {
                                  const newVal = e.target.value;
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.map(j => j.id === jadwal.id ? {...j, kelas: newVal} : j) }));
                                }} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm">
                                  <option value="A">A</option>
                                  <option value="B">B</option>
                                  <option value="C">C</option>
                                  <option value="D">D</option>
                                </select>
                              </div>
                              <div className="col-span-1 flex items-end">
                                <button onClick={() => {
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.filter(j => j.id !== jadwal.id) }));
                                }} className="w-full px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-bold transition-colors">Hapus</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6 md:p-8 flex-grow overflow-y-auto bg-gray-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Pengelola Kartu & Pengguna</h2>
                  <p className="text-gray-500 mt-1 text-sm">Daftarkan kartu RFID untuk Dosen, Mahasiswa, atau Tamu.</p>
                </div>
                <button 
                  onClick={() => {
                    setUsersList(prev => [{ uid: '', name: '', role: 'Mahasiswa', nrp: '', jurusan: '' }, ...prev]);
                    setUsersCurrentPage(1);
                  }}
                  className="bg-purple-600 text-white px-5 py-2.5 rounded-xl hover:bg-purple-700 font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  Tambah Pengguna
                </button>
              </div>

              {lastScannedUid && (
                <div className="mb-6 bg-purple-50 border border-purple-200 text-purple-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>Kartu baru terdeteksi! UID: <strong>{lastScannedUid}</strong>. Anda bisa klik ikon 🎯 di bawah untuk menyalin UID ini.</span>
                  </div>
                  <button onClick={() => setLastScannedUid('')} className="text-purple-400 hover:text-purple-600 font-bold text-xl">&times;</button>
                </div>
              )}

              <div className="space-y-4">
                {usersList.length === 0 && (
                  <div className="text-center py-10 bg-white border border-gray-200 rounded-2xl">
                    <p className="text-gray-500 font-medium">Belum ada pengguna yang terdaftar.</p>
                  </div>
                )}
                {paginatedUsers.map((user, displayIdx) => {
                  const idx = (usersCurrentPage - 1) * USERS_PER_PAGE + displayIdx;
                  return (
                  <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                    <button 
                      onClick={() => setUsersList(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-4 right-4 text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Hapus Pengguna"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-10">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">UID Kartu RFID</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={user.uid}
                            onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, uid: e.target.value } : u))}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Contoh: A1B2C3D4"
                          />
                          <button 
                            onClick={() => {
                              if(lastScannedUid) setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, uid: lastScannedUid } : u));
                              else alert('Silakan tap kartu terlebih dahulu di mesin/simulator!');
                            }}
                            className="bg-purple-100 text-purple-700 p-2.5 rounded-xl hover:bg-purple-200 transition-colors shrink-0"
                            title="Auto-fill dari kartu yang baru di-tap"
                          >
                            🎯
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
                        <input 
                          type="text"
                          value={user.name}
                          onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, name: e.target.value } : u))}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 outline-none"
                          placeholder="Nama..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Peran (Role)</label>
                        <select 
                          value={user.role}
                          onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, role: e.target.value as Role } : u))}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                          <option value="Mahasiswa">Mahasiswa</option>
                          <option value="Dosen">Dosen</option>
                          <option value="Tamu">Tamu Umum</option>
                        </select>
                      </div>

                      {/* Dynamic Fields based on Role */}
                      {user.role === 'Mahasiswa' && (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">NRP (NIM)</label>
                            <input type="text" value={user.nrp || ''} onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, nrp: e.target.value } : u))} className="w-full px-4 py-2 bg-emerald-50/30 border border-emerald-100 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Masukkan NRP..." />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Jurusan</label>
                            <input type="text" value={user.jurusan || ''} onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, jurusan: e.target.value } : u))} className="w-full px-4 py-2 bg-emerald-50/30 border border-emerald-100 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Masukkan Jurusan..." />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Angkatan</label>
                            <input type="number" value={user.angkatan || ''} onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, angkatan: e.target.value } : u))} className="w-full px-4 py-2 bg-emerald-50/30 border border-emerald-100 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Tahun..." />
                          </div>
                        </>
                      )}

                      {user.role === 'Dosen' && (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">NIP</label>
                            <input type="text" value={user.nip || ''} onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, nip: e.target.value } : u))} className="w-full px-4 py-2 bg-blue-50/30 border border-blue-100 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan NIP..." />
                          </div>
                          <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-2">
                            <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Video Profil Dosen</label>
                            <div className="flex gap-2 mb-3 p-1 bg-blue-50/50 border border-blue-100 rounded-lg w-max">
                              <button 
                                onClick={() => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, videoType: 'youtube' } : u))}
                                className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${user.videoType === 'youtube' || !user.videoType ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                YouTube Link
                              </button>
                              <button 
                                onClick={() => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, videoType: 'upload' } : u))}
                                className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${user.videoType === 'upload' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                Upload File
                              </button>
                            </div>
                            
                            {(user.videoType === 'youtube' || !user.videoType) ? (
                              <input 
                                type="text"
                                value={user.videoUrl || ''}
                                onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, videoUrl: e.target.value } : u))}
                                className="w-full px-4 py-2 bg-blue-50/30 border border-blue-100 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="https://www.youtube.com/embed/..."
                              />
                            ) : (
                              <div className="border-2 border-dashed border-blue-200 bg-white rounded-xl p-4 text-center hover:bg-blue-50 transition-colors relative">
                                <input 
                                  type="file" 
                                  accept="video/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setUsersList(prev => prev.map((u, i) => i === idx ? {
                                        ...u,
                                        fileObj: file,
                                        fileName: file.name,
                                        videoUrl: URL.createObjectURL(file)
                                      } : u));
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                />
                                <div className="flex flex-col items-center gap-1">
                                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                  <span className="text-xs font-medium text-gray-600">
                                    {user.fileName ? user.fileName : (user.videoUrl && user.videoUrl.startsWith('http') ? 'Video terunggah (Ganti video)' : 'Klik atau seret video ke sini')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {usersTotalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    disabled={usersCurrentPage === 1}
                    onClick={() => setUsersCurrentPage(p => p - 1)}
                    className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: usersTotalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setUsersCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-lg font-bold transition-colors ${
                        usersCurrentPage === i + 1 
                          ? 'bg-purple-600 text-white shadow-md' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    disabled={usersCurrentPage === usersTotalPages}
                    onClick={() => setUsersCurrentPage(p => p + 1)}
                    className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          
          {activeTab === 'riwayat' && (
            <div className="p-6 md:p-8 flex-grow overflow-y-auto bg-gray-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Riwayat Tap Kartu</h2>
                  <p className="text-gray-500 mt-1 text-sm">Lihat seluruh aktivitas pemindaian kartu RFID.</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-700">Pilih Bulan:</label>
                  <input 
                    type="month" 
                    value={riwayatMonth}
                    onChange={(e) => setRiwayatMonth(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold bg-white"
                  />
                </div>
              </div>

              {loadingRiwayat ? (
                <div className="flex justify-center items-center py-20 text-teal-600">
                  <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-3 font-semibold">Memuat Data...</span>
                </div>
              ) : riwayatData.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-bold text-gray-700">Tidak Ada Riwayat</h3>
                  <p className="text-gray-500 mt-2">Belum ada aktivitas tap kartu pada bulan ini.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                          <th className="px-6 py-4 font-bold">Waktu (WIB)</th>
                          <th className="px-6 py-4 font-bold">UID</th>
                          <th className="px-6 py-4 font-bold">Nama / Keterangan</th>
                          <th className="px-6 py-4 font-bold">Role</th>
                          <th className="px-6 py-4 font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {riwayatData.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                              {new Date(log.created_at).toLocaleString('id-ID')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                              {log.uid}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800 font-semibold">
                              {log.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                log.role === 'Dosen' ? 'bg-blue-100 text-blue-700' :
                                log.role === 'Mahasiswa' ? 'bg-green-100 text-green-700' :
                                log.role === 'Tamu' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {log.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {log.status === 'SUCCESS' ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Berhasil
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600 font-bold text-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg> Ditolak
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

{/* Save Footer */}
          {activeTab !== 'riwayat' && (
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm">
              {showSuccess && (
                <span className="text-emerald-600 font-medium flex items-center gap-2 animate-fade-in-up">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Perubahan berhasil disimpan!
                </span>
              )}
            </div>
            
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Menyimpan...
                </>
              ) : 'Simpan Semua'}
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full pb-6 pt-4 flex flex-col items-center justify-center space-y-1">
        <p className="text-gray-400 text-[10px] font-medium tracking-widest uppercase">
          &copy; {new Date().getFullYear()} SIRIS Project. All rights reserved.
        </p>
        <p className="text-gray-500 text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-1.5">
          Powered By <span className="text-indigo-600 font-black">24 Telkom D</span>
        </p>
      </div>

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
