'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { storage, db } from '../../lib/firebase';

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

  const [activeTab, setActiveTab] = useState<'matakuliah' | 'tamu'>('matakuliah');
  const [activeMkId, setActiveMkId] = useState<string>('mk1');
  const [tamuVideoUrl, setTamuVideoUrl] = useState('https://www.youtube.com/embed/5_zZ0n0-TDI');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeMk = mataKuliahList.find(mk => mk.id === activeMkId);

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
            const storageRef = ref(storage, `videos/${Date.now()}_${pemb.fileObj.name}`);
            const snapshot = await uploadBytes(storageRef, pemb.fileObj);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            
            pemb.videoUrl = downloadUrl;
            delete pemb.fileObj; // Clean up before saving to DB
          }
          updatedPembelajaran[j] = pemb;
        }
        mk.pembelajaran = updatedPembelajaran;
        updatedMataKuliahList[i] = mk;
      }

      // Save to Firestore
      await setDoc(doc(db, 'settings', 'matakuliah'), {
        data: updatedMataKuliahList
      });

      setMataKuliahList(updatedMataKuliahList);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      alert('Gagal menyimpan data ke Firebase');
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
        <Link href="/" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
          Kembali ke Dashboard
        </Link>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Video Profil Kampus / Instansi (YouTube Embed)</label>
                <input 
                  type="text" 
                  value={tamuVideoUrl}
                  onChange={(e) => setTamuVideoUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm mb-6"
                  placeholder="https://www.youtube.com/embed/..."
                />
                <div className="aspect-video w-full md:w-3/4 max-w-2xl rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  {tamuVideoUrl ? (
                    <iframe className="w-full h-full" src={tamuVideoUrl} frameBorder="0" allowFullScreen></iframe>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Preview</div>
                  )}
                </div>
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
