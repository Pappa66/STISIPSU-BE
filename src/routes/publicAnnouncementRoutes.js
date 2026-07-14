const express = require('express');
const publicRouter = express.Router();
const { getActiveAnnouncement } = require('../controllers/announcementController');

// Endpoint ini tidak perlu proteksi karena untuk dilihat semua orang
publicRouter.get('/', getActiveAnnouncement);

module.exports = publicRouter;