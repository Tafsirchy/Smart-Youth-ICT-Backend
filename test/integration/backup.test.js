/**
 * Database backup hardening.
 *
 * A backup holds every document in the database, so it is produced with the
 * credential fields removed, compressed and encrypted while it streams, and
 * the artifact is removed from disk once it has been handed over.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const { request } = require('../helpers/request');
const { createUser } = require('../helpers/auth');
const { createBranch } = require('../helpers/fixtures');
const {
  decryptBackup,
  isSensitiveField,
  redactDocument,
  resolveBackupKey,
  BACKUP_FILE_EXTENSION,
} = require('../../src/utils/backup');

const TEST_KEY = 'a'.repeat(64);
const TEST_KEY_ID = 'test/kms/syict-backup';

const binaryParser = (res, callback) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

let backupDir;
let previousKey;
let previousKeyId;
let previousBackupDir;

const downloadBackup = (auth) =>
  request()
    .get('/api/super/system/backup/download')
    .set(auth)
    .buffer(true)
    .parse(binaryParser);

beforeAll(() => {
  backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syict-backup-test-'));
  previousKey = process.env.BACKUP_ENCRYPTION_KEY;
  previousKeyId = process.env.BACKUP_ENCRYPTION_KEY_ID;
  previousBackupDir = process.env.BACKUP_DIR;
  process.env.BACKUP_ENCRYPTION_KEY = TEST_KEY;
  process.env.BACKUP_ENCRYPTION_KEY_ID = TEST_KEY_ID;
  process.env.BACKUP_DIR = backupDir;
});

afterAll(() => {
  if (previousKey === undefined) delete process.env.BACKUP_ENCRYPTION_KEY;
  else process.env.BACKUP_ENCRYPTION_KEY = previousKey;

  if (previousKeyId === undefined) delete process.env.BACKUP_ENCRYPTION_KEY_ID;
  else process.env.BACKUP_ENCRYPTION_KEY_ID = previousKeyId;

  if (previousBackupDir === undefined) delete process.env.BACKUP_DIR;
  else process.env.BACKUP_DIR = previousBackupDir;

  fs.rmSync(backupDir, { recursive: true, force: true });
});

describe('database backup', () => {
  describe('field redaction', () => {
    it('treats credential fields as sensitive', () => {
      ['password', 'resetToken', 'inviteToken', 'verificationToken', 'twoFactorSecret', 'twoFactorOtp', 'sessionTokens', 'emailOtp', 'apiKey'].forEach((field) => {
        expect(isSensitiveField(field)).toBe(true);
      });
    });

    it('keeps business fields', () => {
      ['email', 'name', 'price', 'couponCode', 'referralCode', 'tokenVersion', 'branchId'].forEach((field) => {
        expect(isSensitiveField(field)).toBe(false);
      });
    });

    it('redacts nested credential fields', () => {
      const redacted = redactDocument({
        email: 'student@test.local',
        password: 'hashed',
        profile: { resetToken: 'abc', city: 'Dhaka' },
      });

      expect(redacted.email).toBe('student@test.local');
      expect('password' in redacted).toBe(false);
      expect('resetToken' in redacted.profile).toBe(false);
      expect(redacted.profile.city).toBe('Dhaka');
    });
  });

  describe('encryption key', () => {
    it('fails closed when no key is configured', () => {
      expect(() => resolveBackupKey({})).toThrow(/not configured/i);
      try {
        resolveBackupKey({});
      } catch (error) {
        expect(error.code).toBe('BACKUP_KEY_MISSING');
      }
    });

    it('accepts a 32 byte key and records the key id', () => {
      const resolved = resolveBackupKey({ BACKUP_ENCRYPTION_KEY: TEST_KEY, BACKUP_ENCRYPTION_KEY_ID: 'kms/one' });
      expect(resolved.key).toHaveLength(32);
      expect(resolved.keyId).toBe('kms/one');
    });
  });

  describe('download endpoint', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request().get('/api/super/system/backup/download');
      expect(res.status).toBe(401);
    });

    it('rejects a non super admin', async () => {
      const student = await createUser({ role: 'student' });
      const res = await downloadBackup(student.auth);
      expect(res.status).toBe(403);
    });

    it('returns an encrypted artifact to a super admin', async () => {
      const branch = await createBranch();
      const superAdmin = await createUser({ role: 'super_admin' });

      const res = await downloadBackup(superAdmin.auth);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/octet-stream/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-disposition']).toContain(BACKUP_FILE_EXTENSION);
      expect(res.headers['cache-control']).toBe('no-store');

      const artifact = res.body;
      expect(Buffer.isBuffer(artifact)).toBe(true);
      expect(artifact.length).toBeGreaterThan(0);

      const { header, data } = decryptBackup(artifact, resolveBackupKey().key);

      expect(header.algorithm).toBe('aes-256-gcm');
      expect(header.keyId).toBe(TEST_KEY_ID);
      expect(data.manifest.database).toBeDefined();
      expect(data.manifest.totalRecords).toBeGreaterThan(0);
      expect(data.collections).toHaveProperty('users');
      expect(data.collections.users.length).toBeGreaterThan(0);
      expect(data.collections.branches.length).toBeGreaterThan(0);
      expect(branch._id.toString()).toBeTruthy();
    });

    it('keeps credential fields out of the artifact', async () => {
      const superAdmin = await createUser({ role: 'super_admin' });

      const res = await downloadBackup(superAdmin.auth);
      const { data } = decryptBackup(res.body, resolveBackupKey().key);

      const user = data.collections.users.find((entry) => entry.email === superAdmin.user.email);
      expect(user).toBeDefined();
      expect(user.name).toBe(superAdmin.user.name);
      expect(user.password).toBeUndefined();
      expect(user.resetToken).toBeUndefined();
      expect(user.inviteToken).toBeUndefined();
      expect(user.verificationToken).toBeUndefined();
      expect(user.twoFactorSecret).toBeUndefined();
      expect(user.twoFactorOtp).toBeUndefined();

      const raw = JSON.stringify(data);
      expect(raw).not.toMatch(/twoFactorSecret/);
      expect(raw).not.toMatch(/resetToken/);
    });

    it('refuses to produce an unencrypted backup when the key is missing', async () => {
      const superAdmin = await createUser({ role: 'super_admin' });
      const saved = process.env.BACKUP_ENCRYPTION_KEY;
      delete process.env.BACKUP_ENCRYPTION_KEY;

      try {
        const res = await request().get('/api/super/system/backup/download').set(superAdmin.auth);
        expect(res.status).toBe(503);
        expect(res.body.message).toMatch(/encryption key/i);
      } finally {
        process.env.BACKUP_ENCRYPTION_KEY = saved;
      }
    });

    it('does not leave the artifact on disk', async () => {
      const superAdmin = await createUser({ role: 'super_admin' });

      const res = await downloadBackup(superAdmin.auth);
      expect(res.status).toBe(200);

      const deadline = Date.now() + 3000;
      let remaining = fs.readdirSync(backupDir);

      while (remaining.length > 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        remaining = fs.readdirSync(backupDir);
      }

      expect(remaining).toEqual([]);
    });

    it('rejects a tampered artifact', async () => {
      const superAdmin = await createUser({ role: 'super_admin' });

      const res = await downloadBackup(superAdmin.auth);
      const artifact = Buffer.from(res.body);
      artifact[artifact.length - 1] ^= 0xff;

      expect(() => decryptBackup(artifact, resolveBackupKey().key)).toThrow();
    });
  });
});
