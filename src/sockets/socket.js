const { Server } = require('socket.io');
const { authenticateToken } = require('../middleware/auth.middleware');
const { getAllowedBranches, isSuperRole } = require('../utils/branchHelper');
const { logger, createRequestId } = require('../utils/logger');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

let io = null;

/**
 * The course rooms a user is entitled to. Derived from the server-side
 * relationship between the account and the course — never from anything the
 * client sends.
 */
const resolveCourseRooms = async (user) => {
  const courseIds = new Set();

  if (user.role === 'student') {
    const enrollments = await Enrollment.find({ user: user._id, isActive: true })
      .select('course')
      .lean();
    enrollments.forEach((e) => e.course && courseIds.add(e.course.toString()));
  }

  if (user.role === 'instructor') {
    const courses = await Course.find({ instructor: user._id })
      .select('_id')
      .lean();
    courses.forEach((c) => courseIds.add(c._id.toString()));
  }

  return [...courseIds];
};

/**
 * Whether a user may listen to a course room. Super roles may listen to any
 * course; everyone else needs an enrolment or a teaching assignment.
 */
const canListenToCourse = async (user, courseId) => {
  if (!courseId) return false;
  if (isSuperRole(user)) return true;

  if (user.role === 'student') {
    const enrollment = await Enrollment.exists({
      user: user._id,
      course: courseId,
      isActive: true,
    });
    return Boolean(enrollment);
  }

  if (user.role === 'instructor') {
    const course = await Course.exists({ _id: courseId, instructor: user._id });
    return Boolean(course);
  }

  return false;
};

/**
 * Initialize Socket.io with HTTP server
 *
 * @param {http.Server} httpServer
 * @param {(origin?: string) => boolean} isAllowedOrigin - decides whether a
 *   browser origin may open a socket. It is the same check the HTTP layer
 *   uses, so a socket cannot be opened from an origin the API refuses.
 */
