const Asset = require('../models/Asset');
const { resolveBranchScope, isBranchAuthorized } = require('../utils/branchHelper');
const { escapeRegex } = require('../utils/regex');

/**
 * Fields a client may write. `branchId` is deliberately absent: moving an
 * asset between branches is a tenant-boundary change and is not part of an
 * ordinary update.
 */
const WRITABLE_ASSET_FIELDS = [
  'name',
  'category',
  'quantity',
  'unitPrice',
  'status',
  'purchasedAt',
  'description',
  'image',
  'assignedTo',
];

exports.getAssets = async (req, res, next) => {
  try {
    const rawBranch = req.query.branchId || req.user.branchId;
    const scope = await resolveBranchScope(req, rawBranch);

    if (scope.denied) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission for this branch.' });
    }

    const filter = {};
    if (!scope.isAll) {
      if (!scope.branchId) return res.status(403).json({ success: false, message: 'Branch ID required' });
      filter.branchId = scope.branchId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.search) {
      const q = String(req.query.search).trim();
      const escapedQ = escapeRegex(q);
      filter.$or = [
        { name: { $regex: escapedQ, $options: 'i' } },
        { description: { $regex: escapedQ, $options: 'i' } },
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
    const scope = await resolveBranchScope(req, rawBranch);

    if (scope.denied) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission for this branch.' });
    }
    if (!scope.branchId) {
      return res.status(400).json({ success: false, message: 'Valid Branch ID missing' });
    }

    const payload = { ...req.body, branchId: scope.branchId };
    for (const key of Object.keys(payload)) {
      if (!WRITABLE_ASSET_FIELDS.includes(key) && key !== 'branchId') {
        delete payload[key];
      }
    }

    const asset = await Asset.create(payload);
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

    // Isolation — a user may only touch assets in a branch they belong to.
    if (!isBranchAuthorized(req, asset.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    // `branchId` is not writable: it would move the asset across tenants.
    const updates = { ...req.body };
    delete updates.branchId;
    for (const key of Object.keys(updates)) {
      if (!WRITABLE_ASSET_FIELDS.includes(key)) {
        delete updates[key];
      }
    }

    asset = await Asset.findByIdAndUpdate(req.params.id, updates, { new: true })
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
    if (!isBranchAuthorized(req, asset.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await Asset.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Asset removed successfully' });
  } catch (err) {
    next(err);
  }
};

const { uploadToImageBB } = require('../services/imagebb.service');
const { validateImageUpload } = require('../utils/imageValidation');

exports.uploadAssetImage = async (req, res, next) => {
  try {
    const file = req.file || (req.files && (req.files.asset?.[0] || req.files.image?.[0] || req.files.file?.[0]));
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // The declared type and the file name are client-controlled, so the type
    // is established from the magic bytes instead.
    const validation = validateImageUpload(file.buffer, file.mimetype);
    if (!validation.ok) {
      return res.status(validation.status).json({ success: false, message: validation.message });
    }

    let url;
    try {
      url = await uploadToImageBB(file.buffer);
    } catch (imgbbErr) {
      console.warn('ImageBB upload failed or key invalid, falling back to base64 Data URL:', imgbbErr.message);
      url = `data:${validation.mime};base64,${file.buffer.toString('base64')}`;
    }

    res.json({
      success: true,
      data: { url }
    });
  } catch (err) {
    next(err);
  }
};

