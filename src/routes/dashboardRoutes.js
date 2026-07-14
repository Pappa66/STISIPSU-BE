const express = require("express");
const router = express.Router();
const { getStats } = require("../controllers/dashboardController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/stats", protect, isAdmin, getStats);

module.exports = router;
