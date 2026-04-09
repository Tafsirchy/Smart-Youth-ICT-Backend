const SupportTicket = require('../models/SupportTicket');

// @desc    Create new support ticket
// @route   POST /api/support
// @access  Private
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, message, priority } = req.body;

    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      message,
      priority: priority || 'medium',
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
    const ticket = await SupportTicket.findById(req.params.id).populate('responses.user', 'name role');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Security: Only owner or admin can see ticket
    if (ticket.user.toString() !== req.user._id.toString() && req.user.role === 'student') {
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
    const { message } = req.body;
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
    });

    // If student responds, ensure status is 'open' or 'in-progress'
    if (req.user.role === 'student' && ticket.status === 'resolved') {
        ticket.status = 'open';
    }

    await ticket.save();

    res.json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};
