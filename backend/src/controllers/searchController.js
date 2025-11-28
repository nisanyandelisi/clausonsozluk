const { pool } = require('../config/database');
const isProd = process.env.NODE_ENV === 'production';

const sanitizeWordExpr = `REGEXP_REPLACE(word, '^[0-9\\s:\\-*?''()\\[\\]/.,;]+', '')`;

const buildLetterPrefixes = (letter) => {
  if (!letter) return [];
  const l = letter.toString();

  // Türkçe özel harf ayrımları
  switch (l) {
    case 'Ç': return ['Ç', 'ç'];
    case 'Ğ': return ['Ğ', 'ğ'];
    case 'Ş': return ['Ş', 'ş'];
    case 'Ö': return ['Ö', 'ö'];
    case 'Ü': return ['Ü', 'ü'];
    case 'I': return ['I', 'ı']; // Noktasız
    case 'İ': return ['İ', 'i']; // Noktalı
    default:
      return [l.toLowerCase(), l.toUpperCase()];
  }
};

/**
 * Ana arama endpoint'i
 * Türkçe ve İngilizce aramaları destekler
 */
exports.search = async (req, res) => {
  try {
    const {
      q,                           // Arama terimi
      type = 'both',               // 'turkish', 'english', 'both'
      searchIn = 'word',           // 'word', 'meaning'
      searchMode = 'contains',     // 'contains', 'startsWith', 'endsWith', 'exact'
      fuzzy = '0.3',              // Fuzzy matching threshold (0-1)
      limit = '15',               // Default limit 15
      page = '1',                 // Default page 1
      etymology,                  // Etimoloji tipine göre filtre (opsiyonel)
      letterMode                  // Harf şeridi filtresi (case-sensitive ayrım için)
    } = req.query;

    // Validasyon - Artık boş Q'ya izin veriyoruz (Tümünü listeleme için)
    // if (!q || q.trim().length === 0) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Arama terimi gerekli'
    //   });
    // }

    const searchTerm = q ? q.trim() : '';
    const fuzzyThreshold = Math.max(0, Math.min(1, parseFloat(fuzzy)));
    const limitCount = Math.max(1, Math.min(200, parseInt(limit))); // Cap at 200
    const pageNumber = Math.max(1, parseInt(page));
    const offset = (pageNumber - 1) * limitCount;

    let query = '';
    let countQuery = ''; // Total count query
    let params = [];

    const isLetterMode = letterMode === 'true' || letterMode === true;

    if (!searchTerm) {
      // Arama terimi yoksa - Hepsini getir
      query = `SELECT * FROM words`;
      countQuery = `SELECT COUNT(*) as total FROM words`;

      if (etymology) {
        query += ` WHERE etymology_type = $1`;
        countQuery += ` WHERE etymology_type = $1`;
        params.push(etymology);
      }

      query += ` ORDER BY word ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitCount, offset);

    } else if (searchIn === 'meaning') {
      // Anlam bazlı arama - full text + ILIKE (trigram) ile hızlı sorgu
      const whereClause = `(
        to_tsvector('english', COALESCE(meaning, '')) @@ plainto_tsquery('english', regexp_replace($1, '\\\\s+', ' & ', 'g'))
        OR meaning ILIKE '%' || $1 || '%'
        OR COALESCE(full_entry_text, '') ILIKE '%' || $1 || '%'
      )`;

      query = `
        SELECT *,
          GREATEST(
            ts_rank_cd(to_tsvector('english', COALESCE(meaning, '')), plainto_tsquery('english', regexp_replace($1, '\\\\s+', ' & ', 'g'))),
            CASE
              WHEN meaning ILIKE $1 THEN 0.9
              WHEN meaning ILIKE $1 || '%' THEN 0.8
              WHEN meaning ILIKE '%' || $1 || '%' THEN 0.7
              ELSE 0.5
            END
          ) as relevance
        FROM words
        WHERE ${whereClause}
      `;

      countQuery = `SELECT COUNT(*) as total FROM words WHERE ${whereClause}`;

      params = [searchTerm];

      if (etymology) {
        query += ` AND etymology_type = $2`;
        countQuery += ` AND etymology_type = $2`;
        params.push(etymology);
      }

      query += ` ORDER BY relevance DESC, word LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitCount, offset);

    } else {
      // Kelime bazlı arama - MODLARA GÖRE
      let whereClause = '';
      let orderBy = 'ORDER BY word ASC'; // Default alphabetical

      // Relevance sorting for 'contains' mode to prioritize exact matches and startsWith
      let selectClause = 'SELECT *';

      switch (searchMode) {
        case 'startsWith': {
          if (isLetterMode) {
            const prefixes = buildLetterPrefixes(searchTerm);
            const likePatterns = prefixes.map(p => `${p}%`);
            whereClause = `${sanitizeWordExpr} LIKE ANY($1) AND ${sanitizeWordExpr} <> ''`;
            params = [likePatterns];
          } else {
            whereClause = `word_normalized LIKE normalize_word($1) || '%'`;
            params = [searchTerm];
          }
          break;
        }
        case 'startsWithExact':
          // Tam eşleşme: Orijinal kelime ile başlayan (normalize YOK)
          whereClause = `word LIKE $1 || '%'`;
          params = [searchTerm];
          break;
        case 'endsWith':
          // Normalize edilmiş ile biten (fuzzy YOK artık)
          whereClause = `word_normalized LIKE '%' || normalize_word($1)`;
          params = [searchTerm];
          break;
        case 'endsWithExact':
          // Tam eşleşme: Orijinal kelime ile biten (normalize YOK)
          whereClause = `word LIKE '%' || $1`;
          params = [searchTerm];
          break;
        case 'exact':
          // Tam eşleşme
          whereClause = `word_normalized = normalize_word($1)`;
          params = [searchTerm];
          break;
        case 'contains':
        default:
          // SADECE İÇEREN - Fuzzy yok, strict substring match
          whereClause = `word_normalized LIKE '%' || normalize_word($1) || '%'`;

          // Add relevance score for sorting
          selectClause = `
            SELECT *,
            CASE
              WHEN word_normalized = normalize_word($1) THEN 100 -- Exact match
              WHEN word_normalized LIKE normalize_word($1) || '%' THEN 90 -- Starts with
              WHEN word_normalized LIKE '%' || normalize_word($1) || '%' THEN 80 -- Contains
              ELSE 0
            END as relevance
          `;
          orderBy = 'ORDER BY relevance DESC, word ASC';

          params = [searchTerm];
          break;
      }

      query = `${selectClause} FROM words WHERE ${whereClause}`;
      countQuery = `SELECT COUNT(*) as total FROM words WHERE ${whereClause}`;

      if (etymology) {
        query += ` AND etymology_type = $${params.length + 1}`;
        countQuery += ` AND etymology_type = $${params.length + 1}`;
        params.push(etymology);
      }

      query += ` ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitCount, offset);
    }

    // Execute queries
    if (!isProd) {
      console.log('Generated Query:', query);
      console.log('Query Params:', params);
    }

    const result = await pool.query(query, params);

    // For count, we need to execute countQuery with the same params (excluding limit/offset)
    // We need to slice params to remove limit and offset
    const countParams = params.slice(0, params.length - 2);

    // Special case for 'contains' if we switched away from search_words function
    // If we kept search_words, we'd need to handle count differently.
    // For now, the above logic uses standard SQL for all modes, so countQuery works.

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // Varyantları ve çapraz referansları yükle
    const wordIds = result.rows.map(row => row.id);

    let variantsMap = {};
    if (wordIds.length > 0) {
      const variantsResult = await pool.query(
        'SELECT word_id, variant FROM variants WHERE word_id = ANY($1)',
        [wordIds]
      );

      variantsResult.rows.forEach(v => {
        if (!variantsMap[v.word_id]) variantsMap[v.word_id] = [];
        variantsMap[v.word_id].push(v.variant);
      });
    }

    // Sonuçları formatla
    const results = result.rows.map(row => ({
      id: row.id,
      word: row.word,
      meaning: row.meaning,
      full_entry_text: row.full_entry_text,
      etymology_type: row.etymology_type,
      occurrence_number: row.occurrence_number,
      similarity_score: row.similarity_score ? parseFloat(row.similarity_score).toFixed(2) : null,
      match_type: row.match_type,
      variants: variantsMap[row.id] || []
    }));

    res.json({
      success: true,
      query: {
        term: searchTerm,
        type,
        fuzzy_threshold: fuzzyThreshold
      },
      results,
      count: results.length,
      total: totalCount,
      page: pageNumber,
      total_pages: Math.ceil(totalCount / limitCount)
    });

  } catch (error) {
    console.error('Arama hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Arama sırasında bir hata oluştu'
    });
  }
};

/**
 * Kelime detayı endpoint'i
 */
exports.getWordDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // Kelimeyi getir
    const wordResult = await pool.query(
      'SELECT * FROM words WHERE id = $1',
      [id]
    );

    if (wordResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kelime bulunamadı'
      });
    }

    const word = wordResult.rows[0];

    // Varyantları getir
    const variantsResult = await pool.query(
      'SELECT variant FROM variants WHERE word_id = $1',
      [id]
    );

    // Çapraz referansları çöz (eğer varsa)
    let crossReferenceData = null;
    if (word.cross_reference) {
      const crossRefResult = await pool.query(
        'SELECT id, word, meaning FROM words WHERE word = $1 LIMIT 1',
        [word.cross_reference]
      );
      if (crossRefResult.rows.length > 0) {
        crossReferenceData = crossRefResult.rows[0];
      }
    }

    // Aynı kelimeden diğer girişler (1 olug, 2 olug, etc.)
    const otherOccurrencesResult = await pool.query(
      'SELECT id, word, meaning, occurrence_number FROM words WHERE word = $1 AND id != $2 ORDER BY occurrence_number',
      [word.word, id]
    );

    res.json({
      success: true,
      data: {
        ...word,
        variants: variantsResult.rows.map(v => v.variant),
        cross_reference_detail: crossReferenceData,
        other_occurrences: otherOccurrencesResult.rows
      }
    });

  } catch (error) {
    console.error('Kelime detay hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kelime detayı getirilirken bir hata oluştu'
    });
  }
};

/**
 * Otomatik tamamlama (autocomplete) endpoint'i
 */
exports.autocomplete = async (req, res) => {
  try {
    const { q, limit = '10' } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    const searchTerm = q.trim();
    const limitCount = Math.max(1, Math.min(50, parseInt(limit)));

    // Prefix match ile hızlı autocomplete
    const result = await pool.query(`
      SELECT DISTINCT word
      FROM words
      WHERE word_normalized LIKE $1 || '%'
      ORDER BY word
      LIMIT $2
    `, [searchTerm.toLowerCase(), limitCount]);

    res.json({
      success: true,
      suggestions: result.rows.map(row => row.word)
    });

  } catch (error) {
    console.error('Autocomplete hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Autocomplete sırasında bir hata oluştu'
    });
  }
};

/**
 * Etimoloji tiplerini getir
 */
exports.getEtymologies = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT etymology_type 
      FROM words 
      WHERE etymology_type IS NOT NULL AND etymology_type != ''
      ORDER BY etymology_type ASC
    `);

    // Extract just the strings
    const types = result.rows.map(r => r.etymology_type);

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Etimoloji listesi hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Etimoloji listesi alınamadı.'
    });
  }
};

