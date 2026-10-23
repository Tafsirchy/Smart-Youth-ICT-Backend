/**
 * backup — part of the former
 * super.controller.js. The handlers are unchanged; they only live in a
 * smaller file now.
 */
const AuditLog = require('../../models/AuditLog');
const fs = require('fs');
const mongoose = require('mongoose');
const {
  listBackupCollections,
  writeEncryptedBackup,
  removeBackupArtifact,
} = require('../../utils/backup');
exports.getDatabaseBackupPreview = async (req, res, next) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const stats = [];
    let totalDocuments = 0;

    for (const col of collections) {
      if (col.name.startsWith('system.')) continue;
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      totalDocuments += count;
      stats.push({
        name: col.name,
        documentCount: count,
      });
    }

    stats.sort((a, b) => b.documentCount - a.documentCount);

    res.json({
      success: true,
      data: {
        totalCollections: stats.length,
        totalDocuments,
        databaseName: mongoose.connection.name,
        collections: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    1-Click Cloud Database Backup & Disaster Recovery Download (encrypted .json.gz.enc)
// @route   GET /api/super/system/backup/download
// @access  Private (Super Admin)

exports.downloadDatabaseBackup = async (req, res, next) => {
  let artifact = null;

  const recordAudit = async (action, details) => {
    try {
      await AuditLog.create({
        actor: req.user._id,
        action,
        entity: 'Database',
        details,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || ''
      });
    } catch (auditError) {
      console.error('[AuditLog] backup audit write failed:', auditError.message);
    }
  };

  try {
    const db = mongoose.connection.db;
    const collectionNames = await listBackupCollections(db);

    const manifest = {
      platform: 'SYICT Global Enterprise Cloud',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      database: mongoose.connection.name,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    };

    artifact = await writeEncryptedBackup({ db, manifest, collectionNames });

    await recordAudit('SYSTEM_BACKUP_GENERATED', {
      database: mongoose.connection.name,
      collectionCount: artifact.header.collectionCount,
      totalRecords: artifact.stats.totalRecords,
      artifactBytes: artifact.bytes,
      encrypted: true,
      algorithm: artifact.header.algorithm,
      keyId: artifact.header.keyId,
      adminName: req.user.name,
      adminEmail: req.user.email
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    res.setHeader('Content-Length', artifact.bytes);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200);

    const artifactStream = fs.createReadStream(artifact.filePath);
    artifactStream.on('error', next);
    artifactStream.on('close', () => {
      removeBackupArtifact(artifact.filePath).catch((cleanupError) => {
        console.error('[Backup] artifact cleanup failed:', cleanupError.message);
      });
    });
    artifactStream.pipe(res);
  } catch (err) {
    if (artifact) {
      await removeBackupArtifact(artifact.filePath).catch(() => {});
    }

    if (err.code === 'BACKUP_KEY_MISSING' || err.code === 'BACKUP_KEY_INVALID') {
      await recordAudit('SYSTEM_BACKUP_REJECTED', {
        database: mongoose.connection.name,
        reason: err.code,
        adminName: req.user.name,
        adminEmail: req.user.email
      });

      return res.status(503).json({
        success: false,
        message: 'Database backup is unavailable: the encryption key is not configured on the server.'
      });
    }

    next(err);
  }
};
