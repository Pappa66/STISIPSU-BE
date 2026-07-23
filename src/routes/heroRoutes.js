const express = require('express');
const router = express.Router();
const { getHeroSection, updateHeroSection } = require('../controllers/heroController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, isAdmin, getHeroSection)
    .put(protect, isAdmin, updateHeroSection);

module.exports = router;
