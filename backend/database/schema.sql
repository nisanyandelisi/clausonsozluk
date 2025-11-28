-- Clauson Etimoloji Sözlüğü - Veritabanı Şeması
-- PostgreSQL 15+

-- Extension'ları aktifleştir
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Fuzzy string matching
CREATE EXTENSION IF NOT EXISTS unaccent; -- Accent-insensitive search

-- Ana kelimeler tablosu
CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,                    -- Orijinal kelime (ör: "a:", "ap", "ağır")
    word_normalized TEXT NOT NULL,         -- Normalize edilmiş kelime (arama için)
    search_keywords TEXT[],                -- Arama anahtarları (örn: ["ötenç", "ötünç"])
    meaning TEXT,                          -- İngilizce anlam
    etymology_type TEXT,                   -- Basic, D, F, VU, PU, etc. (Expanded)
    cross_reference TEXT,                  -- Çapraz referans ("ol", "1 ap", etc.)
    full_entry_text TEXT,                  -- Tam giriş metni
    occurrence_number INTEGER DEFAULT 1,   -- 1 olug, 2 olug, 3 olug...
    is_corrected BOOLEAN DEFAULT FALSE,    -- Admin tarafından düzeltilmiş mi?
    corrected_at TIMESTAMP,                -- Ne zaman düzeltildi?
    corrected_by TEXT,                     -- Kim düzeltti? (admin username)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Kelime varyantları tablosu
CREATE TABLE variants (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    variant TEXT NOT NULL,                 -- Varyant kelime (ör: "ep" for "ap")
    variant_normalized TEXT NOT NULL,      -- Normalize edilmiş varyant
    created_at TIMESTAMP DEFAULT NOW()
);

-- Raporlar tablosu
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    word_text TEXT,                        -- Rapor edildiği andaki kelime metni
    error_types TEXT[],                    -- Hata tipleri (örn: ["Yazım Hatası", "Anlam Hatası"])
    suggested_correction TEXT,             -- Önerilen düzeltme
    description TEXT,                      -- Açıklama
    status TEXT DEFAULT 'pending',         -- 'pending', 'reviewed', 'resolved'
    created_at TIMESTAMP DEFAULT NOW()
);

-- İndeksler - PERFORMANS İÇİN ÇOK ÖNEMLİ!

-- 1. Temel indeksler
CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_words_word_normalized ON words(word_normalized);
CREATE INDEX idx_words_etymology_type ON words(etymology_type);
CREATE INDEX idx_variants_word_id ON variants(word_id);
CREATE INDEX idx_variants_variant ON variants(variant);

-- 2. Full-text search indeksleri (İngilizce anlam için)
CREATE INDEX idx_words_meaning_fts ON words
    USING GIN(to_tsvector('english', COALESCE(meaning, '')));

-- 3. Full-text search indeksleri (Türkçe kelime için - simple dictionary)
CREATE INDEX idx_words_word_fts ON words
    USING GIN(to_tsvector('simple', word));

-- 4. Trigram indeksleri (fuzzy matching için)
CREATE INDEX idx_words_word_trgm ON words
    USING GIN(word_normalized gin_trgm_ops);
CREATE INDEX idx_words_meaning_trgm ON words
    USING GIN(meaning gin_trgm_ops);
CREATE INDEX idx_variants_variant_trgm ON variants
    USING GIN(variant_normalized gin_trgm_ops);

-- 5. Composite indeksler (sık kullanılan sorgular için)
CREATE INDEX idx_words_word_etym ON words(word, etymology_type);
CREATE INDEX idx_words_occurrence ON words(word, occurrence_number);

-- Yardımcı fonksiyonlar

