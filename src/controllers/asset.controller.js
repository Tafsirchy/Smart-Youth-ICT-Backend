const Asset = require('../models/Asset');

exports.getAssets = async (req, res, next) => {
  try {
    const branchId = req.user.branchId || req.query.branchId;
    const filter   = {};

    if (req.user.role !== 'super_admin') {
      if (!branchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = branchId;
    }

    const assets = await Asset.find(filter).sort('-createdAt');
    res.json({ success: true, count: assets.length, data: assets });
  } catch (err) {
    next(err);
  }
};

exports.createAsset = async (req, res, next) => {
  try {
    const branchId = req.user.branchId || req.body.branchId;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID missing' });

    const asset = await Asset.create({ ...req.body, branchId });
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
};

exports.updateAsset = async (req, res, next) => {
    try {
        let asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

        // Isolation
        if (req.user.role !== 'super_admin' && asset.branchId.toString() !== req.user.branchId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
        }

        asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: asset });
    } catch (err) {
        next(err);
    }
};
