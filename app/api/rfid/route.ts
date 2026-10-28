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

  activePort?: SerialPort | null;
  hardwareStatus?: string;
  hardwareError?: string | null;
  sendReadCommand?: () => void;
  cronInitialized?: boolean;
  keepAliveInitialized?: boolean;
  settingsCache?: SettingsCache;
};

const serialEmitter = globalForSerial.serialEmitter || new EventEmitter();
if (!globalForSerial.serialEmitter) {
  globalForSerial.serialEmitter = serialEmitter;
  globalForSerial.hardwareStatus = 'Disconnected';
  globalForSerial.hardwareError = null;
}

// In-memory cache untuk settings Supabase agar pembacaan kartu instant (<10ms)
interface SettingsCache {
  mkData?: any;
  tamuData?: any;
  jadwalData?: any;
  usersData?: any;
  mahasiswaData?: any;
  timestamp: number;
}

// Fungsi query Supabase dengan proteksi timeout 3 detik agar tidak pernah blocking
async function fetchSettingsFromSupabase(): Promise<SettingsCache> {
  const now = Date.now();
  try {
    const queryPromise = supabase
      .from('settings')
      .select('id, data, created_at')
      .in('id', [1, 2, 3, 4, 5])
      .order('created_at', { ascending: false });

    // Timeout guard 3 detik untuk mencegah hang retransmisi TCP
    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error('Supabase fetch timeout (3s limit)') }), 3000)
    );

    const { data: rows, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error || !rows) {
      if (globalForSerial.settingsCache) return globalForSerial.settingsCache;
      return { timestamp: now };
    }

    const findLatest = (id: number) => rows.find((r: any) => r.id === id);

    const newCache: SettingsCache = {
      mkData: findLatest(1),
      tamuData: findLatest(2),
      jadwalData: findLatest(3),
      usersData: findLatest(4),
      mahasiswaData: findLatest(5),
      timestamp: now
    };

    globalForSerial.settingsCache = newCache;
    return newCache;
  } catch (err: any) {
    if (globalForSerial.settingsCache) return globalForSerial.settingsCache;
    return { timestamp: now };
  }
}

// Background Keep-Alive: Ping & Segarkan Cache setiap 35 detik
// Mencegah cloud NAT/firewall memutus koneksi TCP (Cold Socket) saat sistem idle
if (!globalForSerial.keepAliveInitialized) {
  globalForSerial.keepAliveInitialized = true;
  // Pemanasan pertama kali
  fetchSettingsFromSupabase().then(() => {
    console.log('✅ [Supabase Keep-Alive] Initial cache warmed up!');
  });

  setInterval(() => {
    fetchSettingsFromSupabase().catch(() => {});
  }, 35000);
}

async function getLatestSettings(): Promise<SettingsCache> {
  const now = Date.now();
  // Jika cache sudah ada di memori dan berumur kurang dari 40 detik, langsung return instan (0ms)
  if (globalForSerial.settingsCache && (now - globalForSerial.settingsCache.timestamp < 40000)) {
    return globalForSerial.settingsCache;
  }

  // Jika cache belum ada atau kadaluarsa, ambil dan perbarui
  return await fetchSettingsFromSupabase();
}