-- Kelime normalize etme fonksiyonu (Türkçe karakterler için)
-- GELİŞMİŞ: ı/i, ğ/g, ş/s, ç/c yakınsaması eklenmiş
CREATE OR REPLACE FUNCTION normalize_word(word TEXT)
RETURNS TEXT AS $$
BEGIN
    -- 1. Küçük harfe çevir
    -- 2. Baştaki sayıları temizle
    -- 3. Türkçe karakterleri normalize et (ı→i, ğ→g, ş→s, ç→c, ü→u, ö→o)
    -- 4. Özel fonetik karakterleri dönüştür
    -- 5. Noktalama işaretlerini kaldır
    RETURN TRANSLATE(
        LOWER(
            REGEXP_REPLACE(
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                    word,
                    'İ', 'i'), 'I', 'i'), -- İ ve I → i (önemli!)
                    'Ş', 's'), 'ş', 's'), -- Ş → s
                    'Ğ', 'g'), 'ğ', 'g'), -- Ğ → g
                    'Ü', 'u'), 'ü', 'u'), -- Ü → u
                    'Ö', 'o'), 'ö', 'o'), -- Ö → o
                    'Ç', 'c'), 'ç', 'c'), -- Ç → c
                '^\d+\s*', '') -- Baştaki sayıları sil
        ),
        'ıñŋḏḍéāīūʾʿ:-*?''()[]/.,;', -- Silinecek/dönüştürülecek karakterler
        'innddeaiu'                   -- Yerine gelecekler
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Kelime arama fonksiyonu (fuzzy + exact)
DROP FUNCTION IF EXISTS search_words(text,text,real,integer);
CREATE OR REPLACE FUNCTION search_words(
    search_term TEXT,
    search_type TEXT DEFAULT 'both', -- 'turkish', 'english', 'both'
    fuzzy_threshold REAL DEFAULT 0.3,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    word TEXT,
    meaning TEXT,
    etymology_type TEXT,
    occurrence_number INTEGER,
    similarity_score REAL,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH turkish_matches AS (
        -- Tam eşleşme
        SELECT
            w.id, w.word, w.meaning, w.etymology_type, w.occurrence_number,
            1.0::REAL as score,
            'exact'::TEXT as mtype
        FROM words w
        WHERE
            search_type IN ('turkish', 'both') AND
            (
                w.word = search_term OR 
                w.word_normalized = normalize_word(search_term) OR
                search_term = ANY(w.search_keywords) OR
                unaccent(w.word_normalized) = unaccent(normalize_word(search_term)) -- ag -> ağ desteği
            )

        UNION ALL

        -- Prefix eşleşme (ol -> ol-, ola:, etc.)
        SELECT
            w.id, w.word, w.meaning, w.etymology_type, w.occurrence_number,
            0.9::REAL as score,
            'prefix'::TEXT as mtype
        FROM words w
        WHERE
            search_type IN ('turkish', 'both') AND
            (w.word LIKE search_term || '%' OR
             w.word_normalized LIKE normalize_word(search_term) || '%')
            AND w.word != search_term

        UNION ALL

        -- Varyant eşleşme
        SELECT
            w.id, w.word, w.meaning, w.etymology_type, w.occurrence_number,
            0.85::REAL as score,
            'variant'::TEXT as mtype
        FROM words w
        INNER JOIN variants v ON v.word_id = w.id
        WHERE
            search_type IN ('turkish', 'both') AND
            (v.variant = search_term OR v.variant_normalized = normalize_word(search_term))

        UNION ALL

        -- Fuzzy eşleşme (trigram similarity)
        SELECT
            w.id, w.word, w.meaning, w.etymology_type, w.occurrence_number,
            similarity(w.word_normalized, normalize_word(search_term)) as score,
            'fuzzy'::TEXT as mtype
        FROM words w
        WHERE
            search_type IN ('turkish', 'both') AND
            similarity(w.word_normalized, normalize_word(search_term)) > fuzzy_threshold
            AND w.word != search_term
    ),
    english_matches AS (
        -- Full-text search (İngilizce anlam)
        SELECT
            w.id, w.word, w.meaning, w.etymology_type, w.occurrence_number,
            ts_rank(to_tsvector('english', w.meaning), query) as score,
            'fulltext'::TEXT as mtype
        FROM words w, to_tsquery('english', regexp_replace(search_term, '\s+', ' & ', 'g')) query
        WHERE
            search_type IN ('english', 'both') AND
            to_tsvector('english', w.meaning) @@ query

        UNION ALL

        -- Partial match (İngilizce)
        SELECT
            w.id, w.word, w.meaning, w.etymology_type, w.occurrence_number,
            0.7::REAL as score,
            'partial'::TEXT as mtype
        FROM words w
        WHERE
            search_type IN ('english', 'both') AND
            w.meaning ILIKE '%' || search_term || '%'
    )
    SELECT DISTINCT ON (tm.id)
        tm.id, tm.word, tm.meaning, tm.etymology_type, tm.occurrence_number,
        tm.score, tm.mtype
    FROM (
        SELECT * FROM turkish_matches
        UNION ALL
        SELECT * FROM english_matches
    ) tm
    ORDER BY tm.id, tm.score DESC, tm.mtype
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- İstatistik görünümü
CREATE OR REPLACE VIEW word_statistics AS
SELECT
    COUNT(DISTINCT word) as unique_words,
    COUNT(*) as total_entries,
    COUNT(DISTINCT etymology_type) as etymology_types,
    SUM(CASE WHEN occurrence_number > 1 THEN 1 ELSE 0 END) as repeated_words,
    (SELECT COUNT(*) FROM variants) as total_variants
FROM words;

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_words_updated_at
    BEFORE UPDATE ON words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Yorum ve açıklamalar
COMMENT ON TABLE words IS 'Clauson sözlüğündeki tüm kelime girişleri';
COMMENT ON TABLE variants IS 'Kelimelerin varyantları (örn: ap/ep, aba/apa)';
COMMENT ON COLUMN words.word_normalized IS 'Büyük/küçük harf duyarsız arama için normalize edilmiş kelime';
COMMENT ON COLUMN words.occurrence_number IS 'Aynı kelime için kaçıncı giriş (1 olug, 2 olug, etc.)';
COMMENT ON FUNCTION search_words IS 'Ana arama fonksiyonu - fuzzy matching ve full-text search destekli';
