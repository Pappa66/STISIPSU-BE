const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { getMyItems, createMyItem, updateMyItem } = require('../controllers/myRepositoryController');

// Semua route di sini memerlukan login (sebagai mahasiswa)
router.use(protect);

router.route('/')
    .get(getMyItems)
    .post(upload.array('files', 10), createMyItem);

router.route('/:id')
    .put(updateMyItem);

module.exports = router;
