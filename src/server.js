require('dotenv').config();

const app = require('./app');

const { logger } = require('./config/logger');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    logger.error('Startup error:', error);
    process.exit(1);
  }
};

startServer();
