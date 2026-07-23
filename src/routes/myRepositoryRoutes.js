const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  getMyItems,
  createMyItem,
  updateMyItem,
} = require("../controllers/myRepositoryController");

// middleware protect harus function
router.use(protect);

router.route("/").get(getMyItems).post(upload.array("files", 10), createMyItem);

router.route("/:id").put(upload.array("files", 10), updateMyItem); // jangan lupa middleware upload di sini juga!

module.exports = router;