const initSocket = (httpServer, isAllowedOrigin) => {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const allowed =
          typeof isAllowedOrigin === 'function' ? Boolean(isAllowedOrigin(origin)) : false;
        callback(null, allowed);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    // The cors option above only sets headers on the polling handshake. The
    // websocket upgrade is not covered by it, so the origin is checked here
    // as well. Without this a page on any site could open a socket and join
    // the rooms it asked for.
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      const allowed =
        typeof isAllowedOrigin === 'function' ? Boolean(isAllowedOrigin(origin)) : false;

      if (!allowed) {
        logger.warn('socket connection rejected: disallowed origin', { origin });
      }

      callback(null, allowed);
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  // Every socket must present a valid access token. The account behind the
  // token is loaded once and attached to the socket; every room subscription
  // afterwards is derived from that account rather than from client input.
  io.use(async (socket, next) => {
    try {
      const handshake = socket.handshake || {};
      const headerToken =
        typeof handshake.headers?.authorization === 'string'
          ? handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : null;

      const token = handshake.auth?.token || handshake.query?.token || headerToken;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const { user } = await authenticateToken(token);
      socket.data.user = user;
      socket.data.requestId = createRequestId();
      socket.data.log = logger.child({
        requestId: socket.data.requestId,
        userId: user._id ? user._id.toString() : undefined,
        branchId: user.branchId ? user.branchId.toString() : undefined,
        role: user.role,
      });
      next();
    } catch (err) {
      next(new Error(err?.message || 'Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const socketLog = socket.data.log || logger;

    // Client registers identity & joins appropriate role/branch/course rooms.
    // The payload is intentionally ignored: identity comes from the token.
    socket.on('join_enterprise', async (payload, maybeAck) => {
      // The acknowledgement callback may arrive as the first or the second
      // argument, depending on whether the client sent a payload.
      const ack = typeof payload === 'function' ? payload : maybeAck;
      try {
        if (!user) {
          if (typeof ack === 'function') ack({ ok: false, message: 'Not authenticated' });
          return;
        }

        socket.join(`user_${user._id}`);

        if (user.role) {
          socket.join(`role_${user.role}`);
          if (isSuperRole(user)) {
            socket.join('room_executives');
          }
        }

        // Only the branches this account may act within.
        const allowedBranches = getAllowedBranches(user);
        allowedBranches.forEach((branchId) => {
          socket.join(`branch_${branchId}`);
          if (user.role) {
            socket.join(`branch_${branchId}_${user.role}s`);
            if (['branch_admin', 'branch_management'].includes(user.role)) {
              socket.join(`branch_${branchId}_admins`);
            }
            if (user.role === 'employee') {
              socket.join(`branch_${branchId}_employees`);
            }
          }
        });

        // Auto-join enrolled or taught courses
        const courseIds = await resolveCourseRooms(user);
        courseIds.forEach((cId) => socket.join(`course_${cId}`));

        if (typeof ack === 'function') ack({ ok: true });
      } catch (e) {
        socketLog.error('socket enterprise join failed', { err: e });
        if (typeof ack === 'function') ack({ ok: false, message: e.message });
      }
    });

    // Dynamic course room subscription — only for courses the account is
    // actually entitled to.
    socket.on('join_course', async ({ courseId } = {}, ack) => {
      try {
        if (!user || !courseId) {
          if (typeof ack === 'function') ack({ ok: false });
          return;
        }
        const allowed = await canListenToCourse(user, courseId);
        if (!allowed) {
          socketLog.warn('socket course room join blocked', { courseId });
          if (typeof ack === 'function') ack({ ok: false });
          return;
        }
        socket.join(`course_${courseId}`);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (e) {
        socketLog.error('socket course join failed', { courseId, err: e });
        if (typeof ack === 'function') ack({ ok: false, message: e.message });
      }
    });

    socket.on('leave_course', ({ courseId } = {}, ack) => {
      if (courseId) {
        socket.leave(`course_${courseId}`);
      }
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('disconnect', () => {
      // Normal lifecycle disconnection
    });
  });

  console.log('⚡ [Socket.io] Real-Time Enterprise Gateway Initialized');
  return io;
};

/**
 * Access the active Socket.io instance
 */
const getIO = () => io;

/**
 * Close the active Socket.io instance and allow a fresh one to be created.
 * Used on shutdown and by the test suite.
 */
const closeSocket = () => {
  if (io) {
    io.close();
    io = null;
  }
};

/**
 * Broadcast event to all connected clients globally
 */
const emitToAll = (event, payload) => {
  if (io) io.emit(event, payload);
};

/**
 * Emit event to a specific role (e.g. 'role_student', 'role_instructor')
 */
const emitToRole = (role, event, payload) => {
  if (io) io.to(`role_${role}`).emit(event, payload);
};

/**
 * Emit to executive HQ room (super_admin + super_management)
 */
const emitToExecutives = (event, payload) => {
  if (io) io.to('room_executives').emit(event, payload);
};

/**
 * Emit to a specific user by MongoDB _id
 */
const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(`user_${userId}`).emit(event, payload);
};

/**
 * Emit to a specific campus/branch
 */
const emitToBranch = (branchId, event, payload) => {
  if (io && branchId) io.to(`branch_${branchId}`).emit(event, payload);
};

/**
 * Emit to specific role in a specific branch (e.g. branch admins or instructors)
 */
const emitToBranchRole = (branchId, role, event, payload) => {
  if (io && branchId && role) {
    io.to(`branch_${branchId}_${role}s`).emit(event, payload);
    if (['branch_admin', 'branch_management'].includes(role)) {
      io.to(`branch_${branchId}_admins`).emit(event, payload);
    }
  }
};

/**
 * Emit to all participants (students & instructors) of a course
 */
const emitToCourse = (courseId, event, payload) => {
  if (io && courseId) io.to(`course_${courseId}`).emit(event, payload);
};

/**
 * Universal Intelligent Dispatcher for Notifications
 * Dispatches to target rooms and always relays to Super Admin HQ room
 */
const emitNotification = (target, notification) => {
  if (!io || !notification) return;

  const eventName = 'NOTIFICATION_RECEIVED';

  // 1. Personal unicast
  if (target.userId) {
    emitToUser(target.userId, eventName, notification);
    return; // Personal notifications are strictly targeted; do not leak to executive room or cause duplicate pings
  }

  // 2. Course-wide broadcast (students & instructors)
  if (target.courseId) {
    emitToCourse(target.courseId, eventName, notification);
  }
  // 3. Branch + Role broadcast
  else if (target.branchId && target.role && target.role !== 'all') {
    emitToBranchRole(target.branchId, target.role, eventName, notification);
  } else if (target.branchId) {
    // All members in this branch
    emitToBranch(target.branchId, eventName, notification);
  }
  // 4. Global broadcast
  else if (target.isGlobal) {
    if (target.role && target.role !== 'all') {
      emitToRole(target.role, eventName, notification);
    } else {
      emitToAll(eventName, notification);
      return; // emitToAll already delivers to every connected socket including executives
    }
  }

  // 5. Reliability Guarantee: Super Admin HQ room receives branch, course, and segmented broadcasts
  if (!target.isPersonalOnly) {
    emitToExecutives(eventName, notification);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToAll,
  emitToRole,
  emitToExecutives,
  emitToUser,
  emitToBranch,
  emitToBranchRole,
  emitToCourse,
  emitNotification,
  closeSocket,
};
