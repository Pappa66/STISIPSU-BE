const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const exportDatabase = async (req, res, next) => {
  try {
    const tables = [
      'user',
      'menuItem',
      'subMenuItem',
      'repositoryItem',
      'fileItem',
      'bimbingan',
      'notification',
      'post',
      'banner',
      'galleryImage',
      'announcement',
      'setting',
    ];

    const backup = {};
    for (const table of tables) {
      try {
        backup[table] = await prisma[table].findMany();
      } catch {
        backup[table] = [];
      }
    }

    backup._exportedAt = new Date().toISOString();
    backup._version = '1.0';

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=stisipsu-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.status(200).json(backup);
  } catch (error) {
    next(error);
  }
};

module.exports = { exportDatabase };
