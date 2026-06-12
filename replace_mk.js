const fs = require('fs');
const file = 'app/admin/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Delete Pembelajaran interface and update MataKuliah
code = code.replace(/interface Pembelajaran \{[\s\S]*?\}\s*interface MataKuliah \{[\s\S]*?\}/, `interface MataKuliah {
  id: string;
  nama: string;
  videoType: VideoType;
  videoUrl: string;
  fileName?: string;
  fileObj?: File;
}`);

// 2. Update initial mataKuliahList
code = code.replace(/const \[mataKuliahList, setMataKuliahList\] = useState<MataKuliah\[\]>\(\[[\s\S]*?\]\);/, `const [mataKuliahList, setMataKuliahList] = useState<MataKuliah[]>([
    {
      id: 'mk1',
      nama: 'Komunikasi Data',
      videoType: 'youtube',
      videoUrl: 'https://www.youtube.com/embed/EngW7tLk6R8',
    }
  ]);`);

// 3. Remove tambahPembelajaran, hapusPembelajaran, updatePembelajaran, handleFileUpload
code = code.replace(/const tambahPembelajaran = \([\s\S]*?\}\s*const hapusPembelajaran = async \([\s\S]*?\}\s*const updatePembelajaran = \([\s\S]*?\}\s*const handleFileUpload = \([\s\S]*?\}\s*(?=const hapusMataKuliah)/, '');

// 4. Update tambahMataKuliah to not include pembelajaran
code = code.replace(/const tambahMataKuliah = \(\) => \{[\s\S]*?\}\];\n    \}\);\n  \};/, `const tambahMataKuliah = () => {
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
  };`);

// 5. Replace MataKuliah Tab JSX
const mkTabRegex = /<div className="space-y-6">[\s\S]*?<\/div>\s*<\/>\s*\)\}\s*<\/div>\s*\)\}/;
const newMkJSX = `                  <div className="border border-gray-100 bg-gray-50/50 rounded-2xl p-5 shadow-sm">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">Sumber Video Mata Kuliah</label>
                          <div className="flex gap-2 mb-4 p-1 bg-gray-200/50 rounded-lg w-max">
                            <button 
                              onClick={() => {
                                setMataKuliahList(prev => prev.map(m => m.id === activeMk.id ? {...m, videoType: 'youtube'} : m));
                              }}
                              className={\`px-4 py-1.5 text-sm font-semibold rounded-md transition-all \${activeMk.videoType === 'youtube' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}\`}
                            >
                              YouTube Link
                            </button>
                            <button 
                              onClick={() => {
                                setMataKuliahList(prev => prev.map(m => m.id === activeMk.id ? {...m, videoType: 'upload'} : m));
                              }}
                              className={\`px-4 py-1.5 text-sm font-semibold rounded-md transition-all \${activeMk.videoType === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}\`}
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
          )}`;
code = code.replace(mkTabRegex, newMkJSX);

// Now handle the "Tambah Jadwal" button in the "Jadwal" tab!
const tambahJadwalRegex = /<button \s*onClick=\{\(\) => \{\s*setJadwalConfig\(prev => \(\{[\s\S]*?\}\)\)\s*\}\}\s*className="bg-indigo-600[\s\S]*?Tambah Jadwal\s*<\/button>/;
const newTambahJadwalBtn = `<button 
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
                    });
                    
                    if (hari) {
                      setJadwalConfig(prev => ({
                        ...prev,
                        semesterSchedule: [
                          ...(prev.semesterSchedule || []), 
                          { id: Date.now().toString(), hari: hari, waktuMulai: '08:00', waktuSelesai: '10:00', mkId: '', dosen: '', ruangan: 'Lab Online', kelas: 'A' }
                        ]
                      }));
                    }
                  }}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  Tambah Jadwal
                </button>`;
code = code.replace(tambahJadwalRegex, newTambahJadwalBtn);

fs.writeFileSync(file, code);
