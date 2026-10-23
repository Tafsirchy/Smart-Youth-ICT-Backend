const express = require('express');
const { getAssets, createAsset, updateAsset, deleteAsset, uploadAssetImage } = require('../controllers/asset.controller');
const { protect } = require('../middleware/auth.middleware');
const { requireAccess } = require('../middleware/rbac.middleware');
const { PERMISSIONS } = require('../config/permissions');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(protect);

// Inventory is a branch-management resource. The permission list accepts the
// granular assets permissions as well as the `staff:manage` permission the
// dashboard navigation already uses, so existing delegations keep working.
const canViewAssets = requireAccess(PERMISSIONS.ASSETS_VIEW, PERMISSIONS.STAFF_MANAGE);
const canManageAssets = requireAccess(PERMISSIONS.ASSETS_MANAGE, PERMISSIONS.STAFF_MANAGE);

router.post('/upload', canManageAssets, upload.fields([{ name: 'asset', maxCount: 1 }, { name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]), uploadAssetImage);

router.get('/', canViewAssets, getAssets);
router.post('/', canManageAssets, createAsset);
router.patch('/:id', canManageAssets, updateAsset);
router.delete('/:id', canManageAssets, deleteAsset);

module.exports = router;
