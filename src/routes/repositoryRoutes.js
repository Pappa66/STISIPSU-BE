// File: src/routes/repositoryRoutes.js

const express = require('express');
const router = express.Router();

// Impor semua fungsi yang diperlukan dari controller
const { 
    getPublicRepositoryItems,
    getAllRepositoryItemsForAdmin,
    createRepositoryItem, 
    updateRepositoryItem, 
    deleteRepositoryItem, 
    getRepositoryItemById, 
    addFilesToRepositoryItem,
    deleteFileItem
    } = require('../controllers/repositoryController');   

const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ==========================================
// RUTE UNTUK HALAMAN PUBLIK (Tidak perlu login)
// ==========================================

router.route('/')
    .get(getPublicRepositoryItems);

router.route('/:id')
    .get(getRepositoryItemById);

// ==========================================
// RUTE UNTUK DASBOR ADMIN (Perlu login & hak akses admin)
// ==========================================

router.route('/')
    .post(protect, isAdmin, upload.array('files', 10), createRepositoryItem);

router.route('/admin/all')
    .get(protect, isAdmin, getAllRepositoryItemsForAdmin);

router.route('/:id')
    .put(protect, isAdmin, updateRepositoryItem)
    .delete(protect, isAdmin, deleteRepositoryItem);

router.route('/:id/files')
    .post(protect, isAdmin, upload.array('files', 10), addFilesToRepositoryItem);

router.route('/files/:fileId')
    .delete(protect, isAdmin, deleteFileItem);
    
module.exports = router;