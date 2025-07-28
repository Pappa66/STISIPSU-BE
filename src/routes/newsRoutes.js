const express = require('express');
const router = express.Router();
const { createNews, getAllNews } = require('../controllers/newsController');
// Kita tetap butuh fungsi dari postController untuk edit/delete by ID
const { getPostById, updatePost, deletePost } = require('../controllers/postController'); 
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Route untuk mendapatkan semua Berita dan membuat Berita baru
router.route('/')
    .get(protect, isAdmin, getAllNews)
    .post(protect, isAdmin, createNews);

// Route untuk aksi pada satu berita berdasarkan ID
// Kita bisa gunakan kembali fungsi dari postController
router.route('/:id')
    .get(getPostById) // Bisa untuk publik atau admin
    .put(protect, isAdmin, updatePost)
    .delete(protect, isAdmin, deletePost);

module.exports = router;