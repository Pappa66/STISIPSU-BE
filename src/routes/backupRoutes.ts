const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { exportDatabase } = require('../controllers/backupController');

router.get('/export', protect, isAdmin, exportDatabase);

module.exports = router;
