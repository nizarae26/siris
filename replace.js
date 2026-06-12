const fs = require('fs');
const file = 'app/admin/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Update JadwalHarian interface
code = code.replace(/interface JadwalHarian \{[\s\S]*?\}/, `interface JadwalHarian {
  id: string;
  hari: string;
  waktuMulai: string;
  waktuSelesai: string;
  mkId: string;
  dosen: string;
  ruangan: string;
  kelas: string;
}`);

// 2. Update JadwalConfigData interface
code = code.replace(/interface JadwalConfigData \{[\s\S]*?\}/, `interface JadwalConfigData {
  semesterSchedule: JadwalHarian[];
}`);

// 3. Update getDefaultWeek -> getDefaultSchedule
code = code.replace(/const getDefaultWeek = \(\): JadwalHarian\[\] => \[[\s\S]*?\];/, `const getDefaultSchedule = (): JadwalHarian[] => [];`);

// 4. Find where setJadwalConfig is initialized
code = code.replace(/const \[jadwalConfig, setJadwalConfig\] = useState<JadwalConfigData>\(\{[\s\S]*?\}\);/, `const [jadwalConfig, setJadwalConfig] = useState<JadwalConfigData>({
    semesterSchedule: []
  });`);

// 5. Update data loading logic for Jadwal
code = code.replace(/setJadwalConfig\(\{\s*startDate: loadedData\.startDate \|\| [\s\S]*?\}\);/, `setJadwalConfig({ semesterSchedule: loadedData.semesterSchedule || [] });`);

// 6. Rewrite the entire Jadwal Tab JSX
const jadwalTabRegex = /\{\/\* Konfigurasi Semester \*\/\}[\s\S]*?(?=\{\/\* Users Tab \*\/\}|\{activeTab === 'users' && \()/;
const newJadwalJSX = `
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Jadwal Perkuliahan (Satu Semester)</h2>
                  <p className="text-gray-500 mt-1 text-sm">Tambahkan jadwal untuk dosen (Senin - Jumat).</p>
                </div>
                <button 
                  onClick={() => {
                    setJadwalConfig(prev => ({
                      ...prev,
                      semesterSchedule: [
                        ...(prev.semesterSchedule || []), 
                        { id: Date.now().toString(), hari: 'Senin', waktuMulai: '08:00', waktuSelesai: '10:00', mkId: '', dosen: '', ruangan: 'Lab Online', kelas: 'A' }
                      ]
                    }))
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
                            <div key={jadwal.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 relative group hover:border-indigo-200 transition-colors">
                              <div className="col-span-1">
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Hari</label>
                                <select value={jadwal.hari} onChange={e => {
                                  const newVal = e.target.value;
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.map(j => j.id === jadwal.id ? {...j, hari: newVal} : j) }));
                                }} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm">
                                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </div>
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
                                <input type="text" value={jadwal.kelas} onChange={e => {
                                  const newVal = e.target.value;
                                  setJadwalConfig(prev => ({ semesterSchedule: prev.semesterSchedule.map(j => j.id === jadwal.id ? {...j, kelas: newVal} : j) }));
                                }} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" />
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
`;
code = code.replace(jadwalTabRegex, newJadwalJSX);

// Remove editWeek state
code = code.replace(/const \[editWeek, setEditWeek\] = useState<number>\(1\);\n/, '');

fs.writeFileSync(file, code);
