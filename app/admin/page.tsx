'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

type VideoType = 'youtube' | 'upload';

interface Pembelajaran {
  id: string;
  judul: string;
  videoType: VideoType;
  videoUrl: string;
  fileName?: string;
  fileObj?: File;
}

interface MataKuliah {
  id: string;
  nama: string;
  pembelajaran: Pembelajaran[];
}

interface JadwalHarian {
  id: string;
  namaHari: string;
  mkId: string;
  pembId: string;
  dosen: string;
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
}

interface JadwalConfigData {
  startDate: string;
  manualWeekOverride: number | null;
  weeks: Record<number, JadwalHarian[]>;
}

const getDefaultWeek = (): JadwalHarian[] => [
  { id: 'senin', namaHari: 'Senin', mkId: '', pembId: '', dosen: '' },
  { id: 'selasa', namaHari: 'Selasa', mkId: '', pembId: '', dosen: '' },
  { id: 'rabu', namaHari: 'Rabu', mkId: '', pembId: '', dosen: '' },
  { id: 'kamis', namaHari: 'Kamis', mkId: '', pembId: '', dosen: '' },
  { id: 'jumat', namaHari: 'Jumat', mkId: '', pembId: '', dosen: '' },
];

const getDefaultWeeks = () => {
  const w: Record<number, JadwalHarian[]> = {};
  for(let i=1; i<=16; i++) w[i] = getDefaultWeek();
  return w;
};

