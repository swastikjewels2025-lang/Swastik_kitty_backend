import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/swastik_kitty',
  jwt: {
    secret: process.env.JWT_SECRET || 'swastik_kitty_vault_secret_key_default',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  },
  gokwik: {
    appId: process.env.GOKWIK_APP_ID || '',
    appSecret: process.env.GOKWIK_APP_SECRET || '',
    webhookSecret: process.env.GOKWIK_WEBHOOK_SECRET || '',
    baseUrl: process.env.GOKWIK_BASE_URL || 'https://sandbox.gokwik.co'
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'MSG91',
    authKey: process.env.MSG91_AUTH_KEY || '',
    templateId: process.env.MSG91_OTP_TEMPLATE_ID || '',
    senderId: process.env.MSG91_SENDER_ID || 'SWASTK'
  }
};
