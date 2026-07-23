const express = require('express');
const router = express.Router();
const {
    getGalleryImages,
    uploadGalleryImages,
    updateGalleryImage,
    deleteGalleryImage,
    //reorderGalleryImages,
} = require('../controllers/galleryController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // Asumsi Anda punya middleware upload

// Rute untuk mengambil semua gambar (bisa untuk publik)
router.get('/', getGalleryImages);

// Rute untuk mengurutkan ulang (khusus admin)
//router.put('/reorder', protect, isAdmin, reorderGalleryImages);

// Rute untuk upload gambar baru (khusus admin)
// 'galleryImages' adalah nama field, 10 adalah batas maksimal file per upload
router.post('/upload', protect, isAdmin, upload.array('galleryImages', 10), uploadGalleryImages);

// Rute untuk update & delete satu gambar (khusus admin)
router.route('/:id')
    .put(protect, isAdmin, updateGalleryImage)
    .delete(protect, isAdmin, deleteGalleryImage);

module.exports = router;