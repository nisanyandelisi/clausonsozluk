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

    // Extensions
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await pool.query('CREATE EXTENSION IF NOT EXISTS unaccent');

    // Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS words (
        id SERIAL PRIMARY KEY,
        word TEXT NOT NULL,
        word_normalized TEXT NOT NULL,
        search_keywords TEXT[],
        meaning TEXT,
        etymology_type TEXT,
        cross_reference TEXT,
        full_entry_text TEXT,
        occurrence_number INTEGER DEFAULT 1,
        is_corrected BOOLEAN DEFAULT FALSE,
        corrected_at TIMESTAMP,
        corrected_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS variants (
        id SERIAL PRIMARY KEY,
        word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
        variant TEXT NOT NULL,
        variant_normalized TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
        word_text TEXT,
        error_types TEXT[],
        suggested_correction TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_words_word ON words(word)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_words_word_normalized ON words(word_normalized)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_words_etymology_type ON words(etymology_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_variants_word_id ON variants(word_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_variants_variant ON variants(variant)');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_words_meaning_fts ON words USING GIN(to_tsvector('english', COALESCE(meaning, '')))`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_words_word_fts ON words USING GIN(to_tsvector('simple', word))`);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_words_word_trgm ON words USING GIN(word_normalized gin_trgm_ops)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_words_meaning_trgm ON words USING GIN(meaning gin_trgm_ops)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_variants_variant_trgm ON variants USING GIN(variant_normalized gin_trgm_ops)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_words_word_etym ON words(word, etymology_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_words_occurrence ON words(word, occurrence_number)');

    // Function
    await pool.query(`
      CREATE OR REPLACE FUNCTION normalize_word(word TEXT)
      RETURNS TEXT AS $func$
      BEGIN
        RETURN TRANSLATE(
          LOWER(
            REGEXP_REPLACE(
              REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                word,
                'İ', 'i'), 'I', 'i'),
                'Ş', 's'), 'ş', 's'),
                'Ğ', 'g'), 'ğ', 'g'),
              E'^\\\\d+\\\\s*', '')
          ),
          'ıñŋḏḍéāīūÜüÖöÇç',
          'innddeaiuuuoocc'
        );
      END;
      $func$ LANGUAGE plpgsql IMMUTABLE
    `);

    // Trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $func$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql
    `);

    // Trigger
    await pool.query('DROP TRIGGER IF EXISTS update_words_updated_at ON words');
    await pool.query(`
      CREATE TRIGGER update_words_updated_at
        BEFORE UPDATE ON words
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

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
    const countCheck = await pool.query('SELECT COUNT(*) FROM words');
    const currentCount = parseInt(countCheck.rows[0].count);

    if (currentCount > 0) {
      return res.json({
        success: false,
        message: `Veriler zaten var! ${currentCount} kelime mevcut.`
      });
    }

    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    // Render path: /opt/render/project/src/backend/scripts/import_data.py
    const result = await execPromise('cd /opt/render/project/src/backend && python3 scripts/import_data.py');

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
