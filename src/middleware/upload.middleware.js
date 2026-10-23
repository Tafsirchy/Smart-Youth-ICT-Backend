const multer = require('multer');
const { ALLOWED_IMAGE_TYPES } = require('../utils/imageValidation');

// Store file in memory to forward buffer to ImageBB
const storage = multer.memoryStorage();

// Only the exact image types the product accepts. `image/*` would also let
// through formats such as SVG, which can carry active content.
const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').split(';')[0].trim().toLowerCase();
  const normalized = mime === 'image/jpg' ? 'image/jpeg' : mime;

  if (ALLOWED_IMAGE_TYPES.includes(normalized)) {
    cb(null, true);
  } else {
    const error = new Error('Only JPEG, PNG, WebP and GIF images are allowed!');
    error.status = 415;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter,
});

module.exports = upload;
