# TP Modul 10 - Propagasi

Pembuat: ED

```
Nama  : [Akiyama Mizuki]
NPM   : [082127444366]
```

**JAWABAN TANPA REFERENSI YANG SESUAI DIANGGAP MENDAPATKAN 0 POIN (UNLESS SPECIFIED OTHERWISE)**

### A. Teori dan Analisis (60 poin)

1. Menurut anda apa 10 method terpenting pada library Arduino LoRA, jelaskan secara singkat fungsi dari masing-masing method tersebut! [10 poin]
    - `LoRa.begin(frequency)`: Inisialisasi modul LoRa dengan frekuensi yang ditentukan.
    - `LoRa.setPins(csPin, resetPin, irqPin)`: Mengatur pin untuk komunikasi SPI dengan modul LoRa.
    - `LoRa.setTxPower(txPower)`: Mengatur daya transmisi untuk pengiriman sinyal.
    - `LoRa.setSpreadingFactor(spreadingFactor)`: Mengatur faktor penyebaran untuk modulasi sinyal.
    - `LoRa.setSignalBandwidth(signalBandwidth)`: Mengatur bandwidth sinyal yang digunakan untuk transmisi.
    - `LoRa.setCodingRate4(codingRate)`: Mengatur rasio pengkodean untuk meningkatkan keandalan transmisi.
    - `LoRa.setPreambleLength(preambleLength)`: Mengatur panjang preamble yang digunakan sebelum pengiriman data.
    - `LoRa.enableCrc()`: Mengaktifkan pemeriksaan CRC untuk mendeteksi kesalahan dalam paket data.
    - `LoRa.receive()`: Mengatur modul LoRa untuk menerima data.
    - `LoRa.onReceive(callbackFunction)`: Menetapkan fungsi callback yang akan dipanggil saat paket diterima.
   
2. Sebutkan method-method minimal yang diperlukan untuk mengirimkan data string "Hello World" dari satu modul LoRA ke modul LoRA lainnya [10 poin]
    - `LoRa.begin(frequency)`: Inisialisasi modul LoRa.
    - `LoRa.setPins(csPin, resetPin, irqPin)`: Mengatur pin untuk komunikasi SPI.
    - `LoRa.beginPacket()`: Memulai paket pengiriman.
    - `LoRa.print("Hello World")`: Menambahkan string "Hello World" ke paket.
    - `LoRa.endPacket()`: Mengirimkan paket yang telah dibuat.

3. Belajar dan jelaskan RSSI dan SNR [10 poin]
    - RSSI (Received Signal Strength Indicator) adalah ukuran kekuatan sinyal yang diterima oleh penerima. Semakin tinggi nilai RSSI, semakin kuat sinyal yang diterima.
    - SNR (Signal-to-Noise Ratio) adalah perbandingan antara kekuatan sinyal yang diinginkan dengan tingkat kebisingan latar belakang. SNR yang lebih tinggi menunjukkan kualitas sinyal yang lebih baik, karena sinyal lebih dominan dibandingkan dengan noise.

4. Belajar dan jelaskan free path loss dan fresnel zone, serta hubungannya dengan nomor A3  [10 poin]
    - Free Path Loss (FPL) adalah pengurangan kekuatan sinyal saat merambat melalui ruang bebas. FPL dipengaruhi oleh jarak antara pemancar dan penerima serta frekuensi sinyal. Semakin jauh jarak atau semakin tinggi frekuensi, semakin besar FPL.
    - Fresnel Zone adalah area elips di sekitar jalur langsung antara pemancar dan penerima yang mempengaruhi propagasi sinyal. Jika ada hambatan dalam zona Fresnel, sinyal dapat mengalami difraksi atau refleksi, yang dapat mengurangi kualitas sinyal.
    - Hubungan dengan nomor A3: RSSI dan SNR dapat dipengaruhi oleh Free Path Loss dan kondisi di dalam Fresnel Zone. Jika FPL tinggi atau ada hambatan di Fresnel Zone, RSSI akan menurun dan SNR dapat memburuk, mengakibatkan kualitas komunikasi yang lebih rendah.

