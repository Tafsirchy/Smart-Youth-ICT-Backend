const express = require('express');
const { getAssets, createAsset, updateAsset } = require('../controllers/asset.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.use(protect);

router.get('/',  getAssets);
router.post('/', authorize('super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'), createAsset);
router.patch('/:id', authorize('super_admin', 'super_management', 'admin', 'branch_admin', 'branch_management'), updateAsset);

module.exports = router;
