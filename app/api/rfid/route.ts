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

const globalForSerial = globalThis as unknown as { 
  serialEmitter?: EventEmitter;
  serialPortInitialized?: boolean;
  hardwareStatus?: string;
  hardwareError?: string | null;
};

const serialEmitter = globalForSerial.serialEmitter || new EventEmitter();
if (!globalForSerial.serialEmitter) {
  globalForSerial.serialEmitter = serialEmitter;
  globalForSerial.hardwareStatus = 'Disconnected';
  globalForSerial.hardwareError = null;
}

// Helper to process the UID logic and broadcast to connected clients
async function processScan(uid: string) {
  // Ambil pengaturan terbaru dari Supabase (diurutkan dari yang paling baru karena upsert bisa membuat row ganda jika PK belum diset)
  // Tambahkan .lt('id', 1000 + Date.now()) untuk menipu Next.js cache agar tidak menyimpan respon secara global!
  const ts = 1000 + Date.now();
  const { data: mkRows } = await supabase.from('settings').select('data').eq('id', 1).lt('id', ts).order('created_at', { ascending: false }).limit(1);
  const { data: tamuRows } = await supabase.from('settings').select('data').eq('id', 2).lt('id', ts).order('created_at', { ascending: false }).limit(1);
  const { data: jadwalRows } = await supabase.from('settings').select('data').eq('id', 3).lt('id', ts).order('created_at', { ascending: false }).limit(1);
  const { data: usersRows } = await supabase.from('settings').select('data').eq('id', 4).lt('id', ts).order('created_at', { ascending: false }).limit(1);

  const mkData = mkRows?.[0];
  const tamuData = tamuRows?.[0];
  const jadwalData = jadwalRows?.[0];
  const usersData = usersRows?.[0];

  const registeredUsers = usersData?.data || mockUsers;
  
  // Bersihkan UID dari spasi, strip, atau titik dua agar kebal dari kesalahan ketik
  const cleanIncomingUid = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  console.log(`[DEBUG] Incoming UID: ${cleanIncomingUid}`);
  console.log(`[DEBUG] registeredUsers total: ${registeredUsers.length}`);
  if (registeredUsers.length > 0) {
    console.log(`[DEBUG] First registered user UID: ${registeredUsers[0].uid}`);
  }

  const user = registeredUsers.find((u: any) => {
    const cleanDbUid = (u.uid || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleanDbUid === cleanIncomingUid;
  });

  if (user) {
    console.log(`[DEBUG] USER MATCHED! Name: ${user.name}`);
  } else {
    console.log(`[DEBUG] USER NOT MATCHED! Falling back to Tamu.`);
  }
  
  let result;

  if (user) {
    const content = { ...roleContent[user.role as Role] };
    
    // Sesuaikan pesan "Selamat datang" dengan nama asli dari database
    if (user.role === 'Dosen') {
      content.info = `Selamat datang, ${user.name}. Berikut adalah video pembelajaran untuk sesi hari ini:`;
    } else if (user.role === 'Mahasiswa') {
      content.info = `Selamat datang, ${user.name}. Pastikan untuk mengisi daftar hadir dan mengikuti modul praktikum.`;
    }
    
    // Data jadwal lama sudah tidak menggunakan minggu, langsung menggunakan semesterSchedule
    // Tentukan hari ini (Capitalized: Senin, Selasa...)
    const hariIndex = new Date().getDay(); 
    const hariMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const namaHari = hariMap[hariIndex];
    
    // Ambil jadwal semester
    const semesterSchedule = jadwalData?.data?.semesterSchedule || [];
    
    if (user.role === 'Dosen') {
      content.title = `Portal Dosen: ${user.name}`;
      content.info = 'Jadwal Mengajar Anda Semester Ini';
      
      // Ambil SEMUA jadwal dosen ini (semua hari)
      const jadwalDosen = semesterSchedule.filter((j: any) => j.dosen === user.name);
      
      // Get unique MK IDs taught by this dosen
      const uniqueMkIds = [...new Set(jadwalDosen.map((j: any) => j.mkId))];
      if (uniqueMkIds.length > 0 && mkData?.data) {
        // Randomly pick one MK
        const randomMkId = uniqueMkIds[Math.floor(Math.random() * uniqueMkIds.length)];
        const randomMk = mkData.data.find((m: any) => m.id === randomMkId);
        if (randomMk && randomMk.videoUrl) {
          content.mediaUrl = randomMk.videoUrl;
          content.mediaType = 'video';
        } else {
          content.mediaUrl = '';
          content.mediaType = 'none';
        }
      } else {
        content.mediaUrl = '';
        content.mediaType = 'none';
      }
      
      // Kirim jadwal penuh melalui field dosenSchedule
      content.dosenSchedule = jadwalDosen.map((j: any) => {
        const mk = mkData?.data?.find((m: any) => m.id === j.mkId);
        return {
          ...j,
          namaMk: mk ? mk.nama : 'Mata Kuliah Tidak Diketahui'
        };
      });
      
      // Hapus labInfo agar UI bisa merender tabel khusus
      delete content.labInfo;

    } else if (user.role === 'Mahasiswa') {
      // Cari jadwal HARI INI yang sesuai dengan jam sekarang? 
      // Atau sekedar jadwal pertama hari ini?
      const jadwalHariIni = semesterSchedule.filter((j: any) => j.hari === namaHari);
      const jadwalAktif = jadwalHariIni[0]; // Ambil sesi pertama (sementara)

      if (jadwalAktif && mkData?.data) {
        const activeMk = mkData.data.find((mk: any) => mk.id === jadwalAktif.mkId);
        if (activeMk) {
          // Cari video profil dosen yang mengajar
          const dosenUser = registeredUsers.find((u: any) => u.role === 'Dosen' && u.name === jadwalAktif.dosen);
          
          if (dosenUser && dosenUser.videoUrl) {
            content.mediaUrl = dosenUser.videoUrl;
            content.mediaType = 'video';
          } else {
            content.mediaUrl = '';
            content.mediaType = 'none';
          }
          
          content.title = activeMk.nama;
          content.info = `Sesi Aktif: ${jadwalAktif.waktuMulai} - ${jadwalAktif.waktuSelesai}`;
          
          content.labInfo = {
            room: jadwalAktif.ruangan || 'Online',
            dosenPresent: [jadwalAktif.dosen || 'Dosen Pengampu']
          };
        }
      } else {
        // Fallback jika tidak ada jadwal aktif
        content.mediaType = 'none';
        content.info = 'Tidak ada jadwal aktif untuk saat ini';
        content.labInfo = { room: 'Ruang Mandiri', dosenPresent: ['Tidak ada jadwal aktif'] };
      }
    } else if (user.role === 'Tamu') {
      content.info = `Selamat datang, ${user.name}. Berikut adalah informasi profil instansi kami:`;
      if (tamuData?.data?.videoUrl) {
        content.mediaUrl = tamuData.data.videoUrl;
        content.mediaType = 'video';
      }
    }

    addLog({ uid, name: user.name, role: user.role, status: 'SUCCESS' });
    result = { user, content, logs: getLogs() };
    
    // Save to Supabase (Background)
    supabase.from('scan_logs').insert({ uid, name: user.name, role: user.role, status: 'SUCCESS' }).then();
  } else {
    const tamuRole: Role = 'Tamu';
    const content = { ...roleContent[tamuRole] };
    
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
    const comPort = process.env.RFID_COM_PORT || 'COM13';
    globalForSerial.hardwareStatus = `Connecting to ${comPort}...`;
    
    const port = new SerialPort({ path: comPort, baudRate: 115200 }, (err) => {
      if (err) {
        console.warn(`⚠️ SerialPort Error on ${comPort}:`, err.message);
        globalForSerial.hardwareStatus = 'COM Port Error';
        globalForSerial.hardwareError = err.message;
        return;
      }
      console.log(`✅ SerialPort connected on ${comPort} (Mode: RAW UART PN532)`);
      globalForSerial.hardwareStatus = 'Port Connected, Waking PN532...';

      // 1. Wake Up PN532 & Get Firmware Version
      const wakeup = Buffer.from([
        0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0xFF, 0x03, 0xFD, 0xD4, 0x14, 0x01, 0x17, 0x00
      ]);
      port.write(wakeup);

      setTimeout(() => {
        globalForSerial.hardwareStatus = 'Ready';
        globalForSerial.hardwareError = null;
        console.log('✅ PN532 is Ready! Starting poll loop...');
        
        // Polling Command: InListPassiveTarget (Baca Kartu)
        const readCmd = Buffer.from([
          0x00, 0x00, 0xFF, 0x04, 0xFC, 0xD4, 0x4A, 0x01, 0x00, 0xE1, 0x00
        ]);

        setInterval(() => {
          if (port.isOpen) {
            port.write(readCmd);
          }
        }, 500); // Polling setiap 500ms
      }, 1000);
    });

    let buffer = Buffer.alloc(0);
    let lastReadTime = 0;

    port.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      
      // Batasi ukuran buffer agar tidak bocor memorinya
      if (buffer.length > 1024) {
        buffer = buffer.slice(buffer.length - 1024);
      }

      // Cari pola jawaban InListPassiveTarget: D5 4B 01 01 (Sukses baca 1 kartu)
      const pattern = Buffer.from([0xD5, 0x4B, 0x01, 0x01]);
      const idx = buffer.indexOf(pattern);

      if (idx !== -1 && buffer.length >= idx + 9) {
        // Kartu terdeteksi!
        const uidLength = buffer[idx + 7];
        
        if (buffer.length >= idx + 8 + uidLength) {
          const uidBuf = buffer.slice(idx + 8, idx + 8 + uidLength);
          const uidHex = uidBuf.toString('hex').toUpperCase();
          
          // Bersihkan buffer agar tidak terbaca berulang
          buffer = Buffer.alloc(0);

          // Beri jeda 2 detik (debounce) sebelum baca kartu yang sama lagi
          const now = Date.now();
          if (now - lastReadTime > 2000) {
            lastReadTime = now;
            console.log(`[RAW PN532 Scan] Kartu Ditemukan! UID: ${uidHex}`);
            processScan(uidHex);
          }
        }
      }
    });

    port.on('error', (err: any) => {
      globalForSerial.hardwareStatus = 'Serial Error';
      globalForSerial.hardwareError = err.message;
    });

  } catch (error: any) {
    console.warn('⚠️ Failed to initialize RAW PN532:', error);
    globalForSerial.hardwareStatus = 'Initialization Failed';
    globalForSerial.hardwareError = String(error);
  }
}

// Next.js API Route Handler
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  const action = searchParams.get('action');
  
  if (action === 'status') {
    return NextResponse.json({
      status: globalForSerial.hardwareStatus || 'Unknown',
      error: globalForSerial.hardwareError || null
    });
  }
  
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
