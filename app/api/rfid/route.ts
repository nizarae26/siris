import { NextResponse } from 'next/server';
import { mockUsers, addLog, getLogs, Content, Role } from './database';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';
import { supabase } from '../../../lib/supabase';
import { initCronJobs } from '../../../lib/cron';

export const dynamic = 'force-dynamic';

const roleContent: Record<Role, Content> = {
  Dosen: {
    title: 'Dashboard Dosen',
    info: 'Selamat datang, Dr. Budi. Berikut adalah video praktikum untuk sesi hari ini:',
    widgets: ['Jadwal Kuliah', 'Daftar Hadir Mahasiswa', 'Notifikasi Jurusan'],
    mediaType: 'video',
    mediaUrl: 'https://www.youtube.com/embed/EngW7tLk6R8' // Generic programming video placeholder
  },
  Mahasiswa: {
    title: 'Dashboard Mahasiswa',
    info: 'Selamat datang, Andi. Pastikan untuk mengisi daftar hadir dan mengikuti modul.',
    widgets: ['Jadwal Kuliah', 'Nilai Semester', 'Pengumuman BEM'],
    mediaType: 'none',
    labInfo: {
      room: 'JJ-305',
      dosenPresent: ['Dr. Budi', 'Ir. Rina, M.T.']
    }
  },
  Tamu: {
    title: 'Portal Tamu',
    info: 'Selamat datang di area kampus. Berikut adalah video profil Politeknik Elektronika Negeri Surabaya (PENS):',
    widgets: ['Peta Kampus', 'Direktori Dosen', 'Informasi Umum'],
    mediaType: 'video',
    mediaUrl: 'https://www.youtube.com/embed/5_zZ0n0-TDI' // PENS profil placeholder
  }
};

// Next.js hot-reloading can cause multiple instances of SerialPort and EventEmitters.
const globalForSerial = globalThis as unknown as { 
  serialEmitter?: EventEmitter;
  serialPortInitialized?: boolean;
};

const serialEmitter = globalForSerial.serialEmitter || new EventEmitter();
if (!globalForSerial.serialEmitter) {
  globalForSerial.serialEmitter = serialEmitter;
}

