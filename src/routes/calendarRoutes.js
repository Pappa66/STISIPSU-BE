const express = require("express");
const router = express.Router();
const {
  getPublicEvents,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/calendarController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.get("/", getPublicEvents);
router.get("/admin/all", protect, isAdmin, getAllEvents);
router.post("/", protect, isAdmin, createEvent);
router.put("/:id", protect, isAdmin, updateEvent);
router.delete("/:id", protect, isAdmin, deleteEvent);

module.exports = router;
