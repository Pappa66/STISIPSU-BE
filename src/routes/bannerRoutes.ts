const express = require("express");
const router = express.Router();
const {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} = require("../controllers/bannerController");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Publik
router.get("/", getActiveBanners);

// Admin
router.get("/admin/all", protect, isAdmin, getAllBanners);
router.post("/", protect, isAdmin, upload.single("image"), createBanner);
router.put("/reorder", protect, isAdmin, reorderBanners);
router.put("/:id", protect, isAdmin, upload.single("image"), updateBanner);
router.delete("/:id", protect, isAdmin, deleteBanner);

module.exports = router;