/**
 * İstatistikler endpoint'i
 */
exports.getStatistics = async (req, res) => {
  try {
    // Temel istatistikler
    const statsResult = await pool.query('SELECT * FROM word_statistics');
    const stats = statsResult.rows[0];

    // Etimoloji tipi dağılımı
    const etymologyResult = await pool.query(`
      SELECT etymology_type, COUNT(*) as count
      FROM words
      GROUP BY etymology_type
      ORDER BY count DESC
    `);

    // En çok tekrarlanan kelimeler
    const repeatedResult = await pool.query(`
      SELECT word, MAX(occurrence_number) as max_occurrence
      FROM words
      GROUP BY word
      HAVING MAX(occurrence_number) > 1
      ORDER BY max_occurrence DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      statistics: {
        unique_words: stats.unique_words,
        total_entries: stats.total_entries,
        etymology_types: stats.etymology_types,
        repeated_words: stats.repeated_words,
        total_variants: stats.total_variants,
        etymology_distribution: etymologyResult.rows,
        most_repeated: repeatedResult.rows
      }
    });

  } catch (error) {
    console.error('İstatistik hatası:', error);
    res.status(500).json({
      success: false,
      error: 'İstatistikler getirilirken bir hata oluştu'
    });
  }
};

/**
 * Rastgele kelime endpoint'i
 */
exports.getRandomWord = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*,
             (SELECT json_agg(v.variant) FROM variants v WHERE v.word_id = w.id) as variants
      FROM words w
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kelime bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Rastgele kelime hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Rastgele kelime getirilirken bir hata oluştu'
    });
  }
};
