/**
 * Socket gateway authentication.
 *
 * The realtime gateway used to accept any connection and let the client
 * declare who it was and which rooms it wanted to join. These tests pin the
 * replacement behaviour: a valid token is required, and every room
 * subscription is derived from the account behind that token.
 */
const http = require('http');
const { io: ioClient } = require('socket.io-client');

const { initSocket, closeSocket, getIO } = require('../../src/sockets/socket');
const { createUser } = require('../helpers/auth');
const { createBranch, createCourse, createEnrollment } = require('../helpers/fixtures');

const ALLOW_ALL_ORIGIN = () => true;

const connect = (url, options = {}) =>
  new Promise((resolve) => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      ...options,
    });
    const finish = (outcome) => {
      socket.off('connect');
      socket.off('connect_error');
      resolve(outcome);
    };
    socket.on('connect', () => finish({ ok: true, socket }));
    socket.on('connect_error', (err) => finish({ ok: false, error: err }));
  });

const emitAndWait = (socket, event, payload) =>
  new Promise((resolve) => {
    socket.emit(event, payload, () => resolve());
  });

describe('socket authentication', () => {
  let server;
  let url;
  let branch;

  beforeAll(async () => {
    server = http.createServer();
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://localhost:${server.address().port}`;
    initSocket(server, ALLOW_ALL_ORIGIN);
  });

  afterAll(async () => {
    closeSocket();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    branch = await createBranch({ name: 'Socket Campus', code: 'SOCK' });
  });

  it('rejects a connection without a token', async () => {
    const outcome = await connect(url);
    expect(outcome.ok).toBe(false);
    expect(outcome.error.message).toMatch(/Authentication required/i);
  });

  it('rejects a connection with an invalid token', async () => {
    const outcome = await connect(url, { auth: { token: 'not-a-real-token' } });
    expect(outcome.ok).toBe(false);
    expect(outcome.error.message).toMatch(/Invalid or expired token/i);
  });

  it('rejects a connection for a disabled account', async () => {
    const user = await createUser({ role: 'student', branchId: branch._id, isActive: false });
    const outcome = await connect(url, { auth: { token: user.token } });
    expect(outcome.ok).toBe(false);
    expect(outcome.error.message).toMatch(/disabled/i);
  });

  it('rejects a connection whose token version was revoked', async () => {
    const user = await createUser({ role: 'student', branchId: branch._id, tokenVersion: 0 });
    const stale = require('../../src/utils/jwt').generateToken({ _id: user.user._id, tokenVersion: 0 });
    // The account is now at token version 1, so the token is no longer valid.
    await require('../../src/models/User').updateOne(
      { _id: user.user._id },
      { $set: { tokenVersion: 1 } }
    );

    const outcome = await connect(url, { auth: { token: stale } });
    expect(outcome.ok).toBe(false);
    expect(outcome.error.message).toMatch(/Session expired/i);
  });

  it('accepts a valid token', async () => {
    const user = await createUser({ role: 'student', branchId: branch._id });
    const outcome = await connect(url, { auth: { token: user.token } });
    expect(outcome.ok).toBe(true);
    outcome.socket.disconnect();
  });

  it('ignores a client-declared identity and joins the rooms of the token owner', async () => {
    const student = await createUser({ role: 'student', branchId: branch._id });
    const otherBranch = await createBranch({ name: 'Other Campus', code: 'OTHR' });

    const outcome = await connect(url, { auth: { token: student.token } });
    expect(outcome.ok).toBe(true);
    const socket = outcome.socket;

    // The client claims to be a super admin in another branch.
    await emitAndWait(socket, 'join_enterprise', {
      userId: '64b8f0c2a1b2c3d4e5f60718',
      role: 'super_admin',
      branchId: otherBranch._id.toString(),
    });

    const rooms = getIO().sockets.adapter.rooms;
    const socketId = socket.id;

    expect(rooms.get(`user_${student.id}`)?.has(socketId)).toBe(true);
    expect(rooms.get(`role_student`)?.has(socketId)).toBe(true);
    expect(rooms.get(`branch_${branch._id}`)?.has(socketId)).toBe(true);

    expect(rooms['room_executives']?.has(socketId)).toBeFalsy();
    expect(rooms['role_super_admin']?.has(socketId)).toBeFalsy();
    expect(rooms.get(`branch_${otherBranch._id}`)?.has(socketId)).toBeFalsy();
    expect(rooms['user_64b8f0c2a1b2c3d4e5f60718']?.has(socketId)).toBeFalsy();

    socket.disconnect();
  });

  it('does not let a client join a course room it is not part of', async () => {
    const instructor = await createUser({ role: 'instructor', branchId: branch._id });
    const course = await createCourse({
      branchId: branch._id,
      instructor: instructor.user._id,
    });

    const outcome = await connect(url, { auth: { token: instructor.token } });
    const socket = outcome.socket;

    await emitAndWait(socket, 'join_course', { courseId: course._id.toString() });
    const rooms = getIO().sockets.adapter.rooms;

    expect(rooms.get(`course_${course._id}`)?.has(socket.id)).toBe(true);
    socket.disconnect();
  });

  it('does not let a client join a course room it is not entitled to', async () => {
    const student = await createUser({ role: 'student', branchId: branch._id });
    const instructor = await createUser({ role: 'instructor', branchId: branch._id });
    const foreignCourse = await createCourse({
      branchId: branch._id,
      instructor: instructor.user._id,
    });

    const outcome = await connect(url, { auth: { token: student.token } });
    const socket = outcome.socket;

    await emitAndWait(socket, 'join_course', { courseId: foreignCourse._id.toString() });
    const rooms = getIO().sockets.adapter.rooms;

    expect(rooms.get(`course_${foreignCourse._id}`)?.has(socket.id)).toBeFalsy();
    socket.disconnect();
  });

  it('auto-joins the courses a student is enrolled in', async () => {
    const student = await createUser({ role: 'student', branchId: branch._id });
    const instructor = await createUser({ role: 'instructor', branchId: branch._id });
    const course = await createCourse({
      branchId: branch._id,
      instructor: instructor.user._id,
    });
    await createEnrollment({
      user: student.user._id,
      course: course._id,
      branchId: branch._id,
      isActive: true,
    });

    const outcome = await connect(url, { auth: { token: student.token } });
    const socket = outcome.socket;

    await emitAndWait(socket, 'join_enterprise', {});
    await new Promise((resolve) => setTimeout(resolve, 150));

    const rooms = getIO().sockets.adapter.rooms;
    expect(rooms.get(`course_${course._id}`)?.has(socket.id)).toBe(true);
    socket.disconnect();
  });
});
