import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
 import { logger } from './config/logger.js';
 import connectDB from './config/db.js';
console.log('🚀 Connecting to database...');

 const PORT = process.env.PORT || 3000;
 console.log(`🚀 Starting server on port ${PORT}`);

const startServer = async () => {
  console.log('Starting server...');
  logger.info('Starting server initialization...');

  try {
    logger.info('Connecting to database...');
    await connectDB();
    logger.info('Database connected successfully.');
  } catch (dbError) {
    logger.error('❌ Failed to connect to database:', dbError);
    console.error('❌ Failed to connect to database:', dbError);
    process.exit(1); // Exit early since DB is critical
  }

  try {
    app.listen(PORT, () => {
      logger.info(`✅ Server running on http://localhost:${PORT}`);
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (serverError) {
    logger.error('❌ Failed to start server:', serverError);
    console.error('❌ Failed to start server:', serverError);
    process.exit(1);
  }
};

startServer().catch((e) => {
  logger.error('Uncaught error during server start:', e);
  console.error('Uncaught error during server start:', e);
  process.exit(1);
});