// Helper to process the UID logic and broadcast to connected clients
async function processScan(uid: string) {
  // Ambil pengaturan terbaru dari Supabase
  const { data: mkData } = await supabase.from('settings').select('data').eq('id', 1).single();
  const { data: tamuData } = await supabase.from('settings').select('data').eq('id', 2).single();
  const { data: jadwalData } = await supabase.from('settings').select('data').eq('id', 3).single();
  const { data: usersData } = await supabase.from('settings').select('data').eq('id', 4).single();

  const registeredUsers = usersData?.data || mockUsers;
  const user = registeredUsers.find((u: any) => u.uid === uid);
  let result;

  if (user) {
    let content = { ...roleContent[user.role as Role] };
    
    // Hitung minggu berjalan (1-16)
    let activeWeek = 1;
    if (jadwalData?.data?.manualWeekOverride) {
      activeWeek = jadwalData.data.manualWeekOverride;
    } else if (jadwalData?.data?.startDate) {
      // Perhitungan otomatis berdasarkan tanggal mulai
      const start = new Date(jadwalData.data.startDate);
      const now = new Date();
      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      activeWeek = Math.floor(diffDays / 7) + 1;
      if (activeWeek < 1) activeWeek = 1;
      if (activeWeek > 16) activeWeek = 16;
    }
    
    // Tentukan hari ini
    const hariIndex = new Date().getDay(); // 0 = Minggu, 1 = Senin, ...
    const namaHari = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'][hariIndex];
    
    // Cari jadwal hari ini pada minggu aktif
    const jadwalMingguIni = jadwalData?.data?.weeks?.[activeWeek] || [];
    const jadwalHariIni = jadwalMingguIni.find((j: any) => j.id === namaHari);
    
    if ((user.role === 'Dosen' || user.role === 'Mahasiswa') && jadwalHariIni && mkData?.data) {
      const activeMk = mkData.data.find((mk: any) => mk.id === jadwalHariIni.mkId);
      if (activeMk) {
        const activePemb = activeMk.pembelajaran.find((p: any) => p.id === jadwalHariIni.pembId);
        if (activePemb?.videoUrl) {
          content.mediaUrl = activePemb.videoUrl;
          content.mediaType = 'video';
          content.title = activeMk.nama;
          content.info = `Materi: ${activePemb.judul}`;
          if (user.role === 'Mahasiswa') {
             content.labInfo = { room: 'Lab Utama', dosenPresent: [jadwalHariIni.dosen || 'Dosen Pengampu'] };
          }
        }
      }
    } else if ((user.role === 'Dosen' || user.role === 'Mahasiswa') && mkData?.data?.[0]?.pembelajaran?.[0]?.videoUrl) {
      // Fallback jika tidak ada jadwal hari ini
      content.mediaUrl = mkData.data[0].pembelajaran[0].videoUrl;
      content.mediaType = 'video';
      content.info = 'Materi Default (Tidak ada jadwal aktif hari ini)';
    }

    addLog({ uid, name: user.name, role: user.role, status: 'SUCCESS' });
    result = { user, content, logs: getLogs() };
    
    // Save to Supabase (Background)
    supabase.from('scan_logs').insert({ uid, name: user.name, role: user.role, status: 'SUCCESS' }).then();
  } else {
    const tamuRole: Role = 'Tamu';
    let content = { ...roleContent[tamuRole] };
    
    // Gunakan video tamu dari admin
    if (tamuData?.data?.videoUrl) {
      content.mediaUrl = tamuData.data.videoUrl;
    }

    addLog({ uid, name: 'Unknown', role: tamuRole, status: 'FAILED' });
    result = { user: { uid, name: 'Unknown', role: tamuRole }, content, logs: getLogs() };
    
    // Save to Supabase (Background)
    supabase.from('scan_logs').insert({ uid, name: 'Unknown', role: tamuRole, status: 'FAILED' }).then();
  }
  
  // Emit event to all SSE listeners
  serialEmitter.emit('scan', result);
  return result;
}

if (!globalForSerial.serialPortInitialized) {
  globalForSerial.serialPortInitialized = true;
  
  // Initialize Background Cron Jobs
  initCronJobs();
  
  try {
    const port = new SerialPort({ path: 'COM3', baudRate: 9600 }, (err) => {
      if (err) {
        console.warn('⚠️ SerialPort Error (Hardware disconnected?):', err.message);
      } else {
        console.log('✅ SerialPort connected on COM3');
      }
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    parser.on('data', (data: string) => {
      const uid = data.trim();
      if (uid) {
        console.log(`[RFID Scan] Received UID: ${uid}`);
        processScan(uid);
      }
    });
  } catch (error) {
    console.warn('⚠️ Failed to initialize SerialPort:', error);
  }
}

// Next.js API Route Handler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  
  const acceptHeader = request.headers.get('accept');

  // SSE (Server-Sent Events) for real-time push to frontend
  if (acceptHeader?.includes('text/event-stream')) {
    const customReadable = new ReadableStream({
      start(controller) {
        const onScan = (data: any) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        };
        
        serialEmitter.on('scan', onScan);

        const heartbeat = setInterval(() => {
          controller.enqueue(': heartbeat\n\n');
        }, 15000);

        request.signal.addEventListener('abort', () => {
          serialEmitter.off('scan', onScan);
          clearInterval(heartbeat);
        });
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }

  // Traditional GET for Simulation Buttons
  if (!uid) {
    return NextResponse.json({ error: 'UID is required' }, { status: 400 });
  }

  const result = await processScan(uid);
  return NextResponse.json(result);
}
