// Menggunakan sintaks CommonJS
const { PrismaClient, PostType, Audience, AnnouncementType } = require('@prisma/client');

const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Memulai proses seeding...');

  // Hapus data lama untuk memastikan idempotensi
  await prisma.galleryImage.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.setting.deleteMany({});
  await prisma.bimbingan.deleteMany({});
  await prisma.subMenuItem.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Data lama berhasil dihapus.');

  // --- 1. Buat Pengguna ---
  // Password: Stisip2025! (memenuhi aturan: min 8, huruf besar, huruf kecil, simbol)
  const hashedPassword = await bcrypt.hash('Stisip2025!', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@stisipsu.ac.id',
      name: 'Admin Utama',
      password: hashedPassword,
      role: 'ADMIN',
      userCode: 'ADM-UTAMA'
    },
  });

  const dosenUser = await prisma.user.create({
    data: {
      email: 'dosen@kampus.com',
      name: 'Dr. Budi Santoso, M.Si.',
      password: hashedPassword,
      role: 'DOSEN',
      npd: '1234567890123456',
      userCode: 'DSN-BUDI'
    },
  });

  const mahasiswaUser = await prisma.user.create({
    data: {
      email: 'mahasiswa@kampus.com',
      name: 'Ani Lestari',
      password: hashedPassword,
      role: 'MAHASISWA',
      studyProgram: 'Ilmu Pemerintahan',
      npm: '211234567',
      entryYear: 2021,
      userCode: 'MHS-IP-567-2021'
    },
  });
  console.log('Pengguna berhasil dibuat.');

  // --- 2. Buat Halaman & Menu ---
  const tentangKamiPost = await prisma.post.create({
    data: {
      title: 'Tentang Kami',
      authorId: adminUser.id,
      type: PostType.PAGE,
      slug: 'tentang-kami',
      isPublished: true,
      blocks: [
        { "id": "h-1", "type": "heading", "content": "Sejarah Singkat STISIP Syamsul 'Ulum" },
        { "id": "p-1", "type": "paragraph", "content": "<p>Ini adalah halaman tentang kami yang dibuat secara otomatis melalui proses seeding. Silakan edit konten ini melalui modul <b>Kelola Halaman</b>.</p>" },
      ]
    }
  });

  await prisma.menuItem.create({
    data: { name: 'Beranda', order: 0, type: 'STATIC_PATH', href: '/' }
  });
  
  await prisma.menuItem.create({
    data: { name: 'Tentang STISIP', order: 1, type: 'INTERNAL', postId: tentangKamiPost.id },
  });
  console.log('Halaman dan Menu berhasil dibuat.');
  
  // --- 3. Buat Berita ---
  await prisma.post.create({
    data: {
      title: 'Kampus Gelar Seminar Kewirausahaan Digital 2025',
      slug: 'seminar-kewirausahaan-digital-2025',
      authorId: adminUser.id,
      type: PostType.NEWS,
      isPublished: true,
      featuredImageUrl: '/uploads/placeholder.jpg',
      blocks: [
        { "id": "h-news-1", "type": "heading", "content": "Kampus Gelar Seminar Kewirausahaan Digital 2025" },
        { "id": "p-news-1", "type": "paragraph", "content": "<p>Berita ini dibuat otomatis dari seeder. Edit kontennya dari modul <b>Kelola Berita</b>.</p>" },
      ]
    }
  });
  console.log('Berita berhasil dibuat.');

  // --- 4. Buat Galeri ---
  await prisma.galleryImage.createMany({
    data: [
      { title: 'Foto Gedung Kampus', description: 'Tampak depan gedung rektorat.', imageUrl: '/uploads/placeholder.jpg', order: 0 },
      { title: 'Suasana Kelas', description: 'Kegiatan belajar mengajar.', imageUrl: '/uploads/placeholder.jpg', order: 1 },
    ]
  });
  console.log('Galeri berhasil dibuat.');
  
  // --- 5. Buat Info Kontak ---
  await prisma.setting.create({
    data: {
      key: 'contact_info',
      value: {
        "alamat": "Jl. Jenderal Sudirman No. 5, Sukabumi, Jawa Barat",
        "email": "info@stisip-syamsululum.ac.id",
        "telepon": "(0266) 221234",
        "link_Maps": "http://googleusercontent.com/maps.google.com/7..."
      }
    }
  });
  console.log('Info Kontak berhasil dibuat.');
  
  // --- 6. Buat Pengumuman ---
  await prisma.announcement.create({
    data: {
      title: 'Pengumuman Selamat Datang (Publik)',
      type: AnnouncementType.TEXT,
      content: 'Selamat datang di website baru STISIP Syamsul \'Ulum! Jelajahi informasi terbaru seputar kampus kami.',
      isActive: true,
    }
  });
  console.log('Pengumuman berhasil dibuat.');

  // --- 7. Buat Kalender Pendidikan ---
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  
  await prisma.calendarEvent.createMany({
    data: [
      { title: 'Hari pertama masuk sekolah', eventDate: new Date(y, 6, 14), type: 'academic', color: '#0077c2', isActive: true },
      { title: 'Masa Pengenalan Akademik', eventDate: new Date(y, 6, 14), endDate: new Date(y, 6, 18), type: 'academic', color: '#0077c2', isActive: true },
      { title: 'Perkuliahan Semester Ganjil', eventDate: new Date(y, 6, 21), endDate: new Date(y, 11, 12), type: 'academic', color: '#0077c2', isActive: true },
      { title: 'Hari Kemerdekaan RI', eventDate: new Date(y, 7, 17), type: 'holiday', color: '#e53935', isActive: true },
      { title: 'UTS Semester Ganjil', eventDate: new Date(y, 9, 6), endDate: new Date(y, 9, 17), type: 'exam', color: '#fb8c00', isActive: true },
      { title: 'UAS Semester Ganjil', eventDate: new Date(y, 11, 1), endDate: new Date(y, 11, 12), type: 'exam', color: '#fb8c00', isActive: true },
      { title: 'Libur Semester Ganjil', eventDate: new Date(y, 11, 15), endDate: new Date(y + 1, 0, 31), type: 'holiday', color: '#e53935', isActive: true },
      { title: 'Pendaftaran Mahasiswa Baru', eventDate: new Date(y, 4, 1), endDate: new Date(y, 6, 14), type: 'registration', color: '#43a047', isActive: true },
      { title: 'Tahun Baru', eventDate: new Date(y + 1, 0, 1), type: 'holiday', color: '#e53935', isActive: true },
      { title: 'Perkuliahan Semester Genap', eventDate: new Date(y + 1, 1, 2), endDate: new Date(y + 1, 5, 27), type: 'academic', color: '#0077c2', isActive: true },
    ],
  });
  console.log('Kalender pendidikan berhasil dibuat.');

  console.log('Proses seeding selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
