import { NextResponse } from 'next/server';
import { mockUsers, addLog, getLogs, Content, Role } from './database';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';

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
function processScan(uid: string) {
  const user = mockUsers.find(u => u.uid === uid);
  let result;
  
  if (user) {
    addLog({ uid, name: user.name, role: user.role, status: 'SUCCESS' });
    result = { user, content: roleContent[user.role], logs: getLogs() };
  } else {
    const tamuRole: Role = 'Tamu';
    addLog({ uid, name: 'Unknown', role: tamuRole, status: 'FAILED' });
    result = { user: { uid, name: 'Unknown', role: tamuRole }, content: roleContent[tamuRole], logs: getLogs() };
  }
  
  // Emit event to all SSE listeners
  serialEmitter.emit('scan', result);
  return result;
}

if (!globalForSerial.serialPortInitialized) {
  globalForSerial.serialPortInitialized = true;
  
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

  const result = processScan(uid);
  return NextResponse.json(result);
}
