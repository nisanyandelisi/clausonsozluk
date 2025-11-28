const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

/**
 * @route   GET /api/search
 * @desc    Ana arama endpoint'i
 * @query   q (string) - Arama terimi
 * @query   type (string) - 'turkish', 'english', 'both' (default: 'both')
 * @query   fuzzy (number) - Fuzzy matching threshold 0-1 (default: 0.3)
 * @query   limit (number) - Sonuç limiti (default: 50, max: 200)
 * @query   etymology (string) - Etimoloji tipine göre filtre (opsiyonel)
 */
router.get('/', searchController.search);

/**
 * @route   GET /api/search/autocomplete
 * @desc    Otomatik tamamlama
 * @query   q (string) - Arama terimi (min 2 karakter)
 * @query   limit (number) - Öneri limiti (default: 10, max: 50)
 */
router.get('/autocomplete', searchController.autocomplete);

/**
 * @route   GET /api/search/word/:id
 * @desc    Kelime detayı
 * @param   id - Kelime ID'si
 */
router.get('/word/:id', searchController.getWordDetail);

/**
 * @route   GET /api/search/statistics
 * @desc    Sözlük istatistikleri
 */
router.get('/statistics', searchController.getStatistics);

/**
 * @route   GET /api/search/etymologies
 * @desc    Mevcut etimoloji tiplerini listeler
 */
router.get('/etymologies', searchController.getEtymologies); // New endpoint

/**
 * @route   GET /api/search/random
 * @desc    Rastgele kelime
 */
router.get('/random', searchController.getRandomWord);

const adminController = require('../controllers/adminController');

/**
 * @route   PUT /api/search/admin/word/:id
 * @desc    Kelime güncelleme (Admin)
 * @body    passcode, word, meaning, etc.
 */
router.put('/admin/word/:id', adminController.updateWord);

module.exports = router;
