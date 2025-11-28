const { pool } = require('../config/database');

exports.updateWord = async (req, res) => {
    const { id } = req.params;
    const {
        passcode,
        word,
        meaning,
        etymology_type,
        full_entry_text,
        word_normalized
    } = req.body;

    // Güvenlik Kontrolü
    if (passcode !== 'teneke') {
        return res.status(403).json({
            success: false,
            error: 'Geçersiz yetki kodu.'
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
