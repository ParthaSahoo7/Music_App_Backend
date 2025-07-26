// const mongoose = require('mongoose');
// const { logger } = require('./logger');

import mongoose from 'mongoose';
import { logger } from './logger.js';

const connectDB = async () => {
  const MONGO_URI = process.env.MONGODB_URI;

  if (!MONGO_URI) {
    logger.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);

    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1); 
  }


  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
};

export default connectDB;
