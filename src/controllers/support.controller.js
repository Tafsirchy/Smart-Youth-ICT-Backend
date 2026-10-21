const SupportTicket = require('../models/SupportTicket');
const { emitToExecutives } = require('../sockets/socket');

// @desc    Create new support ticket
// @route   POST /api/support
// @access  Private
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, message, priority, category, attachment } = req.body;

    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      category: category || 'general',
      message,
      attachment: attachment || null,
      priority: priority || 'medium',
      status: 'open',
    });

    // Real-time WebSocket emission to Super Admins & Executives
    emitToExecutives('NEW_SUPPORT_TICKET', {
      id: ticket._id,
      subject: ticket.subject,
      priority: ticket.priority,
      category: ticket.category,
      userName: req.user.name,
      createdAt: ticket.createdAt,
    });

    res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all current user's tickets
// @route   GET /api/support/me
// @access  Private
exports.getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort('-createdAt')
      .populate('responses.user', 'name role');

    res.json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single ticket details
// @route   GET /api/support/:id
// @access  Private
exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'name email role')
      .populate('responses.user', 'name role');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Security: Only owner or admin can see ticket
    if (ticket.user._id.toString() !== req.user._id.toString() && req.user.role === 'student') {
      return res.status(401).json({ success: false, message: 'Not authorized to view this ticket' });
    }

    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a response/message to a ticket
// @route   PUT /api/support/:id/response
// @access  Private
exports.addTicketResponse = async (req, res, next) => {
  try {
    const { message, attachment } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Security: Only owner or staff/admin can respond
    if (ticket.user.toString() !== req.user._id.toString() && req.user.role === 'student') {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    ticket.responses.push({
      user: req.user._id,
      message,
      attachment: attachment || null,
    });

    // If student responds, ensure status is 'open' or 'in-progress'
    if (req.user.role === 'student' && ticket.status === 'resolved') {
      ticket.status = 'open';
    } else if (req.user.role !== 'student') {
      ticket.status = 'in-progress';
    }

    await ticket.save();

    const updated = await SupportTicket.findById(ticket._id)
      .populate('user', 'name email role')
      .populate('responses.user', 'name role');

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark ticket as resolved with optional rating
// @route   PUT /api/support/:id/resolve
// @access  Private
exports.resolveTicket = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Security: Only owner or staff/admin can resolve
    if (ticket.user.toString() !== req.user._id.toString() && req.user.role === 'student') {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();
    if (rating) ticket.rating = Number(rating);

    if (feedback) {
      ticket.responses.push({
        user: req.user._id,
        message: `[Ticket marked as resolved] ${feedback}`,
      });
    }

    await ticket.save();

    const updated = await SupportTicket.findById(ticket._id)
      .populate('user', 'name email role')
      .populate('responses.user', 'name role');

    res.json({
      success: true,
      data: updated,
      message: 'Ticket marked as resolved',
    });
  } catch (err) {
    next(err);
  }
};
