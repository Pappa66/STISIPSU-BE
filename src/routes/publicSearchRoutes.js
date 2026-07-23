const express = require("express");
const router = express.Router();
const { searchAll } = require("../controllers/publicSearchController");

router.get("/search", searchAll);

module.exports = router;
