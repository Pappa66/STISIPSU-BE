const express = require('express');
const router = express.Router();
const { getFooterLinks, updateFooterLinks } = require('../controllers/footerController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, isAdmin, getFooterLinks)
    .put(protect, isAdmin, updateFooterLinks);

module.exports = router;
