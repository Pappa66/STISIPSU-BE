//authRoutes
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { login } = require("../controllers/authController");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Terlalu banyak percobaan login. Coba lagi 15 menit." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post("/login", loginLimiter, login);

module.exports = router;
