const fs = require('fs');

const path = 'app/admin/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state hooks for Riwayat
const stateHookPos = content.indexOf('const [isSaving, setIsSaving] = useState(false);');
const stateHooks = `
  // Riwayat State
  const [riwayatData, setRiwayatData] = useState<any[]>([]);
  const [riwayatMonth, setRiwayatMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

`;
content = content.slice(0, stateHookPos) + stateHooks + content.slice(stateHookPos);

// 2. Add useEffect for Riwayat
const useEffectPos = content.indexOf('useEffect(() => {', content.indexOf('const fileInputRef'));
const riwayatUseEffect = `
  useEffect(() => {
    if (activeTab === 'riwayat') {
      const fetchRiwayat = async () => {
        setLoadingRiwayat(true);
        try {
          const startOfMonth = new Date(\`\${riwayatMonth}-01T00:00:00.000Z\`).toISOString();
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

`;
content = content.slice(0, useEffectPos) + riwayatUseEffect + content.slice(useEffectPos);

// 3. Add Sidebar Button
const sidebarPos = content.indexOf('<button \n            onClick={() => setActiveTab(\'users\')}');
const sidebarButton = `
          <button 
            onClick={() => setActiveTab('riwayat')}
            className={\`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all \${activeTab === 'riwayat' ? 'bg-teal-50 text-teal-700 border border-teal-100 shadow-sm' : 'text-gray-600 hover:bg-white border border-transparent'}\`}
          >
            <span className="text-lg">⏱️</span> Riwayat Tap
          </button>
`;
content = content.slice(0, sidebarPos) + sidebarButton + content.slice(sidebarPos);

// 4. Add Riwayat Tab Content
const saveFooterPos = content.indexOf('{/* Save Footer */}');
const riwayatTab = `
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
                              <span className={\`px-3 py-1 rounded-full text-xs font-bold \${
                                log.role === 'Dosen' ? 'bg-blue-100 text-blue-700' :
                                log.role === 'Mahasiswa' ? 'bg-green-100 text-green-700' :
                                log.role === 'Tamu' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }\`}>
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

`;
content = content.slice(0, saveFooterPos) + riwayatTab + content.slice(saveFooterPos);

// Wait, I should also hide the Save Button when on the Riwayat Tab because there's nothing to save!
// Find the <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
const saveFooterButtonPos = content.indexOf('<div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">');
const newSaveFooter = `{activeTab !== 'riwayat' && (\n          `;
const endSaveFooter = content.indexOf('</div>\n        </div>\n      </div>\n    </div>\n  );\n}');
content = content.slice(0, saveFooterButtonPos) + newSaveFooter + content.slice(saveFooterButtonPos, endSaveFooter) + `\n          )}\n` + content.slice(endSaveFooter);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully added Riwayat Tap feature.');
