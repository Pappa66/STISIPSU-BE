const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  // Load JSON backup
  const jsonPath = path.join(__dirname, '..', 'deliverable', 'database.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 1. Clear all data
  const deleteOrder = [
    'fileItem', 'subMenuItem', 'menuItem', 'galleryImage', 'post',
    'bimbingan', 'repositoryItem', 'notification', 'activityLog',
    'announcement', 'setting', 'banner', 'calendarEvent', 'user'
  ];
  for (const t of deleteOrder) {
    await prisma[t].deleteMany({});
  }
  console.log('All data cleared.');

  // 2. Seed users
  const hp = await bcrypt.hash('Stisip2025!', 10);
  const admin = await prisma.user.create({
    data: { email: 'admin@stisipsu.ac.id', name: 'Admin Utama', password: hp, role: 'ADMIN', userCode: 'ADM-UTAMA' }
  });
  const dosen = await prisma.user.create({
    data: { email: 'dosen@kampus.com', name: 'Dr. Budi Santoso, M.Si.', password: hp, role: 'DOSEN', npd: '1234567890123456', userCode: 'DSN-BUDI' }
  });
  const mahasiswa = await prisma.user.create({
    data: { email: 'mahasiswa@kampus.com', name: 'Ani Lestari', password: hp, role: 'MAHASISWA', studyProgram: 'Ilmu Pemerintahan', npm: '211234567', entryYear: 2021, userCode: 'MHS-IP-567-2021' }
  });
  const userMap = {
    'cmdpqcgww0000jsxzq6sh9l50': admin.id,
    'cmdpqcgwz0001jsxznv34qybj': dosen.id,
    'cmdpqcgx20002jsxz9pdwqb56': mahasiswa.id,
  };
  console.log('3 users seeded.');

  // 3. Import posts (with authorId mapped to admin)
  for (const row of data.post) {
    await prisma.post.create({ data: { ...row, authorId: userMap[row.authorId] || admin.id } });
  }
  console.log(`Imported ${data.post.length} posts.`);

  // 4. Import menuItems
  for (const row of data.menuItem) {
    await prisma.menuItem.create({ data: row });
  }
  console.log(`Imported ${data.menuItem.length} menuItems.`);

  // 5. Import subMenuItems
  for (const row of data.subMenuItem) {
    await prisma.subMenuItem.create({ data: row });
  }
  console.log(`Imported ${data.subMenuItem.length} subMenuItems.`);

  // 6. Import galleryImages
  for (const row of data.galleryImage) {
    await prisma.galleryImage.create({ data: row });
  }
  console.log(`Imported ${data.galleryImage.length} galleryImages.`);

  // 7. Import announcements
  for (const row of data.announcement) {
    await prisma.announcement.create({ data: row });
  }
  console.log(`Imported ${data.announcement.length} announcements.`);

  // 8. Import settings
  for (const row of data.setting) {
    await prisma.setting.create({ data: row });
  }
  console.log(`Imported ${data.setting.length} settings.`);

  // 9. Import bimbingan (map user IDs)
  for (const row of data.bimbingan) {
    await prisma.bimbingan.create({
      data: {
        ...row,
        dosenId: userMap[row.dosenId] || dosen.id,
        mahasiswaId: userMap[row.mahasiswaId] || mahasiswa.id,
      }
    });
  }
  console.log(`Imported ${data.bimbingan.length} bimbingan.`);

  // 10. Import repositoryItems (map user IDs)
  for (const row of data.repositoryItem) {
    await prisma.repositoryItem.create({
      data: {
        ...row,
        advisorId: row.advisorId ? (userMap[row.advisorId] || dosen.id) : null,
        secondAdvisorId: row.secondAdvisorId ? (userMap[row.secondAdvisorId] || dosen.id) : null,
        uploaderId: userMap[row.uploaderId] || mahasiswa.id,
      }
    });
  }
  console.log(`Imported ${data.repositoryItem.length} repositoryItems.`);

  // 11. Import fileItems
  for (const row of data.fileItem) {
    await prisma.fileItem.create({ data: row });
  }
  console.log(`Imported ${data.fileItem.length} fileItems.`);

  // 12. Seed calendar events
  const now = new Date();
  const y = now.getFullYear();
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
  console.log('10 calendar events seeded.');

  console.log('=== Restore complete ===');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
