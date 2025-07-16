const { logger } = require('../config/logger');

const createRequestLogger = (req) => {
  const logId = req.logId || '-';
  const userId = req.user?.userId || 'guest';

  return {
    info: (msg) => logger.info(msg, { logId, userId }),
    warn: (msg) => logger.warn(msg, { logId, userId }),
    error: (err) => logger.error(err, { logId, userId }),
    debug: (msg) => logger.debug(msg, { logId, userId }),
  };
};

module.exports = { createRequestLogger };