import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async (customUri) => {
  const uri = customUri || config.mongodbUri;
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected to database: ${conn.connection.name} at ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected gracefully');
  } catch (error) {
    console.error(`[MongoDB] Disconnect error: ${error.message}`);
  }
};
