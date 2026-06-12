export type Role = 'Dosen' | 'Mahasiswa' | 'Tamu';
export type Status = 'SUCCESS' | 'FAILED';

export interface User {
  uid: string;
  name: string;
  role: Role;
  nip?: string;
  nrp?: string;
  jurusan?: string;
  angkatan?: string;
  instansi?: string;
}

export interface Content {
  title: string;
  info: string;
  widgets: string[];
  mediaType?: 'video' | 'image' | 'none';
  mediaUrl?: string;
  labInfo?: {
    room: string;
    dosenPresent: string[];
  };
  dosenSchedule?: any[]; // Menyimpan array jadwal dosen untuk semester ini
}

export interface ScanLog {
  id: string;
  uid: string;
  name: string;
  role: Role;
  status: Status;
  time: string;
}

export const mockUsers: User[] = [
  { 
    uid: '123', 
    name: 'Dr. Budi', 
    role: 'Dosen',
    nip: '198001012005011001'
  },
  { 
    uid: '456', 
    name: 'Andi', 
    role: 'Mahasiswa',
    nrp: '3120600001',
    jurusan: 'D4 Teknik Informatika',
    angkatan: '2020'
  },
  { 
    uid: '789', 
    name: 'Tamu PENS', 
    role: 'Tamu',
    instansi: 'Kementerian Pendidikan'
  }
];

let logs: ScanLog[] = [];

export function addLog(log: Omit<ScanLog, 'id' | 'time'>): ScanLog {
  const newLog: ScanLog = {
    ...log,
    id: Math.random().toString(36).substring(7),
    time: new Date().toISOString()
  };
  logs.unshift(newLog); // Add to beginning
  if (logs.length > 5) {
    logs.pop(); // Keep only last 5 logs
  }
  return newLog;
}

export function getLogs(): ScanLog[] {
  return logs;
}
