const express = require('express');
const router = express.Router();
const { createPage, getPages } = require('../controllers/pageController');
// Kita pakai ulang fungsi dari postController karena operasinya sama (berdasarkan ID)
const { getPostById, updatePost, deletePost } = require('../controllers/postController'); 
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Route untuk mendapatkan semua Halaman dan membuat Halaman baru
router.route('/')
    .get(protect, isAdmin, getPages)
    .post(protect, isAdmin, createPage);

// Route untuk aksi pada satu halaman berdasarkan ID
// Tidak perlu membuat fungsi baru karena ID sudah unik
router.route('/:id')
    .get(getPostById) // Bisa untuk publik atau admin
    .put(protect, isAdmin, updatePost)
    .delete(protect, isAdmin, deletePost);

module.exports = router;
