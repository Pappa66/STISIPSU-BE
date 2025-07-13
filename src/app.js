require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path =require('path');

// Impor Rute
const menuRoutes = require('./routes/menuRoutes');
const submenuRoutes = require('./routes/submenuRoutes');
const postRoutes = require('./routes/postRoutes');
const pageRoutes = require('./routes/pageRoutes');
const newsRoutes = require('./routes/newsRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const publicContactRoutes = require('./routes/publicContactRoutes');
const publicRoutes = require('./routes/publicRoutes');
const userRoutes = require('./routes/userRoutes');
const repositoryRoutes = require('./routes/repositoryRoutes');
const authRoutes = require('./routes/authRoutes');
const advisorRoutes = require('./routes/advisorRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const myRepositoryRoutes = require('./routes/myRepositoryRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const publicAnnouncementRoutes = require('./routes/publicAnnouncementRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---

// 1. CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: '*', // Untuk development. Ganti dengan URL frontend Anda untuk produksi.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Body Parser untuk membaca JSON
app.use(express.json());

// 3. Static File Server untuk folder 'public'
// PERBAIKAN: Gunakan '..' untuk keluar dari folder 'src' dan menemukan folder 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public/uploads')));


// --- Pendaftaran Rute API ---
app.use('/api/menu-items', menuRoutes);
app.use('/api/submenus', submenuRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/public/contact', publicContactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/repository-items', repositoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/my-repository', myRepositoryRoutes);
app.use('/api/announcements', announcementRoutes); 
app.use('/api/public/announcements', publicAnnouncementRoutes); 


// --- PENANGANAN ERROR TERPUSAT ---
// Middleware ini akan menangkap semua error yang dilempar oleh `next(error)` di controller
app.use((err, req, res, next) => {
    console.error(err.stack); // Log error di console server
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Terjadi kesalahan internal pada server.';
    res.status(statusCode).json({
        success: false,
        message,
        // Tampilkan stack trace hanya saat mode development
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});


// --- Menjalankan Server ---
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
