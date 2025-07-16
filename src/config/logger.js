const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logFormat = format.printf((info) => {
  const { timestamp, level, message, logId, userId, stack, ...meta } = info;

  let metaStr = '';
  if (Object.keys(meta).length > 0) {
    metaStr = ` | meta: ${JSON.stringify(meta)}`;
  }

  return `${timestamp} [${level.toUpperCase()}] [logId:${logId || '-'}] [user:${userId || 'guest'}]: ${stack || message}${metaStr}`;
});


const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.uncolorize(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join('logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '14d',
      level: 'info',
    }),
    new DailyRotateFile({
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '5m',
      maxFiles: '30d',
      level: 'error',
    })
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join('logs', 'exceptions.log') })
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join('logs', 'rejections.log') })
  ],
  exitOnError: false,
});

const stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = { logger, stream };
