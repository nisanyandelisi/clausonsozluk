-- Clauson Sözlük - Basitleştirilmiş Schema (Production)

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

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
);

CREATE TABLE IF NOT EXISTS variants (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    variant TEXT NOT NULL,
    variant_normalized TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    word_text TEXT,
    error_types TEXT[],
    suggested_correction TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
CREATE INDEX IF NOT EXISTS idx_words_word_normalized ON words(word_normalized);
CREATE INDEX IF NOT EXISTS idx_words_etymology_type ON words(etymology_type);
CREATE INDEX IF NOT EXISTS idx_variants_word_id ON variants(word_id);
CREATE INDEX IF NOT EXISTS idx_variants_variant ON variants(variant);
CREATE INDEX IF NOT EXISTS idx_words_meaning_fts ON words USING GIN(to_tsvector('english', COALESCE(meaning, '')));
CREATE INDEX IF NOT EXISTS idx_words_word_fts ON words USING GIN(to_tsvector('simple', word));
CREATE INDEX IF NOT EXISTS idx_words_word_trgm ON words USING GIN(word_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_words_meaning_trgm ON words USING GIN(meaning gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_variants_variant_trgm ON variants USING GIN(variant_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_words_word_etym ON words(word, etymology_type);
CREATE INDEX IF NOT EXISTS idx_words_occurrence ON words(word, occurrence_number);

CREATE OR REPLACE FUNCTION normalize_word(word TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN TRANSLATE(
        LOWER(
            REGEXP_REPLACE(
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                    word,
                    'İ', 'i'), 'I', 'i'),
                    'Ş', 's'), 'ş', 's'),
                    'Ğ', 'g'), 'ğ', 'g'),
                    'Ü', 'u'), 'ü', 'u'),
                    'Ö', 'o'), 'ö', 'o'),
                    'Ç', 'c'), 'ç', 'c'),
                '^\d+\s*', '')
        ),
        'ıñŋḏḍéāīū',
        'innddeaiu'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_words_updated_at ON words;
CREATE TRIGGER update_words_updated_at
    BEFORE UPDATE ON words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
