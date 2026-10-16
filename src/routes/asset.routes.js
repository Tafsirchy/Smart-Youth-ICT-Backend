const express = require('express');
const { getAssets, createAsset, updateAsset, uploadAssetImage } = require('../controllers/asset.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.use(protect);

router.post(
  '/upload',
  upload.fields([{ name: 'asset', maxCount: 1 }, { name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]),
  uploadAssetImage
);

router.get('/',  getAssets);
router.post('/', authorize('super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'), createAsset);
router.patch('/:id', authorize('super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'), updateAsset);

module.exports = router;
