import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl) or matching dev ports
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'rapid-route-adminpanel-backend',
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Rapid Route Enterprise Transit API',
    version: '1.0.0',
    documentation: '/api/v1',
    health: '/health',
  });
});

// Main API Router
app.use('/api/v1', apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    status: 404,
    path: req.originalUrl,
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
