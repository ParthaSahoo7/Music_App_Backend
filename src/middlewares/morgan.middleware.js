// === src/middlewares/morgan.middleware.js ===
// const morgan = require('morgan');
// const { stream } = require('../config/logger');
import morgan from 'morgan';
import { stream } from '../config/logger.js';

// Custom tokens
morgan.token('log-id', (req) => req.logId || '-');
morgan.token('user-id', (req) => req.user?.userId || 'guest');
morgan.token('method', (req) => req.method);
morgan.token('url', (req) => req.originalUrl);
morgan.token('status', (req, res) => res.statusCode);
morgan.token('response-time', (req, res, digits) => {
  if (!res._startAt || !req._startAt) return '-';
  const ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
             (res._startAt[1] - req._startAt[1]) * 1e-6;
  return ms.toFixed(digits === undefined ? 3 : digits);
});
morgan.token('safe-body', (req) => {
  // Filter sensitive fields before logging
  const { password, token, ...safeBody } = req.body || {};
  return JSON.stringify(safeBody);
});

// Skip health checks and other noise
const skip = (req, res) => {
  return req.originalUrl === '/health';
};

// Define format string
const format =
  ':log-id :user-id :method :url :status :response-time ms - body=:safe-body';

const morganMiddleware = morgan(format, { stream, skip });


export default morganMiddleware; // ✅ Use ESM export
