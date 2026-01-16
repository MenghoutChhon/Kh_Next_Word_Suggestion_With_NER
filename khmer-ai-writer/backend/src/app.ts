import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';

const app = express();

app.use(helmet());
const devOrigins = ['http://localhost:3001', 'http://localhost:3000', 'http://frontend:3001', 'http://localhost:3003'];
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = [...devOrigins, ...envOrigins];
const allowAllInDev = process.env.NODE_ENV !== 'production'; // ease CORS during local/dev runs, even with remote hosts

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile/curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (allowAllInDev) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']
}));
app.use(express.json());
// app.use(morgan('dev'));
app.use(rateLimit);

// Base routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Khmer AI Writer API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// error handler
app.use(errorHandler);

// Start server unless we're in tests (supertest doesn't require a listener)
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
