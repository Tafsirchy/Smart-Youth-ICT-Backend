const Asset = require('../models/Asset');
const Branch = require('../models/Branch');
const mongoose = require('mongoose');

async function resolveBranchId(param) {
  if (!param) return null;
  if (mongoose.Types.ObjectId.isValid(param)) {
    const doc = await Branch.findById(param).select('_id');
    if (doc) return doc._id;
  }
  const bySlugOrCode = await Branch.findOne({
    $or: [{ slug: param.toLowerCase() }, { code: param.toUpperCase() }]
  }).select('_id');
  return bySlugOrCode ? bySlugOrCode._id : null;
}

exports.getAssets = async (req, res, next) => {
  try {
    const rawBranch = req.query.branchId || req.user.branchId;
    const resolvedBranchId = await resolveBranchId(rawBranch);

    const filter = {};
    if (req.user.role !== 'super_admin' && req.user.role !== 'super_management') {
      if (!resolvedBranchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = resolvedBranchId;
    } else if (resolvedBranchId) {
      filter.branchId = resolvedBranchId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      const q = String(req.query.search).trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const assets = await Asset.find(filter)
      .populate('assignedTo', 'name email avatar phone')
      .populate('branchId', 'name code')
      .sort('-createdAt');

    // Aggregate inventory valuation & status counts
    let totalValue = 0;
    let totalItems = 0;
    const statusCounts = { available: 0, 'in-use': 0, maintenance: 0, retired: 0 };
    const categoryCounts = { furniture: 0, electronics: 0, stationary: 0, other: 0 };

    assets.forEach((a) => {
      const qty = Number(a.quantity) || 1;
      const price = Number(a.unitPrice) || 0;
      totalItems += qty;
      totalValue += qty * price;
      if (statusCounts[a.status] !== undefined) statusCounts[a.status] += qty;
      if (categoryCounts[a.category] !== undefined) categoryCounts[a.category] += qty;
    });

    res.json({
      success: true,
      count: assets.length,
      data: assets,
      stats: {
        totalAssets: assets.length,
        totalItems,
        totalValue,
        statusCounts,
        categoryCounts,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.createAsset = async (req, res, next) => {
  try {
    const rawBranch = req.body.branchId || req.user.branchId;
    const branchId = await resolveBranchId(rawBranch);
    if (!branchId) return res.status(400).json({ success: false, message: 'Valid Branch ID missing' });

    const asset = await Asset.create({ ...req.body, branchId });
    const populated = await Asset.findById(asset._id)
      .populate('assignedTo', 'name email avatar phone')
      .populate('branchId', 'name code');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

exports.updateAsset = async (req, res, next) => {
  try {
    let asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    // Isolation
    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
    if (!isSuper && asset.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignedTo', 'name email avatar phone')
      .populate('branchId', 'name code');

    res.json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
};

exports.deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    // Isolation
    const isSuper = req.user.role === 'super_admin' || req.user.role === 'super_management';
    if (!isSuper && asset.branchId.toString() !== req.user.branchId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await Asset.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Asset removed successfully' });
  } catch (err) {
    next(err);
  }
};

const { uploadToImageBB } = require('../services/imagebb.service');

exports.uploadAssetImage = async (req, res, next) => {
  try {
    const file = req.file || (req.files && (req.files.asset?.[0] || req.files.image?.[0] || req.files.file?.[0]));
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    let url;
    try {
      url = await uploadToImageBB(file.buffer);
    } catch (imgbbErr) {
      console.warn('ImageBB upload failed or key invalid, falling back to base64 Data URL:', imgbbErr.message);
      const mimeType = file.mimetype || 'image/png';
      url = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
    }

    res.json({
      success: true,
      data: { url }
    });
  } catch (err) {
    next(err);
  }
};

