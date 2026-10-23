/**
 * Image validation.
 *
 * A file's type is established from its magic bytes. The declared MIME type
 * and the client-supplied file name are both attacker-controlled, so neither
 * is used to decide what a file is or how it is stored.
 */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const IMAGE_SIGNATURES = [
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    test: (buffer) =>
      buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: 'png',
    test: (buffer) =>
      buffer.length > 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  {
    mime: 'image/gif',
    ext: 'gif',
    test: (buffer) => {
      if (buffer.length < 6) return false;
      const header = buffer.slice(0, 6).toString('ascii');
      return header === 'GIF87a' || header === 'GIF89a';
    },
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    test: (buffer) =>
      buffer.length >= 12 &&
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP',
  },
];

const normalizeMime = (mime) => {
  if (!mime || typeof mime !== 'string') return null;
  const cleaned = mime.split(';')[0].trim().toLowerCase();
  return cleaned === 'image/jpg' ? 'image/jpeg' : cleaned;
};

/**
 * Identify an image from its magic bytes.
 *
 * @param {Buffer} buffer
 * @returns {{ mime: string, ext: string } | null}
 */
const detectImageType = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  const match = IMAGE_SIGNATURES.find((signature) => signature.test(buffer));
  return match ? { mime: match.mime, ext: match.ext } : null;
};

/**
 * Validate an upload buffer against the allowlist.
 *
 * @param {Buffer} buffer
 * @param {string} declaredMime
 * @returns {{ ok: true, mime: string, ext: string } | { ok: false, status: number, message: string }}
 */
const validateImageUpload = (buffer, declaredMime) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { ok: false, status: 400, message: 'No file provided' };
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, message: 'File is too large. The maximum size is 5MB.' };
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    return {
      ok: false,
      status: 415,
      message: 'Unsupported file type. Only JPEG, PNG, WebP and GIF images are accepted.',
    };
  }

  const declared = normalizeMime(declaredMime);
  if (declared && declared !== detected.mime) {
    return {
      ok: false,
      status: 415,
      message: 'The file content does not match its declared type.',
    };
  }

  return { ok: true, mime: detected.mime, ext: detected.ext };
};

module.exports = {
  MAX_UPLOAD_BYTES,
  ALLOWED_IMAGE_TYPES,
  detectImageType,
  validateImageUpload,
};
