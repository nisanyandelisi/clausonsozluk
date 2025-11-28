const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Rapor oluştur (Herkese açık)
router.post('/', reportController.createReport);

// Raporları listele (Admin - passcode query param ile)
router.get('/admin', reportController.getReports);

// Rapor durumunu güncelle (Admin)
router.put('/admin/:id', reportController.updateReportStatus);

// Rapor sil (Admin)
router.delete('/admin/:id', reportController.deleteReport);

module.exports = router;
