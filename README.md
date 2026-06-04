# SIRIS (Smart Interactive RFID System)

![SIRIS Banner](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

**SIRIS** adalah antarmuka web interaktif berbasis Next.js yang terhubung langsung dengan perangkat keras RFID Scanner. Sistem ini dirancang untuk menyajikan informasi dan konten media secara *real-time* kepada civitas akademika (Dosen, Mahasiswa, dan Tamu) setiap kali mereka melakukan *tap* (pemindaian) kartu di area laboratorium.

## ✨ Fitur Utama

- **Integrasi Hardware Real-Time**: Menggunakan jalur koneksi *Server-Sent Events* (SSE) dan library `serialport` untuk mendeteksi *tap* kartu dari *scanner* fisik seketika tanpa perlu memuat ulang (*refresh*) halaman.
- **Tampilan Berbasis Role**: 
  - 👨‍🏫 **Dosen**: Menampilkan NIP, profil, dan materi pembelajaran spesifik.
  - 👨‍🎓 **Mahasiswa**: Menampilkan NRP, jurusan, dan notifikasi Dosen yang sedang berada di lab.
  - 🧳 **Tamu**: Menampilkan asal instansi dan video pengenalan profil lab/kampus.
- **Admin Panel (CMS)**: Halaman khusus bagi admin untuk membuat/menghapus "Mata Kuliah", menambah "Pertemuan", dan mengunggah (*upload*) materi video perkuliahan langsung dari komputer.
- **Cloud Storage & Database**: Menggunakan **Firebase** (Storage & Firestore) untuk mengamankan dan menyajikan file video materi secara efisien dengan kapasitas hingga 5 GB gratis.
- **Simulator Hardware**: Dilengkapi dengan halaman `/simulator` yang berfungsi mengirimkan perintah *scan* kartu buatan untuk memudahkan pengujian aplikasi tanpa menyambungkan perangkat keras sungguhan.
- **Auto-Clear Session**: Tampilan otomatis kembali ke kondisi siap sedia (kosong) setelah 30 detik *tap* kartu terakhir agar tampilan lab tetap terlihat rapi dan bersih (*clean look*).

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Storage**: [Firebase](https://firebase.google.com/) (Firestore & Cloud Storage)
- **Hardware Comms**: Node.js `serialport` & Web API `EventSource`

## 🚀 Panduan Instalasi (Local Development)

### Prasyarat
- Node.js versi 18 atau lebih baru.
- Akun Firebase aktif.
- Perangkat RFID Scanner yang mendukung *Serial Port/COM* (opsional, dapat digantikan dengan Simulator).

### Langkah-langkah

1. **Clone repositori**
   ```bash
   git clone https://github.com/nizarae26/siris.git
   cd siris
   ```

2. **Instal seluruh *dependencies***
   ```bash
   npm install
   ```

3. **Konfigurasi Firebase (Environment Variables)**
   Buat file bernama `.env.local` di *root* proyek Anda (folder paling luar) dan masukkan kunci dari Firebase Anda:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=KODE_API_ANDA
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=proyek.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=proyek-anda
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=proyek.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
   ```

4. **Jalankan Server Pengembangan**
   ```bash
   npm run dev
   ```

5. **Akses Aplikasi**
   - Buka `http://localhost:3000` di *browser* untuk melihat **Dashboard Utama**.
   - Buka `http://localhost:3000/simulator` untuk menyimulasikan tap RFID.
   - Buka `http://localhost:3000/admin` untuk mengatur silabus mata kuliah dan mengunggah video.

## 📡 Konfigurasi Perangkat Keras (Hardware)

Jika Anda memiliki pembaca (*scanner*) RFID asli:
1. Sambungkan alat pembaca tersebut ke *port* USB di PC/Raspberry Pi Anda.
2. Cek nama *port* yang digunakan komputer Anda (contoh: `COM3` di Windows, atau `/dev/ttyUSB0` di Linux).
3. Buka file `app/api/rfid/route.ts` dan ubah variabel pengaturan *serialport* (jika menggunakan logika yang *hardcoded*) ke jalur COM yang tepat.

## 📝 Lisensi
Dibuat untuk keperluan Proyek Praktikum / Akademik Komunikasi Data.
