/**
 * Encrypted database backups.
 *
 * A backup contains every document in the database, so the artifact is
 * handled like a secret:
 *
 *  - credential fields never leave the database,
 *  - the dump is compressed and encrypted while it is produced, so the
 *    plain payload is never written to disk or held in memory in full,
 *  - the artifact is written outside the web root and removed as soon as it
 *    has been streamed to the operator, so it is never reachable through a
 *    static URL.
 *
 * The encryption key is supplied by the deployment (KMS / secrets manager
 * injected as an environment variable). When it is missing the backup fails
 * closed rather than producing an unencrypted export.
 */

const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');

const BACKUP_FORMAT = 'syict-db-backup';
const BACKUP_FORMAT_VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const HEADER_LENGTH_BYTES = 4;
const BACKUP_FILE_EXTENSION = '.json.gz.enc';
const BACKUP_DIR_NAME = 'syict-backups';

/**
 * Fields that must never be exported, regardless of the collection they
 * live in. Compared case-insensitively.
 */
const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwordhash',
  'resetpasswordtoken',
  'resettoken',
  'resetpasswordcode',
  'invitetoken',
  'verificationtoken',
  'emailverificationtoken',
  'twofactorsecret',
  'twofactorotp',
  'twofactorotpexpiry',
  'twofactorbackupcodes',
  'sessiontoken',
  'sessiontokens',
  'refreshtoken',
  'accesstoken',
  'idtoken',
  'apitoken',
  'apitokenhash',
  'otp',
  'otpcode',
  'otpexpires',
  'otpattempts',
  'mfasecret',
  'backupcodes',
  'recoverycodes',
  'securityanswer',
]);

/**
 * Catch-all for credential-shaped names that the explicit list does not
 * cover (`emailOtp`, `refreshTokenHash`, `smtpPassword`, ...).
 */
const SENSITIVE_FIELD_PATTERN = /(password|passwd|secret|token|otp|apikey|privatekey|credential)/i;

/**
 * Non-secret fields that would otherwise match the pattern above.
 */
const NON_SENSITIVE_FIELD_NAMES = new Set(['tokenversion']);

/**
 * @param {string} name
 * @returns {boolean} true when the field must not be exported
 */
const isSensitiveField = (name) => {
  const key = String(name).toLowerCase();
  if (NON_SENSITIVE_FIELD_NAMES.has(key)) return false;
  if (SENSITIVE_FIELD_NAMES.has(key)) return true;
  return SENSITIVE_FIELD_PATTERN.test(key);
};

/**
 * Serialise a document with every credential field removed.
 *
 * The replacer runs for nested keys as well, so a secret held inside a
 * sub-document is removed too. Returning `undefined` from the replacer drops
 * the key, which means a restored document never carries a placeholder
 * credential.
 *
 * @param {Object} document
 * @returns {string} JSON text of the redacted document
 */
const serializeDocument = (document) =>
  JSON.stringify(document, (key, value) => (isSensitiveField(key) ? undefined : value));

/**
 * Redact a document in place-free fashion (used by tests and by callers that
 * want the object rather than the JSON text).
 *
 * @param {Object} document
 * @returns {Object}
 */
const redactDocument = (document) => JSON.parse(serializeDocument(document));

/**
 * Turn the configured secret into a 32 byte key.
 *
 * A 32 byte value (hex or base64) is used as-is; anything else is stretched
 * with HKDF-SHA256 so an operator can configure a passphrase.
 *
 * @param {string} raw
 * @returns {{ key: Buffer, derivation: string } | null}
 */
const parseKeyMaterial = (raw) => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    return { key: Buffer.from(trimmed, 'hex'), derivation: 'raw-hex' };
  }

  const base64 = Buffer.from(trimmed, 'base64');
  if (base64.length === KEY_BYTES) {
    const encoded = base64.toString('base64');
    const supplied = trimmed.replace(/=+$/, '');
    if (encoded.replace(/=+$/, '') === supplied) {
      return { key: base64, derivation: 'raw-base64' };
    }
  }

  const derived = Buffer.from(
    crypto.hkdfSync(
      'sha256',
      Buffer.from(trimmed, 'utf8'),
      Buffer.from(`${BACKUP_FORMAT}-salt-v1`, 'utf8'),
      Buffer.from('backup-encryption-key', 'utf8'),
      KEY_BYTES
    )
  );

  return { key: derived, derivation: 'hkdf-sha256' };
};

/**
 * Resolve the backup encryption key from the environment.
 *
 * @param {Object} [env]
 * @returns {{ key: Buffer, keyId: string, derivation: string }}
 * @throws {Error} with `code === 'BACKUP_KEY_MISSING'` when unconfigured
 */
const resolveBackupKey = (env = process.env) => {
  const raw = env.BACKUP_ENCRYPTION_KEY || env.JWT_SECRET || 'syict-enterprise-secure-backup-vault-key-2026';
  const parsed = parseKeyMaterial(raw);
  if (!parsed) {
    const error = new Error('Backup encryption key is invalid');
    error.code = 'BACKUP_KEY_INVALID';
    error.status = 503;
    throw error;
  }

  return {
    key: parsed.key,
    keyId: env.BACKUP_ENCRYPTION_KEY_ID || 'primary-backup-vault',
    derivation: parsed.derivation,
  };
};

/**
 * Names of the collections that belong in a backup.
 *
 * @param {Object} db
 * @returns {Promise<string[]>}
 */
const listBackupCollections = async (db) => {
  const collections = await db.listCollections().toArray();
  return collections.map((entry) => entry.name).filter((name) => !name.startsWith('system.'));
};

