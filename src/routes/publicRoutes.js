const express = require('express');
const router = express.Router();
const { getPostBySlug } = require('../controllers/postController'); // Ambil fungsi baru

// Route ini akan cocok dengan panggilan dari frontend: GET /api/public/posts/kontak
router.get('/posts/:slug', getPostBySlug);

module.exports = router;