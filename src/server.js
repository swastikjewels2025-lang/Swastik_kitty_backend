import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  try {
    // Attempt DB connection
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn(`[Server Warning] MongoDB connection failed (${dbErr.message}). Server running in standby mode.`);
    }

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`💎 Swastik Kitty API Server running on port ${config.port}`);
      console.log(`🚀 API Base URL: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`🩺 Health Check: http://localhost:${config.port}${config.apiPrefix}/health`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error(`[Server Fatal] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
