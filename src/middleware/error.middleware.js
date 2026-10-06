// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation/casting failures are caused by the request payload, so
  // they must be reported as client errors instead of an opaque 500.
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    // Mongoose already formats `message` as "<model> validation failed: path: detail".
    const details = Object.values(err.errors)
      .map((detail) => (typeof detail === 'string' ? detail : detail && detail.message))
      .filter(Boolean);

    message = err.message || details.join(', ') || 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for "${err.path}".`;
  } else if (err.code === 11000) {
    status = 409;
    const fields = Object.keys(err.keyValue || {}).join(', ') || 'field';
    message = `A record with that ${fields} already exists.`;
  }

  if (status >= 500) {
    console.error(`[${status}] ${req.method} ${req.originalUrl} →`, err);
  } else if (process.env.NODE_ENV === 'development') {
    console.warn(`[${status}] ${req.method} ${req.originalUrl} →`, message);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && req.hostname === 'localhost' && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;
