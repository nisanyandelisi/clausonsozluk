const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const searchRoutes = require('./routes/searchRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Güvenlik headers
app.use(compression()); // Response compression

// CORS - Production ve Development
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://your-username.github.io', // GitHub Pages URL'inizi buraya yazın
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} [${duration}ms]`);
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Clauson Türk Etimoloji Sözlüğü API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      search: '/api/search?q={term}&type={turkish|english|both}',
      autocomplete: '/api/search/autocomplete?q={term}',
      word_detail: '/api/search/word/:id',
      statistics: '/api/search/statistics',
      random: '/api/search/random'
    },
    documentation: 'https://github.com/...'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint bulunamadı'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Sunucu hatası:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Sunucu hatası oluştu'
      : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal alındı, sunucu kapatılıyor...');
  pool.end(() => {
    console.log('Veritabanı bağlantıları kapatıldı');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 CLAUSON ETİMOLOJİ SÖZLÜĞÜ API');
  console.log('='.repeat(70));
  console.log(`✓ Server çalışıyor: http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  console.log('='.repeat(70) + '\n');
});

module.exports = app;
