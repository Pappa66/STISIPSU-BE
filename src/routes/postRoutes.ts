const express = require('express');
const router = express.Router();
const { 
    createPost, // <-- 1. Impor fungsi createPost
    getPosts, 
    getPostById, 
    updatePost, 
    deletePost 
} = require('../controllers/postController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @desc    Mendapatkan semua postingan atau Membuat postingan baru
// @route   GET /api/posts, POST /api/posts
router.route('/')
    .get(protect, isAdmin, getPosts)
    .post(protect, isAdmin, createPost); // <-- 2. Tambahkan rute POST di sini

// @desc    Mendapatkan, memperbarui, atau menghapus satu postingan
// @route   GET, PUT, DELETE /api/posts/:id
router.route('/:id')
    .get(getPostById) // Publik
    .put(protect, isAdmin, updatePost)
    .delete(protect, isAdmin, deletePost);

module.exports = router;
