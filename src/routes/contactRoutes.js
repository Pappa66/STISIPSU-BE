const express = require('express');
const router = express.Router();
const { getContactInfo, updateContactInfo } = require('../controllers/contactController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Rute untuk admin mengambil dan memperbarui data
router.route('/')
    .get(protect, isAdmin, getContactInfo)
    .put(protect, isAdmin, updateContactInfo);

module.exports = router;
