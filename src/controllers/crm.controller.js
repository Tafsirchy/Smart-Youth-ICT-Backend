const LeadCRM = require('../models/LeadCRM');
const { isBranchAuthorized } = require('../middleware/rbac.middleware');

/**
 * @desc  Get all leads (paginated + filterable)
 * @route GET /api/crm
 * @access Private (Admin / Employee with leads:view)
 */
const getLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, source, q, branchId } = req.query;

    const filter = {};
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);

    if (isSuper) {
      if (branchId) filter.branchId = branchId;
    } else {
      filter.branchId = req.user.branchId;
    }

    if (status && status !== 'all') filter.status = status;
    if (source && source !== 'all') filter.source = source;
    if (q) filter.$or = [
      { name:  { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ];

    const total = await LeadCRM.countDocuments(filter);
    const leads = await LeadCRM.find(filter)
      .populate('assignedTo', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data: leads });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get a single lead
 * @route GET /api/crm/:id
 * @access Private (Admin / Employee with leads:view)
 */
const getLeadById = async (req, res, next) => {
  try {
    const lead = await LeadCRM.findById(req.params.id).populate('assignedTo', 'name email');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Isolation check
    if (!isBranchAuthorized(req, lead.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Create a new lead
 * @route POST /api/crm
 * @access Private (Admin / Employee with leads:manage)
 */
const createLead = async (req, res, next) => {
  try {
    const { name, phone, email, source, interest, status, followUpDate, assignedTo } = req.body;
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);
    const branchId = isSuper ? (req.body.branchId || req.user.branchId) : req.user.branchId;

    if (!branchId) {
      return res.status(400).json({ success: false, message: 'Branch ID context is required' });
    }

    const lead = await LeadCRM.create({
      name, phone, email, source, interest, status, followUpDate, assignedTo, branchId
    });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update a lead (status, followUpDate, assignedTo, interest, etc.)
 * @route PUT /api/crm/:id
 * @access Private (Admin / Employee with leads:manage)
 */
const updateLead = async (req, res, next) => {
  try {
    let lead = await LeadCRM.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (!isBranchAuthorized(req, lead.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    // Prevent changing branchId via update to stop cross-branch transfer IDOR
    const updates = { ...req.body };
    delete updates.branchId;

    lead = await LeadCRM.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Add a note to a lead
 * @route PATCH /api/crm/:id/note
 * @access Private (Admin / Employee with leads:manage)
 */
const addNote = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Note text is required' });

    const lead = await LeadCRM.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Isolation check
    if (!isBranchAuthorized(req, lead.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    lead.notes = lead.notes || [];
    lead.notes.push({ text, createdAt: new Date() });
    await lead.save();

    res.json({ success: true, data: lead.notes });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Delete a lead
 * @route DELETE /api/crm/:id
 * @access Private (Admin / Employee with leads:delete)
 */
const deleteLead = async (req, res, next) => {
  try {
    const lead = await LeadCRM.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Isolation check
    if (!isBranchAuthorized(req, lead.branchId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized branch access' });
    }

    await LeadCRM.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get CRM summary stats
 * @route GET /api/crm/stats
 * @access Private (Admin / Employee with leads:view)
 */
const getCRMStats = async (req, res, next) => {
  try {
    const statuses = ['new', 'contacted', 'interested', 'enrolled', 'cold', 'lost'];
    const filter = {};
    const isSuper = ['super_admin', 'super_management'].includes(req.user.role);

    if (isSuper) {
      if (req.query.branchId) filter.branchId = req.query.branchId;
    } else {
      filter.branchId = req.user.branchId;
    }

    const statsArr = await LeadCRM.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const stats = {};
    statuses.forEach(s => { stats[s] = 0; });
    statsArr.forEach(s => { stats[s._id] = s.count; });
    stats.total = await LeadCRM.countDocuments(filter);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  addNote,
  deleteLead,
  getCRMStats,
};
