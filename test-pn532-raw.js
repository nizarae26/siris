const { SerialPort } = require('serialport');

console.log("Mencoba membuka COM13 pada baud 115200...");
const port = new SerialPort({ path: 'COM13', baudRate: 115200 }, (err) => {
  if (err) {
    return console.error('Gagal buka port:', err.message);
  }
  console.log("Port terbuka! Mengirim sinyal Wake Up (Pembangun) ke PN532...");
  
  // Sequence WakeUp PN532 UART:
  const wakeup = Buffer.from([
    0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xFF, 0x03, 0xFD, 0xD4, 0x14, 0x01, 0x17, 0x00 // GetFirmwareVersion command
  ]);
  
  port.write(wakeup, (err) => {
    if (err) console.error("Gagal mengirim data:", err);
    else console.log("Sinyal terkirim, menunggu balasan dari alat...");
  });
});

let reply = Buffer.alloc(0);

port.on('data', (data) => {
  console.log('<< Menerima data HEX:', data.toString('hex'));
  reply = Buffer.concat([reply, data]);
});

setTimeout(() => {
  console.log("--- Selesai Menunggu ---");
  console.log("Total Balasan Terkumpul (HEX):", reply.toString('hex'));
  if (reply.length === 0) {
    console.log("TIDAK ADA BALASAN SAMA SEKALI. (Berarti jalur TX/RX putus/terbalik, atau alat mati, atau baud rate salah).");
  }
  process.exit(0);
}, 5000);
