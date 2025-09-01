
# Aplikasi Dashboard Aset Tanah Kodam IV/Diponegoro

Ini adalah aplikasi web prototipe yang dibangun untuk memvisualisasikan dan mengelola data aset tanah milik Kodam IV/Diponegoro di wilayah Jawa Tengah dan D.I. Yogyakarta.

---

## Update Besar (Versi 2.0)

Aplikasi telah dirombak secara signifikan untuk menyertakan fungsionalitas backend (simulasi), sistem login, dan fitur-fitur canggih lainnya. Aplikasi ini sekarang berfungsi sebagai sistem manajemen aset yang lebih lengkap dengan hak akses berbasis peran.

## Fitur Utama

- **Sistem Login:** Aplikasi kini dilindungi oleh halaman login. Hanya pengguna terotentikasi (admin) yang dapat mengelola data aset.
- **Manajemen Aset (CRUD):** Admin dapat menambah, mengedit, dan menghapus data aset.
- **Tambah Aset dengan Menggambar:** Admin dapat menambahkan aset baru dengan menggambar poligon langsung di peta, memberikan cara yang intuitif untuk mendefinisikan lokasi aset.
- **Visualisasi Aset Poligon:** Aset yang ada ditampilkan di peta sebagai area poligon, bukan lagi sebagai titik penanda (marker).
- **Backend API (Simulasi):** Aplikasi sekarang berjalan dengan backend API sementara menggunakan `json-server`, yang membuat aplikasi berperilaku seperti aplikasi dunia nyata.

## Teknologi yang Digunakan

- **Frontend:** React.js
- **UI Framework:** React-Bootstrap & Bootstrap 5
- **Peta Interaktif:** Leaflet & React-Leaflet
- **Fitur Menggambar Peta:** Leaflet-Draw & React-Leaflet-Draw
- **Manajemen State Global:** React Context API (untuk otentikasi).
- **Navigasi Halaman:** React Router DOM
- **Backend (Database Sementara):** JSON Server

## Cara Menjalankan Aplikasi

Karena aplikasi sekarang memiliki server frontend dan backend (sementara), cara menjalankannya telah diperbarui.

1.  **Install Dependencies:**
    Pastikan Anda memiliki Node.js dan npm terinstal. Buka terminal di direktori proyek dan jalankan:
    ```bash
    npm install
    ```

2.  **Jalankan Aplikasi & Server:**
    Gunakan perintah berikut untuk menjalankan server aplikasi dan server database secara bersamaan:
    ```bash
    npm run dev
    ```
    Ini akan memulai aplikasi React di `http://localhost:3000` dan server API di `http://localhost:3001`.

3.  **Akses Aplikasi:**
    Buka browser Anda dan navigasikan ke `http://localhost:3000`

## Sistem Login & Database

### Kredensial Login Admin

Gunakan akun berikut untuk masuk sebagai admin:
- **Username:** `admin`
- **Password:** `password123`

### Pengelolaan Database & Akun Pengguna

Seluruh data untuk aplikasi ini, **termasuk data pengguna (username dan password)**, disimpan dalam file `db.json` di direktori utama proyek.

**Untuk mengubah username atau password admin:**
1.  Buka file `db.json`.
2.  Cari objek `users`.
3.  Edit field `username` atau `password` secara langsung di dalam file ini dan simpan perubahannya.

```json
{
  "users": [
    {
      "id": 1,
      "username": "admin", // <-- Ganti di sini
      "password": "password123", // <-- Ganti di sini
      "name": "Administrator Utama"
    }
  ],
  "assets": [
    // ... data aset
  ]
}
```
**Catatan:** Halaman "Pengaturan" di dalam aplikasi saat ini hanya merupakan simulasi dan tidak akan mengubah data di `db.json`.

**ganti akun**
Batasan (Limit) dan Pergantian Akun Gemini

   * Tentang Limit: Ya, seperti layanan lainnya, ada kemungkinan terdapat batasan penggunaan (limit) pada API Gemini untuk
     memastikan penggunaan yang wajar dan ketersediaan layanan untuk semua pengguna. Batasan ini biasanya terkait dengan jumlah
     permintaan dalam satu menit/hari.
   * Tentang Ganti Akun: Saya, sebagai Gemini, tidak memiliki "akun" sendiri. Akses Anda kepada saya diatur melalui akun Google
     yang Anda gunakan untuk otentikasi dengan tool ini (Gemini CLI).

  Cara Mengganti Akun:

  Anda tidak mengganti akun "di dalam" Gemini, melainkan Anda perlu mengganti akun Google yang terotentikasi dengan tool ini.
  Caranya akan bergantung pada bagaimana Anda melakukan login awal.

  Biasanya, tool berbasis command-line seperti ini (terutama yang terhubung dengan layanan Google) menggunakan gcloud (Google
  Cloud SDK) atau mekanisme otentikasi serupa. Anda bisa mencoba langkah berikut:

   1. Logout dari Akun Saat Ini: Cari perintah untuk logout. Mungkin sesuatu seperti:

   1     gcloud auth revoke
      atau
   1     gcloud auth logout

   2. Login dengan Akun Baru: Setelah berhasil logout, lakukan proses login kembali. Perintahnya kemungkinan besar adalah:
   1     gcloud auth login
      Perintah ini akan membuka browser dan meminta Anda untuk login dengan akun Google yang baru.

  Jika tool ini memiliki mekanisme otentikasi sendiri, periksa dokumentasinya dengan menjalankan perintah seperti gemini --help
  atau gemini auth --help untuk menemukan perintah yang relevan.
