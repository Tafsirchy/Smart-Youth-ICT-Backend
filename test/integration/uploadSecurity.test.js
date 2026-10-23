/**
 * Upload security.
 *
 * An upload is identified by its content. The declared MIME type and the file
 * name are attacker-controlled, so neither decides what a file is or how it
 * is stored.
 */
const { request } = require('../helpers/request');
const { createUser } = require('../helpers/auth');
const { createBranch } = require('../helpers/fixtures');
const { validateImageUpload, detectImageType, MAX_UPLOAD_BYTES } = require('../../src/utils/imageValidation');

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
]);

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const GIF_BYTES = Buffer.from('GIF89a', 'ascii');
const WEBP_BYTES = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x1a, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);
const SVG_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'utf8');

describe('upload security', () => {
  describe('detectImageType', () => {
    it('identifies the supported formats', () => {
      expect(detectImageType(PNG_BYTES)).toEqual({ mime: 'image/png', ext: 'png' });
      expect(detectImageType(JPEG_BYTES)).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
      expect(detectImageType(GIF_BYTES)).toEqual({ mime: 'image/gif', ext: 'gif' });
      expect(detectImageType(WEBP_BYTES)).toEqual({ mime: 'image/webp', ext: 'webp' });
    });

    it('does not identify active content', () => {
      expect(detectImageType(SVG_BYTES)).toBeNull();
      expect(detectImageType(Buffer.from('<html><body>hi</body></html>'))).toBeNull();
    });

    it('does not identify an empty buffer', () => {
      expect(detectImageType(Buffer.alloc(0))).toBeNull();
      expect(detectImageType(null)).toBeNull();
    });
  });

  describe('validateImageUpload', () => {
    it('accepts a real image', () => {
      const result = validateImageUpload(PNG_BYTES, 'image/png');
      expect(result.ok).toBe(true);
      expect(result.ext).toBe('png');
    });

    it('accepts the image/jpg alias', () => {
      const result = validateImageUpload(JPEG_BYTES, 'image/jpg');
      expect(result.ok).toBe(true);
    });

    it('rejects a file whose content is not an image', () => {
      const result = validateImageUpload(SVG_BYTES, 'image/svg+xml');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(415);
    });

    it('rejects a declared type that does not match the content', () => {
      const result = validateImageUpload(PNG_BYTES, 'image/jpeg');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(415);
    });

    it('rejects an oversized file', () => {
      const result = validateImageUpload(Buffer.alloc(MAX_UPLOAD_BYTES + 1), 'image/png');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(413);
    });
  });

  describe('POST /api/assets/upload', () => {
    let branch;

    beforeEach(async () => {
      branch = await createBranch({ name: 'Upload Campus', code: 'UPLD' });
    });

    it('denies a student', async () => {
      const student = await createUser({ role: 'student', branchId: branch._id });
      const res = await request()
        .post('/api/assets/upload')
        .set(student.auth)
        .attach('image', PNG_BYTES, { filename: 'avatar.png', contentType: 'image/png' });

      expect(res.status).toBe(403);
    });

    it('denies an employee without the permission', async () => {
      const employee = await createUser({ role: 'employee', branchId: branch._id, permissions: [] });
      const res = await request()
        .post('/api/assets/upload')
        .set(employee.auth)
        .attach('image', PNG_BYTES, { filename: 'avatar.png', contentType: 'image/png' });

      expect(res.status).toBe(403);
    });

    it('rejects a file that only claims to be an image', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branch._id });
      const res = await request()
        .post('/api/assets/upload')
        .set(admin.auth)
        .attach('image', SVG_BYTES, { filename: 'avatar.svg', contentType: 'image/svg+xml' });

      expect(res.status).toBe(415);
    });

    it('rejects an image whose content does not match the declared type', async () => {
      const admin = await createUser({ role: 'branch_admin', branchId: branch._id });
      const res = await request()
        .post('/api/assets/upload')
        .set(admin.auth)
        .attach('image', PNG_BYTES, { filename: 'avatar.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(415);
    });
  });
});
