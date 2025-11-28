const { pool } = require('../config/database');

const isProd = process.env.NODE_ENV === 'production';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || (!isProd ? 'teneke' : null);

const normalizeVariant = (text = '') => {
  let t = text.trim();
  t = t.replace(/^\d+\s*/, '');
  t = t.replace(/[:*?'()\[\]/.,;-]/g, '');
  const map = { 'İ': 'i', 'I': 'ı', 'Ğ': 'g', 'ğ': 'g', 'Ş': 's', 'ş': 's', 'Ö': 'o', 'ö': 'o', 'Ü': 'u', 'ü': 'u', 'Ç': 'c', 'ç': 'c', 'ı': 'i', 'ñ': 'n', 'ŋ': 'n', 'ḏ': 'd', 'ḍ': 'd', 'é': 'e', 'ā': 'a', 'ī': 'i', 'ū': 'u' };
  t = t.toLowerCase();
  Object.entries(map).forEach(([from, to]) => {
    t = t.split(from.toLowerCase()).join(to);
  });
  return t;
};

const ensureAdmin = (req) => {
  const provided = req.headers['x-admin-passcode'] || req.body.passcode;

  if (!ADMIN_PASSCODE) {
    return { ok: false, status: 503, message: 'Admin erişimi devre dışı (passcode tanımlı değil).' };
  }

  if (!provided || provided !== ADMIN_PASSCODE) {
    return { ok: false, status: 403, message: 'Yetkisiz erişim.' };
  }

  return { ok: true };
};

exports.updateWord = async (req, res) => {
    const { id } = req.params;
    const {
        word,
        meaning,
        etymology_type,
        full_entry_text,
        word_normalized,
        cross_reference,
        variants
    } = req.body;

    const auth = ensureAdmin(req);
    if (!auth.ok) {
        return res.status(auth.status).json({
            success: false,
            error: auth.message
        });
    }

    const variantList = Array.isArray(variants)
      ? variants
      : typeof variants === 'string'
        ? variants.split(',').map(v => v.trim())
        : [];

    const cleanedVariants = variantList
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => ({ variant: v, normalized: normalizeVariant(v) }));

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const query = `
      UPDATE words
      SET
        word = $1,
        meaning = $2,
        etymology_type = $3,
        full_entry_text = $4,
        word_normalized = $5,
        cross_reference = $6,
        is_corrected = TRUE,
        corrected_at = NOW(),
        corrected_by = 'admin',
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `;

        const values = [
            word,
            meaning,
            etymology_type,
            full_entry_text,
            word_normalized,
            cross_reference || null,
            id
        ];

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Kayıt bulunamadı.'
            });
        }

        // Varyantları güncelle (tam sil-yükle)
        await client.query('DELETE FROM variants WHERE word_id = $1', [id]);
        for (const v of cleanedVariants) {
          await client.query(
            'INSERT INTO variants (word_id, variant, variant_normalized) VALUES ($1, $2, $3)',
            [id, v.variant, v.normalized]
          );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Kayıt başarıyla güncellendi.',
            data: {
              ...result.rows[0],
              variants: cleanedVariants.map(v => v.variant)
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Veritabanı güncellenirken bir hata oluştu.'
        });
    } finally {
        client.release();
    }
};
