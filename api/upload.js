const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

function generateFilename(originalname) {
  const ext = path.extname(originalname);
  const unique = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  return `${unique}${ext}`;
}

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak diizinkan! Hanya PDF dan Gambar.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 },
});

module.exports = upload;
module.exports.generateFilename = generateFilename;
