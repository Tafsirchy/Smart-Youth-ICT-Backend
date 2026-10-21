// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // CORS headers are set by the cors middleware from the configured allowlist.
  // They are deliberately not re-derived from the request's Origin header here:
  // reflecting an arbitrary origin would hand out credentialed responses to
  // any site on the internet.

  // Handle entity too large (413)
  if (err.type === 'entity.too.large' || err.status === 413) {
    status = 413;
    message = 'Request payload too large. Please upload smaller or compressed images.';
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
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
