# STISIP Syamsul Ulum — Sistem Informasi Kampus

## Client Brief

Klien meminta pengembangan **website company profile** dan **repository jurnal ilmiah** untuk STISIP Syamsul Ulum Sukabumi. Klien sudah memiliki sistem PMB (Penerimaan Mahasiswa Baru) sendiri sehingga fitur PMB tidak perlu dibangun — cukup disediakan tautan eksternal.

### Kebutuhan Awal
- Company profile kampus (profil, berita, galeri, kontak)
- Repository jurnal/karya ilmiah dengan sistem bimbingan
- Multi-level user: Admin, Dosen (pembimbing), Mahasiswa (pengunggah)
- Admin panel untuk kelola konten secara mandiri

---

## Fitur yang Tersedia

### Publik (Frontend)
| Fitur | Keterangan |
|-------|-----------|
| Beranda | Banner slider, hero section PMB, highlight berita, highlight galeri |
| Profil | Halaman statis (visi-misi, sejarah, fasilitas, dll) melalui menu |
| Berita | Daftar berita dengan pencarian, pagination, detail |
| Galeri | Grid foto kegiatan kampus |
| Kalender Pendidikan | Grid bulanan interaktif, legend tipe event, detail panel |
| Repository | Karya ilmiah dengan filter tahun/prodi, unduh PDF |
| Dosen | Direktori dosen |
| Kontak | Informasi alamat, email, telepon, peta |
| Pencarian Global | Pencarian seluruh konten website |
| Pop-up Pengumuman | Tipe teks atau gambar |
| Sitasi (APA/BibTeX) | Generate otomatis format sitasi |

### Admin Panel
| Fitur | Keterangan |
|-------|-----------|
| Dashboard | Statistik pengguna, berita, repository, grafik, aktivitas |
| Kelola Pengguna | CRUD Mahasiswa, Dosen, Admin |
| Berita | CRUD dengan editor blok, toggle terbit/draf |
| Halaman Statis | Edit konten halaman dari menu |
| Banner | CRUD, drag-drop urutan, toggle aktif |
| **Hero Section** | **Judul, teks, gambar, link PMB (dinamis)** |
| Galeri | Upload multi-file, edit inline |
| Pengumuman | CRUD, tipe teks/gambar, XHR upload + progress bar |
| Menu | Struktur navigasi bertingkat, drag-drop, ikon |
| Footer | Kelola kolom dan tautan footer |
| Kontak | Alamat, email, telepon, Google Maps |
| Kalender | CRUD event, tipe (akademik/libur/ujian/pendaftaran), multi-hari |
| Repository | Approve/revisi/tolak karya, atur visibilitas |
| Backup | Ekspor database (JSON/SQL) + unduh file |
| Panduan | Dokumentasi penggunaan sistem |
| Log Aktivitas | Catatan semua aksi admin |

### Peran & Hak Akses
- **Admin**: Akses penuh ke seluruh fitur
- **Dosen**: Bimbingan & review repository mahasiswa, lihat kalender
- **Mahasiswa**: Upload & kelola repository sendiri, lihat kalender

---

## Teknologi

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, SWR |
| Backend | Express.js, Prisma ORM, PostgreSQL |
| Auth | JWT (access + refresh token), Google OAuth |
| Storage | Supabase Storage (file uploads) |
| Deploy | Vercel (FE), Render (BE), Supabase (DB) |

---

## Saran Pengembangan Selanjutnya

Berikut fitur yang dapat ditambahkan di masa mendatang (tidak termasuk dalam requirement awal):

### 1. Section Rekognisi & Akreditasi
Menampilkan badge akreditasi, peringkat Webometrics/UniRank, dan sertifikasi institusi. Meningkatkan kredibilitas website.

### 2. STISIP Dalam Angka
Section statistik dinamis (jumlah mahasiswa, dosen, program studi, alumni) dengan animasi counter. Efek psikologis positif untuk pengunjung.

### 3. Quick Access Cards
3 kartu akses cepat di bawah banner (misal: PMB, Akademik, Perpustakaan) sebagai navigasi cepat ke halaman penting.

### 4. Alumni Spotlight
Profil alumni sukses dengan foto, pencapaian, dan testimoni. Social proof untuk calon mahasiswa.

### 5. Mitra & Kerja Sama
Grid logo institusi mitra (pemerintah, industri, universitas luar negeri). Menunjukkan jaringan kolaborasi kampus.

### 6. Agenda Kegiatan
Section agenda terpisah (tidak digabung di berita) dengan tampilan list/kalender.

### 7. Halaman Program Studi
Detail masing-masing prodi (visi-misi, kurikulum, dosen, akreditasi). Saat ini prodi hanya sebagai halaman statis.

### 8. Manajemen File Super Admin
Halaman khusus untuk melihat dan mengelola semua file yang diupload di sistem.

### 9. Multi Bahasa
Dukungan bahasa Inggris sebagai opsi kedua.

### 10. Dark Mode
Tema gelap untuk kenyamanan membaca.

---

## Catatan Pengembangan

- Password semua akun seed: `Stisip2025!`
- Repository GitHub: [STISIPSU-BE](https://github.com/Pappa66/STISIPSU-BE) (backend), [STISIPSU-FE](https://github.com/Pappa66/STISIPSU-FE) (frontend)
- Auto-deploy Vercel dari branch `main`
- Data lama telah direstorasi dari file `database.json` via script `scripts/restore-from-json.js`
- Ukuran banner ideal: 1920×600 px (3:1)
- Ukuran pengumuman gambar: 600×400 px (3:2)
