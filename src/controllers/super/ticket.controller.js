/**
 * ticket — part of the former
 * super.controller.js. The handlers are unchanged; they only live in a
 * smaller file now.
 */
const AuditLog = require('../../models/AuditLog');
const SupportTicket = require('../../models/SupportTicket');
const emailService = require('../../services/email.service');
const sanitizeHtml = require('sanitize-html');
exports.getTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'name email role phone')
      .populate('responses.user', 'name role')
      .sort('-createdAt');

    const now = Date.now();
    const SLA_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours SLA threshold

    let escalatedCount = 0;
    const enrichedTickets = await Promise.all(tickets.map(async (ticket) => {
      const isPending = ['open', 'in-progress'].includes(ticket.status);
      const ageMs = now - new Date(ticket.createdAt).getTime();
      const isBreached = isPending && ageMs > SLA_LIMIT_MS;

      if (isBreached && !ticket.isEscalated) {
        ticket.isEscalated = true;
        ticket.priority = 'critical';
        ticket.escalatedAt = new Date();
        ticket.escalationReason = 'Auto-escalated: Response SLA exceeded 24 hours';
        await ticket.save();
      }

      if (ticket.isEscalated) escalatedCount++;

      return {
        ...ticket.toObject(),
        isSlaBreached: isBreached || ticket.isEscalated,
        slaRemainingMs: Math.max(0, SLA_LIMIT_MS - ageMs)
      };
    }));

    const metrics = {
      total: enrichedTickets.length,
      open: enrichedTickets.filter(t => t.status === 'open').length,
      inProgress: enrichedTickets.filter(t => t.status === 'in-progress').length,
      resolved: enrichedTickets.filter(t => t.status === 'resolved').length,
      escalated: escalatedCount
    };

    res.json({ success: true, metrics, data: enrichedTickets });
  } catch (err) { next(err); }
};

// @desc    Reply to a support ticket
// @route   POST /api/super/tickets/:id/reply
// @access  Private (Super Admin)

exports.replyToTicket = async (req, res, next) => {
  try {
    const { message, attachment } = req.body;
    const ticket = await SupportTicket.findById(req.params.id).populate('user', 'name email');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    if (!message && !attachment) {
      return res.status(400).json({ success: false, message: 'Message or attachment is required' });
    }

    const cleanMessage = sanitizeHtml(message || "", {
      allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
      allowedAttributes: { 'a': ['href'] }
    });

    ticket.responses.push({
      user: req.user._id,
      message: cleanMessage,
      attachment: attachment || null,
      createdAt: Date.now()
    });
    
    if (ticket.status === 'open') ticket.status = 'in-progress';
    if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
    await ticket.save();

    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('user', 'name email role')
      .populate('responses.user', 'name role');

    // ðŸ“§ Notify Student (Async)
    if (ticket.user && ticket.user.email) {
      emailService._send({
        to: ticket.user.email,
        subject: `ðŸŽ« Update on Ticket: ${ticket.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #1e1b4b;">Support Ticket Update</h2>
            <p style="color: #475569;">Hi ${ticket.user.name}, the Head Office has responded to your ticket:</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #db2777;">
              <p style="margin: 0;">${cleanMessage || 'Attachment sent'}</p>
            </div>
            <p style="color: #64748b; font-size: 14px;">Log in to the dashboard to view the full conversation history.</p>
          </div>
        `
      }).catch(e => console.error('[Ticket Email Failed]', e.message));
    }

    res.json({ success: true, data: populatedTicket });
  } catch (err) { next(err); }
};

// @desc    Manually escalate a support ticket
// @route   POST /api/super/tickets/:id/escalate
// @access  Private (Super Admin)

exports.escalateTicket = async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const ticket = await SupportTicket.findById(req.params.id).populate('user', 'name email');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.isEscalated = true;
    ticket.priority = 'critical';
    ticket.escalatedAt = new Date();
    ticket.escalationReason = reason || 'High-priority manual escalation by Super Admin';
    await ticket.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'ESCALATE_TICKET',
      entity: 'SupportTicket',
      entityId: ticket._id,
      details: { subject: ticket.subject, reason: ticket.escalationReason }
    });

    try {
      const { emitToExecutives } = require('../../sockets/socket');
      emitToExecutives('TICKET_ESCALATED', {
        ticketId: ticket._id,
        subject: ticket.subject,
        reason: ticket.escalationReason,
        priority: ticket.priority,
        escalatedAt: ticket.escalatedAt,
      });
    } catch (e) {
      console.error('[Socket Emit Error]', e.message);
    }

    res.json({ success: true, message: 'Ticket escalated to critical SLA status', data: ticket });
  } catch (err) { next(err); }
};

// @desc    Resolve or update status of a support ticket
// @route   PUT /api/super/tickets/:id/resolve
// @access  Private (Super Admin)

exports.resolveTicket = async (req, res, next) => {
  try {
    const { status, priority } = req.body || {};
    const newStatus = status || 'resolved';
    const update = { status: newStatus };
    if (priority) update.priority = priority;
    if (newStatus === 'resolved') update.resolvedAt = new Date();

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email role')
      .populate('responses.user', 'name role');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
};

// @desc    Get system settings
// @route   GET /api/super/settings
// @access  Private (Super Admin)
