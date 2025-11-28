const { pool } = require('../config/database');

const isProd = process.env.NODE_ENV === 'production';
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || (!isProd ? 'teneke' : null);

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

/**
 * Rapor oluştur
 */
exports.createReport = async (req, res) => {
    try {
        const { word_id, word_text, error_types, suggested_correction, description } = req.body;

        // Basit validasyon
        if (!word_id || !error_types || error_types.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Eksik bilgi: Kelime ID ve en az bir hata tipi seçilmelidir.'
            });
        }

        // XSS/Injection önlemi: Parameterized query zaten SQL injection'ı önler.
        // HTML taglerini temizlemek için basit bir regex (veya frontend'de yapılabilir, ama backend'de de iyi olur)
        const sanitize = (str) => str ? str.replace(/<[^>]*>?/gm, '') : '';

        const cleanSuggestion = sanitize(suggested_correction);
        const cleanDescription = sanitize(description);

        const result = await pool.query(
            `INSERT INTO reports (word_id, word_text, error_types, suggested_correction, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [word_id, word_text, error_types, cleanSuggestion, cleanDescription]
        );

        res.json({
            success: true,
            message: 'Rapor başarıyla oluşturuldu.',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Rapor oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Rapor oluşturulurken bir hata oluştu.'
        });
    }
};

/**
 * Raporları listele (Admin)
 */
exports.getReports = async (req, res) => {
    try {
        const auth = ensureAdmin(req);
        if (!auth.ok) {
            return res.status(auth.status).json({
                success: false,
                error: auth.message
            });
        }

        const result = await pool.query(`
      SELECT r.*,
             w.word as current_word_text,
             w.is_corrected as is_word_corrected
      FROM reports r
      LEFT JOIN words w ON r.word_id = w.id
      ORDER BY r.created_at DESC
    `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Rapor listeleme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Raporlar getirilemedi.'
        });
    }
};

/**
 * Rapor durumunu güncelle (Admin)
 */
exports.updateReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const auth = ensureAdmin(req);
        if (!auth.ok) {
            return res.status(auth.status).json({
                success: false,
                error: auth.message
            });
        }

        const result = await pool.query(
            'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Rapor güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Rapor güncellenemedi.'
        });
    }
};

/**
 * Rapor sil (Admin)
 */
exports.deleteReport = async (req, res) => {
    try {
        const { id } = req.params;
        const auth = ensureAdmin(req);
        if (!auth.ok) {
            return res.status(auth.status).json({
                success: false,
                error: auth.message
            });
        }

        await pool.query('DELETE FROM reports WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Rapor silindi'
        });

    } catch (error) {
        console.error('Rapor silme hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Rapor silinemedi.'
        });
    }
};
