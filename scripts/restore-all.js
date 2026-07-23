const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  // 1. Delete all data in FK-safe order
  const deleteOrder = [
    'fileItem', 'subMenuItem', 'menuItem', 'galleryImage', 'post',
    'bimbingan', 'repositoryItem', 'notification', 'activityLog',
    'announcement', 'setting', 'banner', 'calendarEvent', 'user'
  ];
  for (const t of deleteOrder) {
    await prisma[t].deleteMany({});
  }
  console.log('All existing data cleared.');

  // 2. Restore from database.sql — table names are PascalCase in Postgres
  const sqlPath = path.join(__dirname, '..', 'deliverable', 'database.sql');
  let sql = fs.readFileSync(sqlPath, 'utf-8');

  // Strip BEGIN/COMMIT, fix table name casing
  sql = sql.replace(/^BEGIN;?\s*/m, '').replace(/^\s*COMMIT;?\s*/m, '');
  const replaceMap = {
    '"menuItem"': '"MenuItem"',
    '"subMenuItem"': '"SubMenuItem"',
    '"post"': '"Post"',
    '"galleryImage"': '"GalleryImage"',
    '"announcement"': '"Announcement"',
    '"setting"': '"Setting"',
    '"repositoryItem"': '"RepositoryItem"',
    '"fileItem"': '"FileItem"',
    '"bimbingan"': '"Bimbingan"',
  };
  for (const [from, to] of Object.entries(replaceMap)) {
    sql = sql.replaceAll(from, to);
  }

  const inserts = sql.match(/INSERT INTO "[^"]+" .*?;/gs);
  if (!inserts) throw new Error('No INSERT statements found');

  for (const insert of inserts) {
    try {
      await prisma.$executeRawUnsafe(insert);
    } catch (e) {
      console.error('SQL error:', insert.slice(0, 80) + '...', e.message);
    }
  }
  console.log(`Restored ${inserts.length} rows from database.sql`);

  // 3. Seed users (password: Stisip2025!)
  const hp = await bcrypt.hash('Stisip2025!', 10);
  const admin = await prisma.user.create({
    data: { email: 'admin@stisipsu.ac.id', name: 'Admin Utama', password: hp, role: 'ADMIN', userCode: 'ADM-UTAMA' }
  });
  await prisma.user.create({
    data: { email: 'dosen@kampus.com', name: 'Dr. Budi Santoso, M.Si.', password: hp, role: 'DOSEN', npd: '1234567890123456', userCode: 'DSN-BUDI' }
  });
  await prisma.user.create({
    data: { email: 'mahasiswa@kampus.com', name: 'Ani Lestari', password: hp, role: 'MAHASISWA', studyProgram: 'Ilmu Pemerintahan', npm: '211234567', entryYear: 2021, userCode: 'MHS-IP-567-2021' }
  });
  console.log('3 users seeded (Stisip2025!)');

  // 4. Seed calendar events
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
  console.log('10 calendar events seeded');

  // 5. Fix post author references — the old database.sql uses user IDs that no longer exist.
  // Map old IDs to the new admin user.
  const oldAuthorIds = [
    'cmdpqcgww0000jsxzq6sh9l50',
    'cmdpqcgwz0001jsxznv34qybj',
    'cmdpqcgx20002jsxz9pdwqb56'
  ];
  for (const oldId of oldAuthorIds) {
    await prisma.post.updateMany({ where: { authorId: oldId }, data: { authorId: admin.id } });
  }
  console.log('Post author references fixed');

  // 6. Fix repositoryItem references (advisorId, secondAdvisorId, uploaderId)
  const dosen = await prisma.user.findFirst({ where: { role: 'DOSEN' } });
  const mahasiswa = await prisma.user.findFirst({ where: { role: 'MAHASISWA' } });
  const items = await prisma.repositoryItem.findMany();
  for (const item of items) {
    await prisma.repositoryItem.update({
      where: { id: item.id },
      data: {
        uploaderId: mahasiswa ? mahasiswa.id : item.uploaderId,
        advisorId: item.advisorId ? (dosen ? dosen.id : item.advisorId) : null,
        secondAdvisorId: item.secondAdvisorId ? (dosen ? dosen.id : item.secondAdvisorId) : null,
      }
    });
  }
  console.log('RepositoryItem references fixed');

  // 7. Fix bimbingan references
  const bim = await prisma.bimbingan.findMany();
  for (const b of bim) {
    await prisma.bimbingan.update({
      where: { id: b.id },
      data: {
        dosenId: dosen ? dosen.id : b.dosenId,
        mahasiswaId: mahasiswa ? mahasiswa.id : b.mahasiswaId,
      }
    });
  }
  console.log('Bimbingan references fixed');

  console.log('=== Restore complete ===');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
