const fs = require('fs');
const file = 'app/admin/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Fix handleSave upload logic for MK
const handleSaveUploadsRegex = /\/\/\s*Process uploads[\s\S]*?mk\.pembelajaran = updatedPembelajaran;\s*updatedMataKuliahList\[i\] = mk;\s*\}/;
const newUploadsLogic = `// Process uploads for MataKuliah
      for (let i = 0; i < updatedMataKuliahList.length; i++) {
        let mk = { ...updatedMataKuliahList[i] };
        if (mk.videoType === 'upload' && mk.fileObj) {
          const fileName = \`videos/\${Date.now()}_\${mk.fileObj.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}\`;
          const { error: uploadError } = await supabase.storage
            .from('rfid-assets')
            .upload(fileName, mk.fileObj, { cacheControl: '3600', upsert: true });
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from('rfid-assets').getPublicUrl(fileName);
          mk.videoUrl = publicUrlData.publicUrl;
          delete mk.fileObj;
        }
        updatedMataKuliahList[i] = mk;
      }`;
code = code.replace(handleSaveUploadsRegex, newUploadsLogic);

// 2. Remove old unused functions completely
code = code.replace(/const updatePembelajaran[\s\S]*?const hapusMataKuliah/, 'const hapusMataKuliah');

// 3. Fix tambahMataKuliah which might have been broken/duplicate
code = code.replace(/const tambahMataKuliah = \(\) => \{[\s\S]*?\}\];\n    \}\);\n  \};/, `const tambahMataKuliah = () => {
    const newId = 'mk' + Date.now();
    setMataKuliahList(prev => [...prev, { id: newId, nama: 'Mata Kuliah Baru', videoType: 'youtube', videoUrl: '' }]);
    setActiveMkId(newId);
  };`);
  
// Also in case it wasn't caught by the first regex because of the return type:
code = code.replace(/const tambahMataKuliah = \(\) => \{\n    const newId = `mk\$\{Date.now\(\)\}`;\n    setMataKuliahList\(prev => \[\.\.\.prev, \{ id: newId, nama: 'Mata Kuliah Baru', pembelajaran: \[\] \}\]\);\n    setActiveMkId\(newId\);\n  \};/, `const tambahMataKuliah = () => {
    const newId = 'mk' + Date.now();
    setMataKuliahList(prev => [...prev, { id: newId, nama: 'Mata Kuliah Baru', videoType: 'youtube', videoUrl: '' }]);
    setActiveMkId(newId);
  };`);

fs.writeFileSync(file, code);
