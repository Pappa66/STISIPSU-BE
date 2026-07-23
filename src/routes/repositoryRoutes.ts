// File: src/routes/repositoryRoutes.js

const express = require('express');
const router = express.Router();

const { 
  getPublicRepositoryItems,
  getAllRepositoryItemsForAdmin,
  createRepositoryItem, 
  updateRepositoryItem, 
  deleteRepositoryItem, 
  getRepositoryItemById, 
  addFilesToRepositoryItem,
  deleteFileItem,
  getRepositoryStats,
  incrementRepositoryViews
} = require('../controllers/repositoryController');   

const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// === PENTING: ROUTE YANG SPESIFIK TARUH DI ATAS
router.get("/stats", getRepositoryStats);                
router.patch("/:id/views", incrementRepositoryViews);

// === Route Publik
router.route("/")
  .get(getPublicRepositoryItems)
  .post(protect, isAdmin, upload.array('files', 10), createRepositoryItem);

router.route("/admin/all")
  .get(protect, isAdmin, getAllRepositoryItemsForAdmin);

router.route("/:id/files")
  .post(protect, isAdmin, upload.array('files', 10), addFilesToRepositoryItem);

router.route("/files/:fileId")
  .delete(protect, isAdmin, deleteFileItem);

// === Route Dinamis HARUS DITARUH PALING BAWAH
router.route('/:id')
  .get(getRepositoryItemById)
  .put(protect, isAdmin, updateRepositoryItem)
  .delete(protect, isAdmin, deleteRepositoryItem);

module.exports = router;
