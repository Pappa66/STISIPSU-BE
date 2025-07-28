const express = require("express");
const router = express.Router();

// Impor kedua fungsi dari publicNewsController
const { getPublicNews, getPublicNewsBySlug } = require("../controllers/publicNewsController");
// Impor fungsi dari publicGalleryController yang baru
const { getPublicGallery } = require("../controllers/publicGalleryController");

// Rute untuk mengambil semua berita
router.get("/news", getPublicNews);

// Rute untuk mengambil satu berita berdasarkan slug
router.get("/news/:slug", getPublicNewsBySlug);

// --- Rute BARU untuk Galeri --- 
router.get("/gallery", getPublicGallery);

module.exports = router;
