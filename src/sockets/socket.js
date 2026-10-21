const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.io with HTTP server
 */
const initSocket = (httpServer, allowedOrigins) => {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  io.on('connection', (socket) => {
    // Client registers identity & joins appropriate role/branch/course rooms
    socket.on('join_enterprise', (data) => {
      try {
        if (data?.userId) {
          socket.join(`user_${data.userId}`);
        }

        if (data?.role) {
          socket.join(`role_${data.role}`);
          if (['super_admin', 'super_management'].includes(data.role)) {
            socket.join('room_executives');
          }
        }

        if (data?.branchId) {
          socket.join(`branch_${data.branchId}`);
          if (data?.role) {
            socket.join(`branch_${data.branchId}_${data.role}s`);
            if (['branch_admin', 'branch_management'].includes(data.role)) {
              socket.join(`branch_${data.branchId}_admins`);
            }
            if (data.role === 'employee') {
              socket.join(`branch_${data.branchId}_employees`);
            }
          }
        }

        // Auto-join enrolled or taught courses
        if (Array.isArray(data?.courseIds) && data.courseIds.length > 0) {
          data.courseIds.forEach((cId) => {
            if (cId) socket.join(`course_${cId}`);
          });
        } else if (data?.userId) {
          // Server-side autonomous course room join
          if (data.role === 'student') {
            try {
              const Enrollment = require('../models/Enrollment');
              Enrollment.find({ user: data.userId, isActive: true })
                .distinct('course')
                .then((cIds) => {
                  cIds.forEach((cId) => {
                    if (cId) socket.join(`course_${cId.toString()}`);
                  });
                })
                .catch(() => {});
            } catch (e) {}
          } else if (data.role === 'instructor') {
            try {
              const Course = require('../models/Course');
              Course.find({ instructor: data.userId })
                .distinct('_id')
                .then((cIds) => {
                  cIds.forEach((cId) => {
                    if (cId) socket.join(`course_${cId.toString()}`);
                  });
                })
                .catch(() => {});
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error('[Socket Join Error]', e.message);
      }
    });

    // Dynamic course room subscription
    socket.on('join_course', ({ courseId }) => {
      if (courseId) {
        socket.join(`course_${courseId}`);
      }
    });

    socket.on('leave_course', ({ courseId }) => {
      if (courseId) {
        socket.leave(`course_${courseId}`);
      }
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
};
