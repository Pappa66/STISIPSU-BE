const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

function generateFilename(originalname, mimetype) {
  const unique = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  if (mimetype === 'image/png') return `${unique}.png`;
  if (mimetype === 'image/webp') return `${unique}.webp`;
  if (mimetype === 'image/jpeg') return `${unique}.jpg`;
  const ext = path.extname(originalname);
  return `${unique}${ext}`;
}

async function optimizeImage(buffer, mimetype) {
  if (!mimetype.startsWith('image/')) return { buffer, mimetype };
  try {
    const metadata = await sharp(buffer).metadata();
    const maxWidth = 1920;
    const maxHeight = 1080;
    let width = metadata.width;
    let height = metadata.height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const hasAlpha = metadata.channels === 4;

    const pipeline = sharp(buffer).resize(width, height, { fit: 'inside', withoutEnlargement: true });

    if (hasAlpha) {
      const optimized = await pipeline.png({ quality: 80, palette: true }).toBuffer();
      return { buffer: optimized, mimetype: 'image/png' };
    }

    const optimized = await pipeline.jpeg({ quality: 80, progressive: true }).toBuffer();
    return { buffer: optimized, mimetype: 'image/jpeg' };
  } catch (e) {
    return { buffer, mimetype };
  }
}

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
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
module.exports.optimizeImage = optimizeImage;
