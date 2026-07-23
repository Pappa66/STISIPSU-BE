const express = require('express');
const router = express.Router();
const {
    getAllAnnouncementsAdmin,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, isAdmin, getAllAnnouncementsAdmin)
    .post(protect, isAdmin, createAnnouncement);

router.route('/:id')
    .put(protect, isAdmin, updateAnnouncement)
    .delete(protect, isAdmin, deleteAnnouncement);

module.exports = router;