export default function AdminDashboard() {
  const [mataKuliahList, setMataKuliahList] = useState<MataKuliah[]>([
    {
      id: 'mk1',
      nama: 'Komunikasi Data',
      pembelajaran: [
        { id: 'p1', judul: 'Pertemuan 1: Pengenalan Sinyal', videoType: 'youtube', videoUrl: 'https://www.youtube.com/embed/EngW7tLk6R8' },
        { id: 'p2', judul: 'Pertemuan 2: Modulasi Analog', videoType: 'upload', videoUrl: '', fileName: 'modulasi_analog_ch1.mp4' }
      ]
    },
    {
      id: 'mk2',
      nama: 'Sistem Tertanam (Embedded Systems)',
      pembelajaran: [
        { id: 'p3', judul: 'Modul 1: Mikrokontroler Dasar', videoType: 'youtube', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
      ]
    }
  ]);

  const [activeTab, setActiveTab] = useState<'matakuliah' | 'tamu' | 'jadwal' | 'users'>('matakuliah');
  const [jadwalConfig, setJadwalConfig] = useState<JadwalConfigData>({
    startDate: new Date().toISOString().split('T')[0],
    manualWeekOverride: null,
    weeks: getDefaultWeeks()
  });
  const [editWeek, setEditWeek] = useState<number>(1);
  const [activeMkId, setActiveMkId] = useState<string>('mk1');
  const [usersList, setUsersList] = useState<UserData[]>([]);
  
  // State for Auto-Fill UID from Scanner
  const [lastScannedUid, setLastScannedUid] = useState<string>('');
  
  // Tamu state
  const [tamuVideoType, setTamuVideoType] = useState<VideoType>('youtube');
  const [tamuVideoUrl, setTamuVideoUrl] = useState('https://www.youtube.com/embed/5_zZ0n0-TDI');
  const [tamuFileName, setTamuFileName] = useState('');
  const [tamuFileObj, setTamuFileObj] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMk = mataKuliahList.find(mk => mk.id === activeMkId);

  // Listen for RFID Scans for Auto-Fill
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
        const { data: mkData } = await supabase.from('settings').select('data').eq('id', 1).single();
        const { data: tamuData } = await supabase.from('settings').select('data').eq('id', 2).single();
        const { data: jadwalData } = await supabase.from('settings').select('data').eq('id', 3).single();
        const { data: usersData } = await supabase.from('settings').select('data').eq('id', 4).single();
        
        if (mkData?.data) setMataKuliahList(mkData.data);
        if (tamuData?.data) {
          setTamuVideoType(tamuData.data.videoType);
          setTamuVideoUrl(tamuData.data.videoUrl);
        }
        if (jadwalData?.data) {
          const loadedData = jadwalData.data as JadwalConfigData;
          setJadwalConfig({
            startDate: loadedData.startDate || new Date().toISOString().split('T')[0],
            manualWeekOverride: loadedData.manualWeekOverride || null,
            weeks: { ...getDefaultWeeks(), ...loadedData.weeks }
          });
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
      let updatedMataKuliahList = [...mataKuliahList];

      // Process uploads
      for (let i = 0; i < updatedMataKuliahList.length; i++) {
        let mk = { ...updatedMataKuliahList[i] };
        let updatedPembelajaran = [...mk.pembelajaran];

        for (let j = 0; j < updatedPembelajaran.length; j++) {
          let pemb = { ...updatedPembelajaran[j] };
          
          if (pemb.videoType === 'upload' && pemb.fileObj) {
            const fileName = `videos/${Date.now()}_${pemb.fileObj.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
            const { error: uploadError } = await supabase.storage
              .from('rfid-assets')
              .upload(fileName, pemb.fileObj, { cacheControl: '3600', upsert: true });
            
            if (uploadError) throw uploadError;
            
            const { data: publicUrlData } = supabase.storage
              .from('rfid-assets')
              .getPublicUrl(fileName);
            
            pemb.videoUrl = publicUrlData.publicUrl;
            delete pemb.fileObj; // Clean up before saving to DB
          }
          updatedPembelajaran[j] = pemb;
        }
        mk.pembelajaran = updatedPembelajaran;
        updatedMataKuliahList[i] = mk;
      }

      // Process tamu upload
      let finalTamuUrl = tamuVideoUrl;
      let finalTamuType = tamuVideoType;
      
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

      const { error: usersError } = await supabase
        .from('settings')
        .upsert({ id: 4, data: usersList });
      if (usersError) throw usersError;

      setMataKuliahList(updatedMataKuliahList);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      alert('Gagal menyimpan data ke Database');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePembelajaran = (mkId: string, pembId: string, updates: Partial<Pembelajaran>) => {
    setMataKuliahList(prev => prev.map(mk => {
      if (mk.id !== mkId) return mk;
      return {
        ...mk,
        pembelajaran: mk.pembelajaran.map(p => p.id === pembId ? { ...p, ...updates } : p)
      };
    }));
  };

  const handleFileUpload = (mkId: string, pembId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fakeUrl = URL.createObjectURL(file);
      updatePembelajaran(mkId, pembId, { videoUrl: fakeUrl, fileName: file.name, fileObj: file });
    }
  };

  const tambahPembelajaran = (mkId: string) => {
    setMataKuliahList(prev => prev.map(mk => {
      if (mk.id !== mkId) return mk;
      const newId = `p${Date.now()}`;
      return {
        ...mk,
        pembelajaran: [...mk.pembelajaran, { id: newId, judul: `Pertemuan Baru`, videoType: 'youtube', videoUrl: '' }]
      };
    }));
  };

  const hapusPembelajaran = (mkId: string, pembId: string) => {
    if(!confirm('Apakah Anda yakin ingin menghapus pertemuan ini?')) return;
    setMataKuliahList(prev => prev.map(mk => {
      if (mk.id !== mkId) return mk;
      return {
        ...mk,
        pembelajaran: mk.pembelajaran.filter(p => p.id !== pembId)
      };
    }));
  };

  const tambahMataKuliah = () => {
    const newId = `mk${Date.now()}`;
    setMataKuliahList(prev => [...prev, { id: newId, nama: 'Mata Kuliah Baru', pembelajaran: [] }]);
    setActiveMkId(newId);
  };

  const hapusMataKuliah = (mkId: string) => {
    if(!confirm('Apakah Anda yakin ingin menghapus seluruh mata kuliah ini beserta isinya?')) return;
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

                  <div className="space-y-6">
                  {activeMk.pembelajaran.map((pemb, index) => (
                    <div key={pemb.id} className="border border-gray-100 bg-gray-50/50 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
                        <div className="flex items-center gap-3 w-full max-w-lg">
                          <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{index + 1}</span>
                          <input 
                            type="text"
                            value={pemb.judul}
                            onChange={(e) => updatePembelajaran(activeMk.id, pemb.id, { judul: e.target.value })}
                            className="font-bold text-gray-800 text-lg bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 py-1 w-full transition-colors"
                            placeholder="Judul Pertemuan..."
                          />
                        </div>
                        <button 
                          onClick={() => hapusPembelajaran(activeMk.id, pemb.id)}
                          className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Hapus Pertemuan"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Sumber Video</label>
                          <div className="flex gap-2 mb-4 p-1 bg-gray-200/50 rounded-lg w-max">
                            <button 
                              onClick={() => updatePembelajaran(activeMk.id, pemb.id, { videoType: 'youtube' })}
                              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${pemb.videoType === 'youtube' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              YouTube Link
                            </button>
                            <button 
                              onClick={() => updatePembelajaran(activeMk.id, pemb.id, { videoType: 'upload' })}
                              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${pemb.videoType === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              Upload File
                            </button>
                          </div>

                          {pemb.videoType === 'youtube' ? (
                            <input 
                              type="text" 
                              value={pemb.videoUrl}
                              onChange={(e) => updatePembelajaran(activeMk.id, pemb.id, { videoUrl: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                              placeholder="https://www.youtube.com/embed/..."
                            />
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 bg-white rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                              <input 
                                type="file" 
                                accept="video/*"
                                onChange={(e) => handleFileUpload(activeMk.id, pemb.id, e)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                              />
                              <div className="flex flex-col items-center gap-2">
                                <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                <span className="text-sm font-medium text-gray-600">
                                  {pemb.fileName ? pemb.fileName : 'Klik atau seret video ke sini'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Video Preview */}
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-gray-200 relative">
                          {pemb.videoUrl ? (
                            pemb.videoType === 'youtube' ? (
                              <iframe className="w-full h-full" src={pemb.videoUrl} frameBorder="0" allowFullScreen></iframe>
                            ) : (
                              <video className="w-full h-full object-cover" src={pemb.videoUrl} controls></video>
                            )
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm bg-gray-100">Belum ada video</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => tambahPembelajaran(activeMk.id)}
                    className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Tambah Pertemuan / Materi Baru
                  </button>
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
                      <iframe className="w-full h-full" src={tamuVideoUrl} frameBorder="0" allowFullScreen></iframe>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Jadwal Perkuliahan</h2>
                  <p className="text-gray-500 mt-1 text-sm">Atur jadwal per minggu selama satu semester (1-16).</p>
                </div>
              </div>
              
              {/* Konfigurasi Semester */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-indigo-900 mb-2">Tanggal Mulai Semester</label>
                  <input 
                    type="date"
                    value={jadwalConfig.startDate}
                    onChange={e => setJadwalConfig(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900 font-medium shadow-sm"
                  />
                  <p className="text-xs text-indigo-600 mt-2">Sistem akan otomatis menghitung minggu ke-berapa saat ini berdasarkan tanggal mulai.</p>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-indigo-900 mb-2">Paksa Minggu Aktif (Manual)</label>
                  <div className="relative">
                    <select 
                      value={jadwalConfig.manualWeekOverride || ''}
                      onChange={e => setJadwalConfig(prev => ({ ...prev, manualWeekOverride: e.target.value ? parseInt(e.target.value) : null }))}
                      className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-900 font-medium shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Gunakan Perhitungan Otomatis</option>
                      {Array.from({length: 16}, (_, i) => i + 1).map(w => (
                        <option key={w} value={w}>Paksa tayangkan Minggu Ke-{w}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-indigo-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pemilih Minggu yang akan diedit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700">Edit Jadwal untuk:</span>
                  <div className="relative w-48">
                    <select 
                      value={editWeek}
                      onChange={e => setEditWeek(parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer shadow-sm"
                    >
                      {Array.from({length: 16}, (_, i) => i + 1).map(w => (
                        <option key={w} value={w}>Minggu Ke-{w}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
                
                {editWeek > 1 && (
                  <button 
                    onClick={() => {
                      if(confirm(`Salin seluruh jadwal dari Minggu ke-${editWeek-1} ke Minggu ke-${editWeek}?`)) {
                        setJadwalConfig(prev => ({
                          ...prev,
                          weeks: { ...prev.weeks, [editWeek]: JSON.parse(JSON.stringify(prev.weeks[editWeek-1])) }
                        }));
                      }
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
                    Salin dari Minggu {editWeek - 1}
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {jadwalConfig.weeks[editWeek].map((jadwal, dayIdx) => {
                   const mkOptions = mataKuliahList.find(mk => mk.id === jadwal.mkId);
                   return (
                    <div key={jadwal.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col xl:flex-row gap-4 items-center shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
                      <div className="w-full xl:w-24 flex-shrink-0">
                        <span className="font-bold text-gray-700 text-base uppercase bg-gray-100 px-3 py-1.5 rounded-lg">{jadwal.namaHari}</span>
                      </div>
                      
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div className="relative">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Mata Kuliah</label>
                          <select 
                            value={jadwal.mkId}
                            onChange={(e) => {
                              const newMkId = e.target.value;
                              setJadwalConfig(prev => {
                                const newWeeks = {...prev.weeks};
                                newWeeks[editWeek][dayIdx] = { ...jadwal, mkId: newMkId, pembId: '' };
                                return { ...prev, weeks: newWeeks };
                              });
                            }}
                            className="w-full px-4 py-2.5 bg-gray-50 hover:bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer transition-colors"
                          >
                            <option value="">-- Libur / Kosong --</option>
                            {mataKuliahList.map(mk => (
                              <option key={mk.id} value={mk.id}>{mk.nama}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute bottom-0 top-5 right-0 flex items-center px-3 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>

                        <div className="relative">
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Materi / Pertemuan</label>
                          <select 
                            value={jadwal.pembId}
                            onChange={(e) => {
                              setJadwalConfig(prev => {
                                const newWeeks = {...prev.weeks};
                                newWeeks[editWeek][dayIdx] = { ...jadwal, pembId: e.target.value };
                                return { ...prev, weeks: newWeeks };
                              });
                            }}
                            className="w-full px-4 py-2.5 bg-gray-50 hover:bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 appearance-none cursor-pointer transition-colors"
                            disabled={!jadwal.mkId}
                          >
                            <option value="">-- Pilih Materi --</option>
                            {mkOptions?.pembelajaran.map(p => (
                              <option key={p.id} value={p.id}>{p.judul}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute bottom-0 top-5 right-0 flex items-center px-3 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Dosen Pengampu</label>
                          <input 
                            type="text"
                            value={jadwal.dosen}
                            onChange={(e) => {
                              setJadwalConfig(prev => {
                                const newWeeks = {...prev.weeks};
                                newWeeks[editWeek][dayIdx] = { ...jadwal, dosen: e.target.value };
                                return { ...prev, weeks: newWeeks };
                              });
                            }}
                            placeholder="Nama Dosen..."
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-colors placeholder-gray-300"
                            disabled={!jadwal.mkId}
                          />
                        </div>
                      </div>
                    </div>
                  )
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
                  onClick={() => setUsersList(prev => [{ uid: '', name: '', role: 'Mahasiswa', nrp: '', jurusan: '' }, ...prev])}
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
                {usersList.map((user, idx) => (
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
                        <div>
                          <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">NIP</label>
                          <input type="text" value={user.nip || ''} onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, nip: e.target.value } : u))} className="w-full px-4 py-2 bg-blue-50/30 border border-blue-100 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan NIP..." />
                        </div>
                      )}

                      {user.role === 'Tamu' && (
                        <div>
                          <label className="block text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Asal Instansi / Keterangan</label>
                          <input type="text" value={user.instansi || ''} onChange={(e) => setUsersList(prev => prev.map((u, i) => i === idx ? { ...u, instansi: e.target.value } : u))} className="w-full px-4 py-2 bg-orange-50/30 border border-orange-100 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Perusahaan / Instansi..." />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Footer */}
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

        </div>
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