5. Belajar dan jelaskan LoS, NLoS, dan multipath propagation, serta hubungannya dengan nomor A3 [10 poin]
    - LoS (Line of Sight) adalah kondisi di mana jalur langsung antara pemancar dan penerima tidak terhalang oleh objek apapun. Dalam kondisi LoS, sinyal cenderung lebih kuat dan stabil.
    - NLoS (Non-Line of Sight) adalah kondisi di mana jalur langsung antara pemancar dan penerima terhalang oleh objek seperti bangunan, pepohonan, atau medan. Dalam kondisi NLoS, sinyal dapat mengalami penurunan kekuatan dan gangguan.
    - Multipath Propagation terjadi ketika sinyal yang dipancarkan mencapai penerima melalui beberapa jalur berbeda akibat pantulan, difraksi, atau hamburan. Hal ini dapat menyebabkan interferensi konstruktif atau destruktif, yang mempengaruhi kualitas sinyal.
    - Hubungan dengan nomor A3: Dalam kondisi NLoS atau multipath propagation, RSSI dapat menurun dan SNR dapat memburuk karena sinyal yang diterima menjadi lebih lemah atau terdistorsi. Hal ini dapat menyebabkan penurunan kualitas komunikasi antara modul LoRa.

6. Belajar dan jelaskan Coding Rate, preamble length, dan sync word [10 poin]
    - Coding Rate adalah rasio antara jumlah bit data asli dan jumlah bit yang dikirimkan setelah pengkodean. Coding Rate yang lebih tinggi (misalnya 4/8) berarti lebih banyak bit tambahan untuk koreksi kesalahan, yang dapat meningkatkan keandalan transmisi tetapi mengurangi kecepatan data.
    - Preamble Length adalah jumlah simbol preamble yang dikirim sebelum data utama. Preamble digunakan untuk sinkronisasi antara pemancar dan penerima. Preamble yang lebih panjang dapat membantu penerima mendeteksi sinyal dengan lebih baik, terutama dalam kondisi sinyal lemah.
    - Sync Word adalah nilai khusus yang digunakan untuk menyinkronkan komunikasi antara pemancar dan penerima. Sync Word membantu penerima mengenali awal paket data yang valid. Penggunaan Sync Word yang unik dapat mengurangi interferensi dari perangkat lain yang menggunakan frekuensi yang sama.

---

### B. Praktik (40 poin) [Bagian B tidak memperlukan referensi]

