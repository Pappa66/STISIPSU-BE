const express = require("express");
const router = express.Router();

const {
  createSubMenuItem,
  deleteSubMenuItem,
  reorderSubMenuItems,
  updateSubMenuItem,
} = require("../controllers/submenuController");

const { protect, isAdmin } = require("../middleware/authMiddleware");

// Rute untuk mengurutkan ulang semua submenu sekaligus
router.route("/reorder").put(protect, isAdmin, reorderSubMenuItems);

// Rute untuk membuat submenu baru
router.route("/").post(protect, isAdmin, createSubMenuItem);

// Rute untuk satu submenu spesifik berdasarkan ID
router
  .route("/:id")

  .put(protect, isAdmin, updateSubMenuItem)

  .delete(protect, isAdmin, deleteSubMenuItem);

module.exports = router;
