const path = require('path');
const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`)
});

const fileFilter = (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format file tidak diizinkan! Hanya PDF, Gambar, dan Video.'), false);
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 1024 * 1024 * 10 } });

router.post('/', protect, upload.single('upload'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Tidak ada file yang diunggah.' });
    }
    
    // PERBAIKAN FINAL: Kirim path tanpa garis miring di depan
    const fileUrl = `uploads/${req.file.filename}`; 
    
    res.status(201).json({
        message: 'File berhasil diunggah',
        url: fileUrl, // Hasil: "uploads/12345.jpg"
    });
});

module.exports = router;
