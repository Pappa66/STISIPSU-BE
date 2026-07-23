const express = require('express');
const router = express.Router();
const { getHeroSection } = require('../controllers/heroController');

router.get('/', getHeroSection);

module.exports = router;
