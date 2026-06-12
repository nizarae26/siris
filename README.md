# SIRIS (Smart Interactive RFID)

Aplikasi manajemen dan identifikasi otomatis menggunakan kartu RFID (PN532). Proyek ini dibangun dengan **Next.js 14**, menggunakan **Supabase** sebagai *database* dan penyimpanan data, serta **SerialPort** untuk komunikasi langsung dengan perangkat keras RFID.

## 🚀 Fitur Utama
- **Auto-Detect RFID**: Deteksi otomatis nomor seri kartu (UID) menggunakan PN532 via komunikasi RAW UART (CP2102).
- **Portal Otomatis**: Tampilan Dashboard akan otomatis berganti mengikuti profil dan *role* kartu yang di-tap (Mahasiswa, Dosen, atau Tamu).
- **Admin Panel**: CMS terintegrasi untuk menambahkan pengguna, mendaftarkan kartu baru, mengatur video praktikum, dan menyusun jadwal harian dosen dalam satu semester.
- **Riwayat Tap**: Seluruh riwayat pemindaian kartu tercatat dan dapat difilter berdasarkan bulan.
- **Auto-Export & Cleanup**: *Cron Job* otomatis yang merangkap riwayat sebulan sekali ke dalam format Excel (.xlsx) sebagai laporan bulanan (disimpan di folder `rekap_bulanan`).

---

## 🛠️ Persiapan Perangkat Keras (Hardware)

Anda membutuhkan dua komponen:
1. **Modul RFID PN532** (Pastikan DIP Switch I0 = OFF, I1 = OFF untuk masuk ke mode HSU/UART).
2. **Kabel USB to TTL (CP2102)**.

**Cara Pemasangan Kabel (Menyilang):**
- **VCC (PN532)** ➜ **5V / 3.3V (CP2102)**
- **GND (PN532)** ➜ **GND (CP2102)**
- **TXD (PN532)** ➜ **RXD (CP2102)**
- **RXD (PN532)** ➜ **TXD (CP2102)**

---

## 💻 Langkah Instalasi & Deploy di PC Lab (Local Server)

Aplikasi ini **WAJIB** dijalankan secara langsung (di-host) pada komputer fisik yang tersambung dengan alat RFID (PC Lab), karena server di *cloud* tidak bisa membaca port USB.

### 1. Instalasi Node.js
Pastikan PC Lab sudah menginstall **Node.js** (Disarankan versi LTS v18 atau v20). Cek versi dengan:
```bash
node -v
npm -v
```

### 2. Kloning Repositori
Clone kode sumber dari GitHub ke PC Lab:
```bash
git clone https://github.com/nizarae26/siris.git
cd siris
```

### 3. Install Dependensi
Jalankan perintah berikut untuk menginstall seluruh paket yang dibutuhkan:
```bash
npm install
```

### 4. Konfigurasi Variabel Lingkungan (.env)
Buat file bernama `.env.local` di *root* folder proyek ini. Isi dengan kode berikut:
```env
NEXT_PUBLIC_SUPABASE_URL=Masukkan_URL_Supabase_Anda_Disini
NEXT_PUBLIC_SUPABASE_ANON_KEY=Masukkan_Anon_Key_Supabase_Anda_Disini

# Nomor Port COM RFID (Bisa dilihat di Device Manager Windows)
RFID_COM_PORT=COM5
```
*(Ganti `COM5` dengan port yang sesuai, misalnya `COM3`, `COM13`, dsb.)*

### 5. Build untuk Production (Wajib)
Jangan menggunakan \`npm run dev\` di PC Lab untuk jangka waktu lama, karena akan memakan memori. Compile aplikasi ke mode *Production*:
```bash
npm run build
```

### 6. Menjalankan Aplikasi
Setelah proses build selesai, jalankan aplikasi dengan:
```bash
npm start
```
Aplikasi kini sudah aktif di \`http://localhost:3000\`. Buka browser, akses URL tersebut, dan tekan **F11** untuk masuk ke mode layar penuh (*Kiosk Mode*).

---

## 🔄 Menjalankan Aplikasi di Background (Menggunakan PM2)
Agar aplikasi tidak mati saat terminal ditutup (atau saat komputer *restart*), sangat disarankan menggunakan **PM2**:
1. Install PM2 secara global:
   ```bash
   npm install -g pm2
   ```
2. Jalankan aplikasi menggunakan PM2:
   ```bash
   pm2 start npm --name "siris-rfid" -- start
   ```
3. (Opsional) Jika ingin aplikasi otomatis menyala saat PC baru dihidupkan:
   ```bash
   pm2 startup
   pm2 save
   ```

---

## 🛠️ Troubleshooting (Masalah Umum)
1. **Pesan "COM Port Error" di web:**
   - Tutup aplikasi Serial Monitor atau Arduino IDE jika sedang terbuka.
   - Cek *Device Manager* untuk memastikan nama COM port sudah cocok dengan yang ada di `.env.local`.
   - Cabut lalu pasang kembali USB CP2102.
2. **Web nyangkut di "Port Connected, Waking PN532...":**
   - Kabel TX dan RX belum menyilang (tertukar posisinya).
   - DIP Switch pada PN532 belum berada di mode OFF-OFF.

Cek juga halaman `/diagnostics` di aplikasi web Anda untuk melihat status koneksi perangkat keras secara detail.