// Helper to process the UID logic and broadcast to connected clients
async function processScan(uid: string) {
  const { mkData, tamuData, jadwalData, usersData, mahasiswaData } = await getLatestSettings();

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
          if (mahasiswaData?.data?.videoUrl) {
            content.mediaUrl = mahasiswaData.data.videoUrl;
            content.mediaType = 'video';
          } else {
            content.mediaUrl = '';
            content.mediaType = 'none';
          }
          
          content.title = `Portal Mahasiswa: ${user.name}`;
          content.info = '';
          
          content.labInfo = {
            room: jadwalAktif.ruangan || 'Online',
            dosenPresent: [jadwalAktif.dosen || 'Dosen Pengampu']
          };
        }
      } else {
        // Fallback jika tidak ada jadwal aktif
        content.title = `Portal Mahasiswa: ${user.name}`;
        content.mediaType = 'none';
        content.info = '';
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

if (!(globalForSerial as any).cronInitialized) {
  (globalForSerial as any).cronInitialized = true;
  // Initialize Background Cron Jobs
  initCronJobs();
}

let isOpeningPort = false;
let lastOpenAttempt = 0;

function initSerialPort() {
  const now = Date.now();
  if (isOpeningPort) return;
  if (now - lastOpenAttempt < 2000) return;
  lastOpenAttempt = now;
  isOpeningPort = true;

  try {
    const comPort = process.env.RFID_COM_PORT || 'COM3';
    globalForSerial.hardwareStatus = `Connecting to ${comPort}...`;

    const openConnection = () => {
      const port = new SerialPort({ path: comPort, baudRate: 115200 }, (err) => {
        isOpeningPort = false;
        if (err) {
          console.warn(`⚠️ SerialPort Error on ${comPort}:`, err.message);
          globalForSerial.hardwareStatus = 'COM Port Error';
          globalForSerial.hardwareError = err.message;
          globalForSerial.serialPortInitialized = false;
          return;
        }
        globalForSerial.activePort = port;
        globalForSerial.serialPortInitialized = true;
        console.log(`✅ SerialPort connected on ${comPort} (Mode: RAW UART PN532)`);
        globalForSerial.hardwareStatus = 'Port Connected, Initializing PN532...';

        // 1. Wake Up PN532 & SAMConfiguration
        const wakeup = Buffer.from([
          0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0xFF, 0x03, 0xFD, 0xD4, 0x14, 0x01, 0x17, 0x00
        ]);
        port.write(wakeup);

        setTimeout(() => {
          globalForSerial.hardwareStatus = 'Ready';
          globalForSerial.hardwareError = null;
          console.log('✅ PN532 is Ready! Starting continuous polling loop...');
          sendReadCommand();
        }, 1000);
      });

      // InListPassiveTarget Command (Mencari 1 Kartu ISO14443A)
      const readCmd = Buffer.from([
        0x00, 0x00, 0xFF, 0x04, 0xFC, 0xD4, 0x4A, 0x01, 0x00, 0xE1, 0x00
      ]);

      let buffer = Buffer.alloc(0);
      let lastReadTime = 0;
      let lastUid = '';
      let readTimer: NodeJS.Timeout | null = null;
      let watchdogTimer: NodeJS.Timeout | null = null;

      const scheduleNextRead = (delayMs: number = 50) => {
        if (readTimer) clearTimeout(readTimer);
        readTimer = setTimeout(() => {
          sendReadCommand();
        }, delayMs);
      };

      const sendReadCommand = () => {
        if (!port.isOpen) return;

        // Bersihkan sisa buffer sebelum kirim perintah baru
        buffer = Buffer.alloc(0);

        port.write(readCmd, (err) => {
          if (err) {
            console.warn('⚠️ Gagal mengirim readCmd ke PN532:', err.message);
            scheduleNextRead(1000);
            return;
          }
        });

        // Watchdog: jika PN532 tidak merespon sama sekali dalam 2 detik, refresh perintah baca
        if (watchdogTimer) clearTimeout(watchdogTimer);
        watchdogTimer = setTimeout(() => {
          if (port.isOpen) {
            sendReadCommand();
          }
        }, 2000);
      };

      (globalForSerial as any).sendReadCommand = sendReadCommand;

      port.on('data', (data: Buffer) => {
        buffer = Buffer.concat([buffer, data]);
        
        // Batasi ukuran buffer agar tidak membesar
        if (buffer.length > 1024) {
          buffer = buffer.subarray(buffer.length - 512);
        }

        // 1. Cek respon berhasil membaca kartu: D5 4B 01 01
        const patternCard = Buffer.from([0xD5, 0x4B, 0x01, 0x01]);
        const cardIdx = buffer.indexOf(patternCard);

        if (cardIdx !== -1 && buffer.length >= cardIdx + 9) {
          const uidLength = buffer[cardIdx + 7];
          
          if (buffer.length >= cardIdx + 8 + uidLength) {
            const uidBuf = buffer.subarray(cardIdx + 8, cardIdx + 8 + uidLength);
            const uidHex = uidBuf.toString('hex').toUpperCase();
            
            buffer = Buffer.alloc(0);
            if (watchdogTimer) clearTimeout(watchdogTimer);

            const now = Date.now();
            const isSameCard = (uidHex === lastUid);
            const cooldown = isSameCard ? 3000 : 1000;

            if (now - lastReadTime > cooldown) {
              lastReadTime = now;
              lastUid = uidHex;
              console.log(`[RAW PN532 Scan] Kartu Ditemukan! UID: ${uidHex}`);
              processScan(uidHex);
            }
            
            // Jeda 1.2 detik setelah scan sebelum scanner aktif lagi
            scheduleNextRead(1200);
            return;
          }
        }

        // 2. Cek respon PN532 timeout / tidak ada kartu: D5 4B 00
        const patternNoCard = Buffer.from([0xD5, 0x4B, 0x00]);
        const noCardIdx = buffer.indexOf(patternNoCard);

        if (noCardIdx !== -1) {
          // PN532 telah menyelesaikan 1 siklus pencarian tanpa kartu.
          // Langsung mulai siklus pencarian berikutnya setelah jeda kecil 50ms.
          buffer = Buffer.alloc(0);
          if (watchdogTimer) clearTimeout(watchdogTimer);
          scheduleNextRead(50);
          return;
        }
      });

      port.on('error', (err: any) => {
        isOpeningPort = false;
        globalForSerial.hardwareStatus = 'Serial Error';
        globalForSerial.hardwareError = err.message;
        globalForSerial.serialPortInitialized = false;
        if (readTimer) clearTimeout(readTimer);
        if (watchdogTimer) clearTimeout(watchdogTimer);
      });

      port.on('close', () => {
        isOpeningPort = false;
        globalForSerial.hardwareStatus = 'Disconnected';
        globalForSerial.hardwareError = 'Kabel tercabut atau port tertutup';
        globalForSerial.serialPortInitialized = false;
        globalForSerial.activePort = null;
        if (readTimer) clearTimeout(readTimer);
        if (watchdogTimer) clearTimeout(watchdogTimer);
      });
    };

    if (globalForSerial.activePort) {
      if (globalForSerial.activePort.isOpen) {
        globalForSerial.activePort.close(() => {
          setTimeout(openConnection, 400);
        });
        return;
      }
    }
    
    openConnection();

  } catch (error: any) {
    isOpeningPort = false;
    console.warn('⚠️ Failed to initialize RAW PN532:', error);
    globalForSerial.hardwareStatus = 'Initialization Failed';
    globalForSerial.hardwareError = String(error);
    globalForSerial.serialPortInitialized = false;
  }
}

// Jalankan inisialisasi awal
initSerialPort();

// Next.js API Route Handler
export async function GET(request: Request) {
  // Coba inisialisasi ulang jika terputus (saat di-poll oleh halaman diagnostics)
  if (!globalForSerial.serialPortInitialized) {
    initSerialPort();
  }

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
