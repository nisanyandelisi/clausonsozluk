const { Pool } = require('pg');
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const getEnv = (key, fallback) => {
  if (isProd && !process.env[key]) {
    throw new Error(`Eksik ortam değişkeni: ${key}`);
  }
  return process.env[key] || fallback;
};

// PostgreSQL bağlantı havuzu
const pool = new Pool({
  user: getEnv('DB_USER', 'postgres'),
  host: getEnv('DB_HOST', 'localhost'),
  database: getEnv('DB_NAME', 'clauson_db'),
  password: getEnv('DB_PASSWORD', 'postgres'),
  port: parseInt(getEnv('DB_PORT', '5432')),
  max: 20, // Maksimum bağlantı sayısı
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Bağlantı testi
pool.on('connect', () => {
  if (!isProd) {
    console.log('✓ PostgreSQL veritabanına bağlandı');
  }
});

pool.on('error', (err) => {
  console.error('❌ Beklenmeyen veritabanı hatası:', err);
  process.exit(-1);
});

// Query helper
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (!isProd) {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query
};
