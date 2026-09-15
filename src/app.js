import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { responseEnvelope } from './middleware/responseEnvelope.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import apiRouter from './routes/index.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing (allow mobile & web clients)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-gokwik-signature']
}));

// Request logger (only in non-test mode)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response Envelope Middleware
app.use(responseEnvelope);

// Mount master /api/v1 router
app.use(config.apiPrefix, apiRouter);

// Root fallback
app.get('/', (req, res) => {
  res.ok({
    name: 'Swastik Kitty API Gateway',
    version: '1.0.0',
    docs: `${config.apiPrefix}/health`
  }, 'Welcome to Swastik Jewellers Digital Kitty Vault API.');
});

// 404 Route Not Found
app.use(notFoundHandler);

// Central Error Handler
app.use(errorHandler);

export default app;
