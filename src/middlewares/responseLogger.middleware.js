// middlewares/responseLogger.js
// const { logger } = require('../config/logger');
import { logger } from '../config/logger.js';

const responseLogger = (req, res, next) => {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const [sec, nano] = process.hrtime(startHrTime);
    const responseTimeMs = (sec * 1000 + nano / 1e6).toFixed(3);

    const logEntry = {
      logId: req.logId || '-',
      userId: req.user?.userId || 'guest',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTimeMs} ms`,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'] || '',
      requestBody: sanitizeBody(req.body),
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString(),
    };

    //logger.info(`Request completed: ${JSON.stringify(logEntry)}`);
    //logger.info(`Request completed: ${logEntry}`)
    logger.info('Request completed', logEntry);

  });

  next();
};

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const { password, token, ...rest } = body;
  return rest;
};

export default responseLogger;
