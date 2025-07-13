const express = require('express');
const router = express.Router();
// Tambahkan reorderSubMenuItems ke dalam import
const { createSubMenuItem, deleteSubMenuItem, reorderSubMenuItems } = require('../controllers/submenuController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Route baru untuk reorder
router.route('/reorder')
    .put(protect, isAdmin, reorderSubMenuItems);

router.route('/')
    .post(protect, isAdmin, createSubMenuItem);

router.route('/:id')
    .delete(protect, isAdmin, deleteSubMenuItem);

module.exports = router;