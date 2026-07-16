const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const exportDatabase = async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;

    const yearFilter = year ? { year } : {};

    const staticTables = [
      'user',
      'menuItem',
      'subMenuItem',
      'bimbingan',
      'notification',
      'post',
      'banner',
      'galleryImage',
      'announcement',
      'setting',
    ];

    const backup = {};

    // Static tables (all data)
    for (const table of staticTables) {
      try {
        backup[table] = await prisma[table].findMany();
      } catch {
        backup[table] = [];
      }
    }

    // Repository items filtered by year
    const repoItems = await prisma.repositoryItem.findMany({
      where: yearFilter,
      include: { files: true },
    });
    backup.repositoryItem = repoItems;
    backup.fileItem = repoItems.flatMap(r => r.files);
    repoItems.forEach(r => delete r.files);

    backup._exportedAt = new Date().toISOString();
    backup._version = '1.0';
    backup._year = year || 'all';

    const suffix = year ? `tahun-${year}` : new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=stisipsu-backup-${suffix}.json`);
    res.status(200).json(backup);
  } catch (error) {
    next(error);
  }
};

module.exports = { exportDatabase };
