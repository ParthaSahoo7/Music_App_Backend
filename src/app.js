// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose')

const authRoutes = require('./modules/auth/authRoutes');

const mediaRoutes = require('./modules/media/mediaRoutes');
const mediaLibraryRoutes = require('./modules/mediaLibrary/mediaLibraryRoutes');
const artistRoutes = require('./modules/artist/artistRoutes');

const { logger, stream } = require('./config/logger');
const {morganMiddleware} = require('./middlewares/morgan.middleware')
const assignLogId = require('./middlewares/assignLogId.middleware');
const responseLogger = require('./middlewares/responseLogger.middleware');

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10000, // limit each IP
  message: 'Too many requests, please try again later.',
});
app.use(limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(morganMiddleware);
app.use(assignLogId);
app.use(responseLogger);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/media',mediaRoutes);
app.use('/api/v1/media-library', mediaLibraryRoutes);
app.use('/api/v1/artist', artistRoutes);

app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbMessage = 'Database is not connected.';

  switch (mongoose.connection.readyState) {
    case 0:
      dbStatus = 'disconnected';
      dbMessage = 'Database is disconnected.';
      break;
    case 1:
      dbStatus = 'connected';
      dbMessage = 'Database is connected successfully.';
      break;
    case 2:
      dbStatus = 'connecting';
      dbMessage = 'Database is currently connecting.';
      break;
    case 3:
      dbStatus = 'disconnecting';
      dbMessage = 'Database is disconnecting.';
      break;
  }

  const isHealthy = dbStatus === 'connected';

  return res.status(isHealthy ? 200 : 500).json({
    status: isHealthy ? 'OK' : 'ERROR',
    server: "PE Entertainment server is running.",
    database: dbMessage
  });
});


// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});


module.exports = app;