1. Berikan screenshot anda berhasil compile kode A2, jangan lupa menginstall library yang diperlukan. Referensi [ini](https://randomnerdtutorials.com/esp32-lora-rfm95-transceiver-arduino-ide/). [10 poin]

Kode A2:
```cpp
#include <SPI.h>
#include <LoRa.h>

const int csPin = 5;  
const int resetPin = 14;
const int irqPin = 2;   
float frequency = 923.0E6;
void setup() {
  Serial.begin(115200);
  while (!Serial);
  
  LoRa.setPins(csPin, resetPin, irqPin);

  if (!LoRa.begin(frequency)) {
    Serial.println("Inisialisasi LoRa gagal. Periksa koneksi.");
    while (true);
  }

  Serial.println("Inisialisasi LoRa berhasil.");
}

void loop() {
  LoRa.beginPacket();
  LoRa.print("Hello World");
  LoRa.endPacket();
  Serial.println("Pesan 'Hello World' dikirim.");
  delay(5000); 
}
```


2. Berikan screenshot berhasil compile kode yang dilampirkan, dan jelaskan seluruh fungsi dari kode tersebut! [30 poin]

```cpp
#include <SPI.h>
#include <LoRa.h>

const int csPin = 5;  
const int resetPin = 14; 
const int irqPin = 2;   

float frequency = 923.0E6;
uint8_t syncWord = 0xE0;  
int txPower = 17;        
int spreadingFactor = 7;  
long signalBandwidth = 125E3; 
int codingRate = 5;       
int preambleLength = 8;   
bool crcEnabled = true;   
bool invertIQSignals = false; 
bool IQEnabled = true;   
int Gain = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);
  initLoRa();
  displayMenu();
}

void loop() {
  if (Serial.available() > 0) {
    char choice = Serial.read();
    processMenuChoice(choice);
  }
}

void initLoRa() {
  LoRa.setPins(csPin, resetPin, irqPin);

  if (!LoRa.begin(frequency)) {
    Serial.println("Inisialisasi LoRa gagal. Periksa koneksi.");
    while (true);
  }

  LoRa.setTxPower(txPower);
  LoRa.setSpreadingFactor(spreadingFactor);
  LoRa.setSignalBandwidth(signalBandwidth);
  LoRa.setCodingRate4(codingRate);
  LoRa.setPreambleLength(preambleLength);
  LoRa.enableCrc();
  LoRa.setSyncWord(syncWord);

  LoRa.receive();

  LoRa.onReceive(onReceiveCallback);

  Serial.println("Inisialisasi LoRa berhasil.");
}

void displayMenu() {
  Serial.println("\n--- Menu Komunikasi LoRa ---");
  Serial.println("a. Inisialisasi LoRa");
  Serial.println("b. Ubah Sync Word");
  Serial.println("c. Ubah Transmission Power");
  Serial.println("d. Ubah Spreading Factor");
  Serial.println("e. Ubah Signal Bandwidth");
  Serial.println("f. Ubah Coding Rate");
  Serial.println("g. Ubah Preamble Length");
  Serial.println("h. Enable/Disable CRC");
  Serial.println("i. Enable/Disable Invert IQ");
  Serial.println("j. Atur Gain");
  Serial.println("k. Atur Idle");
  Serial.println("l. Atur Sleep");
  Serial.println("m. Kirim Pesan");
  Serial.println("Pilih opsi (a-k): ");
}

void processMenuChoice(char choice) {
  switch(choice) {
    case 'a': 
      initLoRa(); 
      break;
    case 'b': 
      changeSyncWord(); 
      break;
    case 'c': 
      changeTxPower(); 
      break;
    case 'd': 
      changeSpreadingFactor(); 
      break;
    case 'e': 
      changeSignalBandwidth(); 
      break;
    case 'f': 
      changeCodingRate(); 
      break;
    case 'g': 
      changePreambleLength(); 
      break;
    case 'h': 
      toggleCRC(); 
      break;
    case 'i': 
      toggleIQ(); 
      break;
    case 'j': 
      setGain(); 
      break;
    case 'k': 
      setIdle(); 
      break;
    case 'l': 
      setSleep(); 
      break;
    case 'm': 
      sendMessage(); 
      break;
    case '\n':
    case '\r':
      break;
    default:
      Serial.println("Pilihan tidak valid. Silakan coba lagi.");
      displayMenu();
  }
}

void changeSyncWord() {
  Serial.println("Masukkan Sync Word (0-255):");
  while (!Serial.available());
  syncWord = Serial.parseInt();
  LoRa.setSyncWord(syncWord);
  Serial.print("Sync Word diubah menjadi: 0x"); 
  Serial.println(syncWord, HEX);
  displayMenu();
}

void changeTxPower() {
  Serial.println("Masukkan Transmission Power (2-20 dBm):");
  while (!Serial.available());
  txPower = Serial.parseInt();
  LoRa.setTxPower(txPower);
  Serial.print("Transmission Power diubah menjadi: "); 
  Serial.print(txPower);
  Serial.println(" dBm");
  displayMenu();
}

void changeSpreadingFactor() {
  Serial.println("Masukkan Spreading Factor (6-12):");
  while (!Serial.available());
  spreadingFactor = Serial.parseInt();
  LoRa.setSpreadingFactor(spreadingFactor);
  Serial.print("Spreading Factor diubah menjadi: "); 
  Serial.println(spreadingFactor);
  displayMenu();
}

void changeSignalBandwidth() {
  Serial.println("Masukkan Signal Bandwidth (7.8E3, 10.4E3, 15.6E3, 20.8E3, 31.25E3, 41.7E3, 62.5E3, 125E3, 250E3, 500E3):");
  while (!Serial.available());
  signalBandwidth = Serial.parseFloat();
  LoRa.setSignalBandwidth(signalBandwidth);
  Serial.print("Signal Bandwidth diubah menjadi: "); 
  Serial.print(signalBandwidth);
  Serial.println(" Hz");
  displayMenu();
}

void changeCodingRate() {
  Serial.println("Masukkan Coding Rate (5-8):");
  while (!Serial.available());
  codingRate = Serial.parseInt();
  LoRa.setCodingRate4(codingRate);
  Serial.print("Coding Rate diubah menjadi: 4/"); 
  Serial.println(codingRate);
  displayMenu();
}

void changePreambleLength() {
  Serial.println("Masukkan Preamble Length (6-65535):");
  while (!Serial.available());
  preambleLength = Serial.parseInt();
  LoRa.setPreambleLength(preambleLength);
  Serial.print("Preamble Length diubah menjadi: "); 
  Serial.println(preambleLength);
  displayMenu();
}

void toggleCRC() {
  crcEnabled = !crcEnabled;
  if (crcEnabled) {
    LoRa.enableCrc();
    Serial.println("CRC diaktifkan");
  } else {
    Serial.println("Catatan: Menonaktifkan CRC mungkin tidak didukung");
  }
  displayMenu();
}

void toggleIQ() {
  IQEnabled = !IQEnabled;
  if (IQEnabled) {
    LoRa.enableInvertIQ();
    Serial.println("Invert IQ diaktifkan");
  } else {
    LoRa.disableInvertIQ();
    Serial.println("Invert IQ dinonaktifkan");
  }
  displayMenu();
}

void setGain() {
  Serial.println("Masukkan Gain (0 - 6):");
  while (!Serial.available());
  Gain = Serial.parseInt();
  LoRa.setGain(Gain);
  Serial.print("Gain diubah menjadi: "); 
  Serial.println(Gain);
  displayMenu();
}

void setIdle() {
  LoRa.idle();
  Serial.println("Radio diatur ke mode Idle");
  displayMenu();
}

void setSleep() {
  LoRa.sleep();
  Serial.println("Radio diatur ke mode Sleep");
  displayMenu();
}

void sendMessage() {
  Serial.println("Masukkan pesan yang akan dikirim:");
  while (!Serial.available());
  
  String message = Serial.readStringUntil('\n');
  
  LoRa.beginPacket();
  LoRa.print(message);
  LoRa.endPacket();
  
  Serial.print("Mengirim pesan: ");
  Serial.println(message);
  displayMenu();
}

void onReceiveCallback(int packetSize) {
  if (packetSize == 0) return;

  String incoming = "";
  while (LoRa.available()) {
    incoming += (char)LoRa.read();
  }

  Serial.println("\n--- Paket Diterima ---");
  Serial.println("Payload: " + incoming);
  Serial.println("RSSI: " + String(LoRa.packetRssi()));
  Serial.println("SNR: " + String(LoRa.packetSnr()));
  Serial.println("-------------------");

  displayMenu();
}
```

> [!TIP]
> Menonton video playlist LoRa/LoRaWAN tutorials pada [more resource daste](https://learn.digilabdte.com/books/telecommunication/page/more-resources), soal postest dan CS akan berbasis pada video-video tersebut.

SS Berhasil Compile:


Penjelasan Fungs Kode:

Kode di atas adalah program Arduino yang menggunakan modul LoRa untuk komunikasi nirkabel. Program ini memungkinkan pengguna untuk menginisialisasi modul LoRa, mengubah berbagai parameter konfigurasi, dan mengirim serta menerima pesan melalui antarmuka serial. Berikut adalah penjelasan fungsi utama dari kode tersebut:
- Inisialisialisasi LoRa: Fungsi `initLoRa()` mengatur pin yang digunakan untuk komunikasi SPI dengan modul LoRa, menginisialisasi modul dengan frekuensi tertentu, dan mengatur berbagai parameter seperti daya transmisi, faktor penyebaran, bandwidth sinyal, rasio pengkodean, panjang preamble, dan sinkronisasi kata.
- Menu Interaktif: Fungsi `displayMenu()` menampilkan menu pilihan kepada pengguna melalui antarmuka serial. Pengguna dapat memilih opsi untuk mengubah konfigurasi modul LoRa atau mengirim pesan.
- Pemrosesan Pilihan Menu: Fungsi `processMenuChoice(char choice)` menangani pilihan yang dibuat oleh pengguna dari menu. Berdasarkan pilihan tersebut, fungsi yang sesuai dipanggil untuk mengubah parameter atau mengirim pesan.
- Pengubahan Parameter: Fungsi-fungsi seperti `changeSyncWord()`, `changeTxPower()`, `changeSpreadingFactor()`, dll., memungkinkan pengguna untuk mengubah parameter konfigurasi modul LoRa melalui input serial.
- Pengiriman Pesan: Fungsi `sendMessage()` memungkinkan pengguna untuk memasukkan pesan melalui antarmuka serial, yang kemudian dikirim menggunakan modul LoRa.
- Penerimaan Pesan: Fungsi `onReceiveCallback(int packetSize)` dipanggil saat paket diterima. Fungsi ini membaca pesan yang diterima, menampilkan payload, RSSI, dan SNR pada antarmuka serial.
- Mode Radio: Fungsi `setIdle()` dan `setSleep()` mengatur modul LoRa ke mode Idle atau Sleep untuk menghemat daya saat tidak digunakan.