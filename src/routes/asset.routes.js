const express = require('express');
const { getAssets, createAsset, updateAsset } = require('../controllers/asset.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/',  getAssets);
router.post('/', authorize('admin', 'branch_admin', 'branch_management', 'super_admin'), createAsset);
router.patch('/:id', authorize('admin', 'branch_admin', 'branch_management', 'super_admin'), updateAsset);

module.exports = router;
