const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');

const { 
    getAdvisedStudentsList,
    getStudentSubmissions,
    reviewItem,
    addAdvisedStudent,
    addAdvisedStudentsFromExcel
} = require('../controllers/advisorController');

// Konfigurasi Multer untuk menangani file Excel di memori
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak valid. Hanya file Excel (.xls, .xlsx) yang diizinkan.'), false);
        }
    }
});

// --- RUTE TERPROTEKSI ---
router.use(protect);

// Rute untuk mendapatkan daftar mahasiswa bimbingan
router.get('/students', getAdvisedStudentsList);

// Rute untuk mendapatkan semua kiriman dari satu mahasiswa
router.get('/students/:studentId/items', getStudentSubmissions);

// Rute untuk mereview satu karya ilmiah
router.put('/items/:itemId/review', reviewItem);

// Rute untuk menambah mahasiswa bimbingan
router.post('/students', addAdvisedStudent);
router.post('/students/bulk', upload.single('file'), addAdvisedStudentsFromExcel);

module.exports = router;
