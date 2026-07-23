require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// === Middleware ===
const allowedOrigins = [
  'http://localhost:3000',
  'https://stisipsu.ac.id',
  'https://www.stisipsu.ac.id',
  'https://stisipsu-fe.vercel.app',
  'https://stisipsu-be.vercel.app',
  'https://stisip-fe.vercel.app',
  'https://stisip-be.vercel.app',
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// === Health Check (no rate limit) ===
app.get('/api/health', (req, res) => res.json({ status: 'ok', node: process.version }));

// === Rate Limiting ===
const { publicLimiter, authLimiter, apiLimiter } = require('../src/middleware/rateLimiter');

// === Vercel-specific overrides (registered first, so they take priority) ===
const { protect } = require('../src/middleware/authMiddleware');
const upload = require('./upload');
const { uploadToSupabase } = require('../src/utils/storage');
const { generateFilename, optimizeImage } = require('./upload');

// Download override
app.use('/api/download', require('./download'));

// Upload override (rich text editor uploads)
app.post('/api/upload', protect, upload.single('upload'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
  try {
    const { buffer, mimetype } = await optimizeImage(req.file.buffer, req.file.mimetype);
    const fname = generateFilename(req.file.originalname);
    const url = await uploadToSupabase(buffer, fname, mimetype);
    res.status(201).json({ message: 'File berhasil diunggah', url });
  } catch (e) { next(e); }
});

// Gallery upload override
const { PrismaClient } = require('@prisma/client');
const { isAdmin } = require('../src/middleware/authMiddleware');
const prisma = new PrismaClient();

app.post('/api/gallery/upload', protect, isAdmin, upload.array('galleryImages', 10), async (req, res, next) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
  try {
    const lastImage = await prisma.galleryImage.findFirst({ orderBy: { order: 'desc' } });
    let currentOrder = lastImage ? lastImage.order + 1 : 0;

    const images = await Promise.all(
      req.files.map(async (file, index) => {
        const { buffer, mimetype } = await optimizeImage(file.buffer, file.mimetype);
        const fname = generateFilename(file.originalname);
        const url = await uploadToSupabase(buffer, fname, mimetype);
        return prisma.galleryImage.create({
          data: {
            title: file.originalname.split('.').slice(0, -1).join('.'),
            description: '',
            imageUrl: url,
            order: currentOrder + index,
          },
        });
      })
    );
    res.status(201).json({ message: `${images.length} gambar berhasil diunggah.` });
  } catch (e) { next(e); }
});

// Repository & MyRepository overrides (full route replacements)
app.use('/api/repository-items', publicLimiter, require('./routes/repository'));
app.use('/api/my-repository', require('./routes/myRepository'));

// === Original routes (untouched, imported from src/) ===
app.use('/api/menu-items', require('../src/routes/menuRoutes'));
app.use('/api/submenus', require('../src/routes/submenuRoutes'));
app.use('/api/public', publicLimiter, require('../src/routes/publicRoutes'));
app.use('/api/pages', require('../src/routes/pageRoutes'));
app.use('/api/posts', require('../src/routes/postRoutes'));
app.use('/api/news', require('../src/routes/newsRoutes'));
app.use('/api/gallery', require('../src/routes/galleryRoutes'));
app.use('/api/contact', require('../src/routes/contactRoutes'));
app.use('/api/public/contact', publicLimiter, require('../src/routes/publicContactRoutes'));
app.use('/api/users', require('../src/routes/userRoutes'));
app.use('/api/advisor', require('../src/routes/advisorRoutes'));
app.use('/api/announcements', require('../src/routes/announcementRoutes'));
app.use('/api/public/announcements', publicLimiter, require('../src/routes/publicAnnouncementRoutes'));
app.use('/api/public', publicLimiter, require('../src/routes/publicSearchRoutes'));
app.use('/api/banners', require('../src/routes/bannerRoutes'));
app.use('/api/footer-links', require('../src/routes/footerRoutes'));
app.use('/api/public/footer-links', publicLimiter, require('../src/routes/publicFooterRoutes'));
app.use('/api/dashboard', require('../src/routes/dashboardRoutes'));
app.use('/api/citation', require('../src/routes/citationRoutes'));
app.use('/api/notifications', require('../src/routes/notificationRoutes'));
app.use('/api/backup', require('../src/routes/backupRoutes'));

app.use('/api/activity-logs', require('../src/routes/activityLogRoutes'));

app.use('/api/auth', require('../src/routes/googleAuthRoutes'));

// === Error Handler ===
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal pada server.',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
