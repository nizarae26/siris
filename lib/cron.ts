import cron from 'node-cron';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';

const rekapDir = path.join(process.cwd(), 'rekap_bulanan');

// Ensure directory exists
if (!fs.existsSync(rekapDir)) {
  fs.mkdirSync(rekapDir, { recursive: true });
}

// Global flag to prevent multiple cron instances during hot-reloads
const globalForCron = globalThis as unknown as { cronInitialized?: boolean };

export function initCronJobs() {
  if (globalForCron.cronInitialized) return;
  globalForCron.cronInitialized = true;

  console.log('✅ Background Cron Job Initialized: Rekap Bulanan');

  // Jadwal: Berjalan setiap tanggal 1 jam 00:00 (Awal Bulan)
  // '0 0 1 * *' = Menit 0, Jam 0, Tanggal 1, Tiap Bulan, Tiap Hari
  cron.schedule('0 0 1 * *', async () => {
    try {
      console.log('Memulai proses Rekap Bulanan & Penghapusan Otomatis...');
      
      // 1. Ambil semua data dari scan_logs di Supabase
      const { data: logs, error: fetchError } = await supabase
        .from('scan_logs')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (fetchError) throw fetchError;
      
      if (!logs || logs.length === 0) {
        console.log('Tidak ada data bulan ini untuk direkap.');
        return;
      }

      // 2. Buat file Excel baru
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Riwayat Scan');

      // Tentukan kolom Excel
      sheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Waktu (WIB)', key: 'waktu', width: 25 },
        { header: 'UID Kartu', key: 'uid', width: 20 },
        { header: 'Nama', key: 'name', width: 30 },
        { header: 'Role / Status', key: 'role', width: 20 },
        { header: 'Status Akses', key: 'status', width: 15 }
      ];

      // Masukkan baris data
      logs.forEach((log, index) => {
        sheet.addRow({
          no: index + 1,
          waktu: new Date(log.created_at).toLocaleString('id-ID'),
          uid: log.uid,
          name: log.name,
          role: log.role,
          status: log.status
        });
      });

      // 3. Simpan ke folder laptop lokal (rekap_bulanan)
      const dateStr = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
      const fileName = `Rekap_Scan_${dateStr}.xlsx`;
      const filePath = path.join(rekapDir, fileName);
      
      await workbook.xlsx.writeFile(filePath);
      console.log(`✅ File Excel berhasil disimpan: ${filePath}`);

      // 4. Hapus semua data yang sudah diexport dari database
      // Kita menghapus berdasarkan id yang ada di array
      const idsToDelete = logs.map(l => l.id);
      
      // Supabase tidak bisa menghapus array sangat besar sekaligus jika ribuan baris,
      // Tapi untuk skala kecil-menengah ini aman. Jika error, gunakan filter in.
      const { error: deleteError } = await supabase
        .from('scan_logs')
        .delete()
        .in('id', idsToDelete);
        
      if (deleteError) throw deleteError;
      
      console.log(`✅ ${idsToDelete.length} riwayat scan berhasil dihapus dari Database.`);

    } catch (error) {
      console.error('❌ Gagal menjalankan Rekap Bulanan:', error);
    }
  });
}