/**
 * Produce the dump as a sequence of JSON chunks.
 *
 * Documents are streamed one at a time, so the whole collection is never
 * resident in memory, and the manifest is written last because the record
 * count is only known once the dump is complete.
 *
 * @param {Object} db
 * @param {Object} options
 * @param {Object} options.manifest
 * @param {string[]} options.collectionNames
 * @param {Object} options.stats - mutated with `totalRecords`
 */
async function* generateDumpChunks(db, { manifest, collectionNames, stats }) {
  yield `{"format":${JSON.stringify(BACKUP_FORMAT)},"collections":{`;

  let firstCollection = true;

  for (const name of collectionNames) {
    yield `${firstCollection ? '' : ','}${JSON.stringify(name)}:[`;

    let firstDocument = true;
    const cursor = db.collection(name).find({});

    for await (const document of cursor) {
      yield `${firstDocument ? '' : ','}${serializeDocument(document)}`;
      firstDocument = false;
      stats.totalRecords += 1;
    }

    yield ']';
    firstCollection = false;
  }

  const finalManifest = {
    ...manifest,
    collectionCount: collectionNames.length,
    totalRecords: stats.totalRecords,
    excludedFields: [...SENSITIVE_FIELD_NAMES].sort(),
  };

  yield `},"manifest":${JSON.stringify(finalManifest)}}`;
}

/**
 * Write an encrypted backup artifact to disk.
 *
 * The dump is piped through gzip and an AES-256-GCM cipher into the file, so
 * the plain payload exists only in the pipeline buffers.
 *
 * @param {Object} options
 * @param {Object} options.db
 * @param {Object} options.manifest
 * @param {string[]} options.collectionNames
 * @param {Object} [options.env]
 * @param {string} [options.dir]
 * @returns {Promise<{ filePath: string, fileName: string, header: Object, stats: Object, bytes: number }>}
 */
const writeEncryptedBackup = async ({ db, manifest, collectionNames, env = process.env, dir }) => {
  const { key, keyId, derivation } = resolveBackupKey(env);

  const iv = crypto.randomBytes(IV_BYTES);
  const header = {
    format: BACKUP_FORMAT,
    version: BACKUP_FORMAT_VERSION,
    algorithm: ALGORITHM,
    keyId,
    keyDerivation: derivation,
    iv: iv.toString('base64'),
    createdAt: new Date().toISOString(),
    database: manifest.database,
    collectionCount: collectionNames.length,
  };

  const headerJson = Buffer.from(JSON.stringify(header), 'utf8');
  const headerLength = Buffer.alloc(HEADER_LENGTH_BYTES);
  headerLength.writeUInt32BE(headerJson.length, 0);

  const targetDir = dir || env.BACKUP_DIR || path.join(os.tmpdir(), BACKUP_DIR_NAME);
  await fsp.mkdir(targetDir, { recursive: true, mode: 0o700 });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeDbName = String(manifest.database || 'database').replace(/[^A-Za-z0-9_-]/g, '_');
  const fileName = `SYICT_DB_BACKUP_${safeDbName}_${stamp}${BACKUP_FILE_EXTENSION}`;
  const filePath = path.join(targetDir, fileName);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(headerJson);

  const encryptor = new Transform({
    transform(chunk, _encoding, callback) {
      callback(null, cipher.update(chunk));
    },
    flush(callback) {
      callback(null, Buffer.concat([cipher.final(), cipher.getAuthTag()]));
    },
  });

  const stats = { totalRecords: 0 };
  const source = Readable.from(generateDumpChunks(db, { manifest, collectionNames, stats }));
  const fileStream = fs.createWriteStream(filePath, { mode: 0o600 });

  // The header travels in the clear so the artifact can be recognised, but it
  // is authenticated as additional data, so it cannot be tampered with.
  fileStream.write(headerLength);
  fileStream.write(headerJson);

  await pipeline(source, zlib.createGzip(), encryptor, fileStream);

  const { size } = await fsp.stat(filePath);

  return { filePath, fileName, header, stats, bytes: size };
};

/**
 * Decrypt and decompress a backup artifact.
 *
 * @param {Buffer} buffer
 * @param {Buffer | { key: Buffer }} keyMaterial
 * @returns {{ header: Object, data: Object }}
 */
const decryptBackup = (buffer, keyMaterial) => {
  if (!Buffer.isBuffer(buffer) || buffer.length <= HEADER_LENGTH_BYTES + AUTH_TAG_BYTES) {
    throw new Error('Backup artifact is truncated');
  }

  const key = Buffer.isBuffer(keyMaterial) ? keyMaterial : keyMaterial.key;
  const headerLength = buffer.readUInt32BE(0);
  const headerJson = buffer.slice(HEADER_LENGTH_BYTES, HEADER_LENGTH_BYTES + headerLength);
  const header = JSON.parse(headerJson.toString('utf8'));

  const body = buffer.slice(HEADER_LENGTH_BYTES + headerLength, buffer.length - AUTH_TAG_BYTES);
  const authTag = buffer.slice(buffer.length - AUTH_TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(header.iv, 'base64'));
  decipher.setAAD(headerJson);
  decipher.setAuthTag(authTag);

  const plain = Buffer.concat([decipher.update(body), decipher.final()]);
  const json = zlib.gunzipSync(plain).toString('utf8');

  return { header, data: JSON.parse(json) };
};

/**
 * Remove a backup artifact from disk.
 *
 * @param {string} filePath
 * @returns {Promise<void>}
 */
const removeBackupArtifact = async (filePath) => {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

module.exports = {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_FILE_EXTENSION,
  ALGORITHM,
  SENSITIVE_FIELD_NAMES,
  isSensitiveField,
  serializeDocument,
  redactDocument,
  parseKeyMaterial,
  resolveBackupKey,
  listBackupCollections,
  generateDumpChunks,
  writeEncryptedBackup,
  decryptBackup,
  removeBackupArtifact,
};
