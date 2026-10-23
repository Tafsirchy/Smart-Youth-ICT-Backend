/**
 * Supertest bound to the real Express application.
 *
 * `require('../../src/app')` builds the same middleware stack the HTTP server
 * uses — the only thing missing is `listen()`, which is what makes an
 * in-process request possible.
 */
const supertest = require('supertest');
const app = require('../../src/app');

const request = () => supertest(app);

module.exports = { request, app };
