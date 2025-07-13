const express = require('express');
const router = express.Router();
// Kita hanya butuh satu fungsi dari controller
const { getContactInfo } = require('../controllers/contactController');

// Rute ini bersifat publik untuk menampilkan info kontak di website utama
router.get('/info', getContactInfo);

module.exports = router;