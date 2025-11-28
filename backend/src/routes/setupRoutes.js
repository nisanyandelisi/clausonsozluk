const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

// SADECE 1 KERE ÇALIŞTIR - Schema yükle
router.post('/init-schema', async (req, res) => {
  try {
    // Önce tablo var mı kontrol et
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'words'
      );
    `);

    if (checkTable.rows[0].exists) {
      return res.json({
        success: false,
        message: 'Schema zaten yüklü! words tablosu var.'
      });
    }

    // Schema'yı yükle (basitleştirilmiş versiyon)
    const schemaPath = path.join(__dirname, '../../database/schema-simple.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schemaSql);

    res.json({
      success: true,
      message: 'Schema başarıyla yüklendi! Tablolar oluşturuldu.'
    });
  } catch (error) {
    console.error('Schema yükleme hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SADECE 1 KERE ÇALIŞTIR - Verileri import et
router.post('/import-data', async (req, res) => {
  try {
    // Kelime sayısını kontrol et
    const countCheck = await pool.query('SELECT COUNT(*) FROM words');
    const currentCount = parseInt(countCheck.rows[0].count);

    if (currentCount > 0) {
      return res.json({
        success: false,
        message: `Veriler zaten var! ${currentCount} kelime mevcut.`
      });
    }

    // Python script'i çalıştır
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    const result = await execPromise('cd /opt/render/project/src && python3 ../../scripts/import_data.py');

    res.json({
      success: true,
      message: 'Veri import başarılı!',
      output: result.stdout
    });
  } catch (error) {
    console.error('Veri import hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stderr: error.stderr
    });
  }
});

// Durum kontrolü
router.get('/status', async (req, res) => {
  try {
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const wordCount = await pool.query('SELECT COUNT(*) FROM words').catch(() => ({ rows: [{ count: 0 }] }));
    const variantCount = await pool.query('SELECT COUNT(*) FROM variants').catch(() => ({ rows: [{ count: 0 }] }));
    const reportCount = await pool.query('SELECT COUNT(*) FROM reports').catch(() => ({ rows: [{ count: 0 }] }));

    res.json({
      tables: tables.rows.map(r => r.table_name),
      counts: {
        words: parseInt(wordCount.rows[0].count),
        variants: parseInt(variantCount.rows[0].count),
        reports: parseInt(reportCount.rows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
