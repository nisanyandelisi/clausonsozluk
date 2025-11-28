const { pool } = require('../config/database');

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;

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
        word_normalized
    } = req.body;

    const auth = ensureAdmin(req);
    if (!auth.ok) {
        return res.status(auth.status).json({
            success: false,
            error: auth.message
        });
    }

    try {
        // Veritabanını Güncelle
        const query = `
      UPDATE words
      SET
        word = $1,
        meaning = $2,
        etymology_type = $3,
        full_entry_text = $4,
        word_normalized = $5,
        is_corrected = TRUE,
        corrected_at = NOW(),
        corrected_by = 'admin',
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

        const values = [
            word,
            meaning,
            etymology_type,
            full_entry_text,
            word_normalized,
            id
        ];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Kayıt bulunamadı.'
            });
        }

        res.json({
            success: true,
            message: 'Kayıt başarıyla güncellendi.',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Veritabanı güncellenirken bir hata oluştu.'
        });
    }
};
