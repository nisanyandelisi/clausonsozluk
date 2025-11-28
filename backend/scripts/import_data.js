const { pool } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

function normalizeWord(word) {
  if (!word) return '';

  let normalized = word.replace(/^\d+\s*/, '');
  normalized = normalized.replace(/[:*?'()\[\]\/.,;-]/g, '');

  const replacements = {
    'İ': 'i', 'I': 'i',
    'Ş': 's', 'ş': 's',
    'Ğ': 'g', 'ğ': 'g',
    'Ü': 'u', 'ü': 'u',
    'Ö': 'o', 'ö': 'o',
    'Ç': 'c', 'ç': 'c',
    'ı': 'i',
    'ñ': 'n', 'ŋ': 'n',
    'ḏ': 'd', 'ḍ': 'd',
    'é': 'e', 'ā': 'a', 'ī': 'i', 'ū': 'u',
    ' ': ''
  };

  normalized = normalized.toLowerCase();
  for (const [old, newChar] of Object.entries(replacements)) {
    normalized = normalized.split(old.toLowerCase()).join(newChar);
  }

  return normalized;
}

async function importData() {
  try {
    console.log('🚀 Clauson Sözlük - Veri İmport Başlıyor...\n');

    const datasDir = path.join(__dirname, '../../Datas');
    const files = fs.readdirSync(datasDir).filter(f => f.endsWith('.json')).sort();

    console.log(`📁 ${files.length} JSON dosyası bulundu\n`);

    let totalWords = 0;
    const wordCount = {};

    for (const file of files) {
      console.log(`📖 ${file} işleniyor...`);

      const filePath = path.join(datasDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      for (const entry of data) {
        const word = entry.word || '';
        const baseWord = word.replace(/^\d+\s*/, '').trim();
        wordCount[baseWord] = (wordCount[baseWord] || 0) + 1;
        const occurrenceNumber = wordCount[baseWord];

        const wordNormalized = normalizeWord(word);
        const searchKeywords = word.includes('/')
          ? word.split('/').map(p => normalizeWord(p.trim())).filter(Boolean)
          : null;

        await pool.query(`
          INSERT INTO words (
            word, word_normalized, search_keywords, meaning,
            etymology_type, cross_reference, full_entry_text, occurrence_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          word,
          wordNormalized,
          searchKeywords,
          entry.meaning || null,
          entry.etymology_type || 'Basic',
          entry.cross_reference || '',
          entry.full_entry_text || '',
          occurrenceNumber
        ]);

        totalWords++;
      }

      console.log(`   ✓ ${data.length} kelime eklendi`);
    }

    console.log(`\n✅ Toplam ${totalWords} kelime başarıyla import edildi!`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

importData();
