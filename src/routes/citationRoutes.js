const express = require("express");
const router = express.Router();
const { getCitation } = require("../controllers/citationController");

router.get("/:id", getCitation);

module.exports = router;
