const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const prisma = new PrismaClient();

// GET / — current user's activity logs, paginated
router.get('/', protect, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (e) {
    next(e);
  }
});

// GET /all — all activity logs (admin only), paginated
router.get('/all', protect, isAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count(),
    ]);

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
