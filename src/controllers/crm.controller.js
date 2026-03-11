const LeadCRM = require('../models/LeadCRM');

/**
 * @desc  Get all leads (paginated + filterable)
 * @route GET /api/crm
 * @access Private (Admin)
 */
const getLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, source, q } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (source && source !== 'all') filter.source = source;
    if (q) filter.$or = [
      { name:  { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ];

    const total = await LeadCRM.countDocuments(filter);
    const leads = await LeadCRM.find(filter)
      .populate('assignedTo', 'name')
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
 * @access Private (Admin)
 */
const getLeadById = async (req, res, next) => {
  try {
    const lead = await LeadCRM.findById(req.params.id).populate('assignedTo', 'name');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Create a new lead
 * @route POST /api/crm
 * @access Private (Admin)
 */
const createLead = async (req, res, next) => {
  try {
    const { name, phone, email, source, interest, status, followUpDate, assignedTo } = req.body;
    const lead = await LeadCRM.create({
      name, phone, email, source, interest, status, followUpDate, assignedTo,
    });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update a lead (status, followUpDate, assignedTo, interest, etc.)
 * @route PUT /api/crm/:id
 * @access Private (Admin)
 */
const updateLead = async (req, res, next) => {
  try {
    const lead = await LeadCRM.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Add a note to a lead
 * @route PATCH /api/crm/:id/note
 * @access Private (Admin)
 */
const addNote = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Note text is required' });

    const lead = await LeadCRM.findByIdAndUpdate(
      req.params.id,
      { $push: { notes: { text, createdAt: new Date() } } },
      { new: true }
    );
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead.notes });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Delete a lead
 * @route DELETE /api/crm/:id
 * @access Private (Admin)
 */
const deleteLead = async (req, res, next) => {
  try {
    const lead = await LeadCRM.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Get CRM summary stats
 * @route GET /api/crm/stats
 * @access Private (Admin)
 */
const getCRMStats = async (req, res, next) => {
  try {
    const statuses = ['new', 'contacted', 'interested', 'enrolled', 'cold', 'lost'];
    const statsArr = await LeadCRM.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const stats = {};
    statuses.forEach(s => { stats[s] = 0; });
    statsArr.forEach(s => { stats[s._id] = s.count; });
    stats.total = await LeadCRM.countDocuments();
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
