const express = require('express');
const router = express.Router();
const { 
    getMenuItems, 
    getMenuItemById,
    createMenuItem, 
    updateMenuItem, 
    deleteMenuItem, 
    reorderMenuItems 
} = require('../controllers/menuController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.route('/reorder')
    .put(protect, isAdmin, reorderMenuItems);

router.route('/')
    .get(getMenuItems)
    .post(protect, isAdmin, createMenuItem);

// Rute ini sekarang bisa GET (publik), PUT, dan DELETE
router.route('/:id')
    .get(getMenuItemById) // <-- Ditambahkan
    .put(protect, isAdmin, updateMenuItem)
    .delete(protect, isAdmin, deleteMenuItem);

module.exports = router;
