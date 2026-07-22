const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logActivity(userId, action, entity, entityId = null, details = null) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entity, entityId, details: details || undefined },
    });
  } catch (error) {
    console.error('Gagal mencatat aktivitas:', error.message);
  }
}

module.exports = { logActivity };
