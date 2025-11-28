import React, { useState, useEffect } from 'react';
import api from './utils/api';

// Normalizasyon fonksiyonu
const normalizeWord = (word) => {
  if (!word) return '';
  let normalized = word.replace(/^\d+\s*/, '');
  normalized = normalized.replace(/[:\-*?'()\[\]\/.,;]/g, '');

  const replacements = {
    'İ': 'i', 'I': 'ı',
    'ñ': 'n', 'ŋ': 'n',
    'ḏ': 'd', 'ḍ': 'd',
    'é': 'e',
    'ā': 'a', 'ī': 'i', 'ū': 'u',
    ' ': ''
  };

  normalized = normalized.toLowerCase();
  for (const [oldChar, newChar] of Object.entries(replacements)) {
    normalized = normalized.replaceAll(oldChar.toLowerCase(), newChar);
  }
  return normalized;
};

const ALPHABET = ['Hepsi', 'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'];

// Etimoloji Tipleri artık API'den çekiliyor

// Etimoloji Gösterim Haritası - ARTIK KULLANILMIYOR (Ham veri gösterilecek)
// const ETYMOLOGY_LABELS = {
//   'Chinese': 'Chinese',
//   'Foreign Loan Word': 'Foreign Loan Word',
//   'Derived': 'Derived',
//   'Basic': 'Basic',
//   'Verbum Unicum': 'Verbum Unicum',
//   'See': 'See',
//   'Error': 'Error',
//   'Problematical/Uncertain': 'Problematical/Uncertain',
//   'Mongolian': 'Mongolian'
// };

const formatEtymology = (type) => {
  return type; // Direkt ham veriyi döndür (Örn: Chinese, Derived)
};

function App() {
  // Data state is now results only, not full load
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('word'); // 'word' or 'meaning'
  const [searchType, setSearchType] = useState('both'); // 'both', 'turkish', 'english'
  const [selectedLetter, setSelectedLetter] = useState(''); // Default empty, no 'Hepsi'
  const [selectedWord, setSelectedWord] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Edit Form State
  const [editForm, setEditForm] = useState({});
  const [passcode, setPasscode] = useState('');
  const [editMessage, setEditMessage] = useState('');

  // Filtreler
  const [searchMode, setSearchMode] = useState('contains');
  const [etymologyFilter, setEtymologyFilter] = useState('all');
  const [etymologyTypes, setEtymologyTypes] = useState([]); // Dynamic list

  // Fetch Etymology Types and Stats on Mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const etymRes = await api.get('/api/search/etymologies');
        if (etymRes.success) setEtymologyTypes(etymRes.data);

      } catch (err) {
        console.error("Veri yüklenemedi:", err);
      }
    };
    fetchInitialData();
  }, []);

  // API'den Arama Yap
  const performSearch = async (page = 1) => {
    setLoading(true);
    try {
      // Mobil cihazlarda 10, desktop'ta 15 sonuç
      const isMobile = window.innerWidth < 768;
      const limitPerPage = isMobile ? 10 : 15;

      let params = {
        q: searchTerm,
        type: searchType, // Changed from 'both' to searchType
        searchIn: searchScope,
        searchMode: searchMode,
        limit: limitPerPage,
        page: page,
        etymology: etymologyFilter !== 'all' ? etymologyFilter : undefined
      };

      // Harf seçimi varsa ve arama yoksa
      if (!searchTerm && selectedLetter && selectedLetter !== 'Hepsi') {
        params.q = selectedLetter;
        params.searchMode = 'startsWith';
        params.letterMode = true;
      }
      // Hepsi seçiliyse params.q boş kalır, backend hepsini getirir (paginated)

      const res = await api.get('/api/search', { params });
      setResults(res.results || []);
      setTotalPages(res.total_pages || 1);
      setTotalResults(res.total || 0);
      setCurrentPage(page);
    } catch (err) {
      console.error("Arama hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search ONLY when filters change or letter is selected
  useEffect(() => {
    if (selectedLetter) {
      performSearch(1); // Reset to page 1 on filter change
    }
  }, [selectedLetter]);

  // Search when filters change (but not on every keystroke)
  useEffect(() => {
    // Only if we have a search term or a letter selected
    if (searchTerm || selectedLetter) {
      performSearch(1);
    }
  }, [searchScope, etymologyFilter, searchMode]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      performSearch(1);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setSelectedWord(null);
    if (e.target.value) setSelectedLetter(''); // Clear letter if typing
  };

  const handleLetterClick = (letter) => {
    setSelectedLetter(letter);
    setSearchTerm('');
    setSelectedWord(null);
    // performSearch called by useEffect
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      performSearch(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Report State
  const [isReportMode, setIsReportMode] = useState(false);
  const [reportForm, setReportForm] = useState({
    error_types: [],
    suggested_correction: '',
    description: ''
  });
  const [reportMessage, setReportMessage] = useState('');

  // Admin Report State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminReports, setAdminReports] = useState([]);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminFilter, setAdminFilter] = useState('all'); // 'all', 'pending', 'reviewed', 'corrected'

  // Helper for normalization
  const normalizeWord = (text) => {
    if (!text) return '';
    return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  };

  // Admin paneli açıldığında raporları otomatik çek
  useEffect(() => {
    if (showAdminPanel && adminPasscode) {
      fetchAdminReports();
    }
  }, [showAdminPanel, adminPasscode]);

  // Edit İşlemleri
  const handleEditClick = (word) => {
    setEditForm({ ...word });
    setPasscode('');
    setEditMessage('');
    setIsEditMode(true);
    setIsReportMode(false);
  };

  const handleReportClick = () => {
    setReportForm({
      error_types: [],
      suggested_correction: '',
      description: ''
    });
    setReportMessage('');
    setIsReportMode(true);
    setIsEditMode(false);
  };

  const handleReportSubmit = async () => {
    try {
      if (reportForm.error_types.length === 0) {
        setReportMessage('❌ Lütfen en az bir hata türü seçiniz.');
        return;
      }

      const res = await api.post('/api/reports', {
        word_id: selectedWord.id,
        word_text: selectedWord.word,
        ...reportForm
      });

      if (res.success) {
        setReportMessage('✅ Raporunuz başarıyla gönderildi. Teşekkür ederiz!');
        setTimeout(() => {
          setIsReportMode(false);
          setReportMessage('');
        }, 2000);
      }
    } catch (err) {
      console.error('Rapor hatası:', err);
      setReportMessage('❌ Rapor gönderilemedi: ' + (err.response?.data?.error || err.message));
    }
  };

  // Hızlı Rapor: "Bu Entry'de Hata Var"
  const handleQuickReport = async () => {
    try {
      const res = await api.post('/api/reports', {
        word_id: selectedWord.id,
        word_text: selectedWord.word,
        error_types: ['Entry Hatası'],
        suggested_correction: '',
        description: 'Hızlı rapor: Bu entry\'de hata var'
      });

      if (res.success) {
        setReportMessage('✅ Hızlı rapor gönderildi!');
        setTimeout(() => setReportMessage(''), 2000);
      }
    } catch (err) {
      console.error('Hızlı rapor hatası:', err);
      setReportMessage('❌ Rapor gönderilemedi');
    }
  };

  const fetchAdminReports = async () => {
    try {
      const res = await api.get('/api/reports/admin', {
        headers: { 'x-admin-passcode': adminPasscode }
      });
      if (res.success) {
        setAdminReports(res.data);
      }
    } catch (err) {
      alert('Erişim reddedildi veya hata oluştu.');
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await api.put(`/api/search/admin/word/${editForm.id}`, {
        ...editForm,
        word_normalized: normalizeWord(editForm.word) // Normalizasyonu güncelle
      }, {
        headers: { 'x-admin-passcode': passcode }
      });

      if (res.success) {
        setEditMessage('✅ Başarıyla güncellendi!');

        // Listeyi güncelle
        setResults(prev => prev.map(item => item.id === editForm.id ? { ...item, ...editForm } : item));

        // Seçili kelimeyi güncelle
        setSelectedWord({ ...selectedWord, ...editForm });

        // Admin rapor listesini de yenile (eğer açıksa)
        if (showAdminPanel) fetchAdminReports();

        setTimeout(() => setIsEditMode(false), 1500);
      }
    } catch (err) {
      console.error('Update Error:', err);
      setEditMessage('❌ Hata: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEditFromReport = async (report) => {
    try {
      // Kelimeyi word_id'den çek
      const res = await api.get(`/api/search/word/${report.word_id}`);
      if (res.success) {
        setEditForm(res.data);
        setSelectedReport(report);
        setEditMessage('');
      }
    } catch (err) {
      console.error('Kelime yükleme hatası:', err);
      setAdminMessage('❌ Kelime yüklenemedi');
    }
  };

  const handleUpdateFromReport = async () => {
    try {
      const res = await api.put(`/api/search/admin/word/${editForm.id}`, {
        ...editForm,
        word_normalized: normalizeWord(editForm.word)
      }, {
        headers: { 'x-admin-passcode': passcode }
      });

      if (res.success) {
        setEditMessage('✅ Başarıyla güncellendi!');

        // Rapor durumunu 'reviewed' yap
        await api.put(`/api/reports/admin/${selectedReport.id}`, {
          status: 'reviewed'
        }, {
          headers: { 'x-admin-passcode': passcode }
        });

        // Raporları yenile
        fetchAdminReports();

        setTimeout(() => {
          setSelectedReport(null);
          setEditForm({});
          setEditMessage('');
        }, 1500);
      }
    } catch (err) {
      console.error('Update Error:', err);
      setEditMessage('❌ Hata: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Bu raporu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await api.delete(`/api/reports/admin/${reportId}`, {
        headers: { 'x-admin-passcode': adminPasscode }
      });

      setAdminMessage('✅ Rapor silindi');
      fetchAdminReports();

      setTimeout(() => setAdminMessage(''), 2000);
    } catch (err) {
      console.error('Delete Report Error:', err);
      setAdminMessage('❌ Hata: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-parchment-50 text-ink-900">
      <div className="text-2xl font-serif animate-pulse">Sözlük Yükleniyor...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-parchment-50 text-ink-900 font-serif selection:bg-maroon-500 selection:text-white pb-20">

      {/* Header Area */}
      <header className="bg-parchment-100 border-b border-parchment-300 md:sticky md:top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-center text-maroon-800 mb-1 tracking-tight">
            Clauson
          </h1>
          <p className="text-center text-ink-600 italic mb-4 text-sm">Türk Etimoloji Sözlüğü</p>

          {/* Search & Filters Container */}
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                className="w-full pl-12 pr-12 py-3 rounded-lg bg-white border-2 border-parchment-300 focus:border-maroon-500 focus:ring-0 outline-none transition-all text-lg placeholder-ink-400 font-sans shadow-inner"
                placeholder={searchScope === 'meaning' ? "Anlam ara (örn: wash, root)..." : "Kelime ara (örn: ağ, ötenç)..."}
                value={searchTerm}
                onChange={handleSearch}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={performSearch}
                className="absolute left-2 top-2 p-1.5 text-ink-400 hover:text-maroon-600 transition-colors rounded-full hover:bg-parchment-100"
                title="Ara"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setResults([]); }}
                  className="absolute right-3 top-3.5 text-ink-400 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Advanced Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Scope Toggle */}
              <div className="flex bg-white rounded-md border border-parchment-300 overflow-hidden">
                <button
                  onClick={() => setSearchScope('word')}
                  className={`flex-1 px-4 py-2 text-sm font-sans font-medium transition-colors ${searchScope === 'word' ? 'bg-maroon-600 text-white' : 'text-ink-600 hover:bg-parchment-100'}`}
                >
                  Kelime
                </button>
                <button
                  onClick={() => setSearchScope('meaning')}
                  className={`flex-1 px-4 py-2 text-sm font-sans font-medium transition-colors ${searchScope === 'meaning' ? 'bg-maroon-600 text-white' : 'text-ink-600 hover:bg-parchment-100'}`}
                >
                  Anlam
                </button>
              </div>

              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-parchment-300 bg-white text-ink-700 font-sans text-sm focus:border-maroon-500 outline-none"
              >
                <option value="contains">İçinde Geçen</option>
                <option value="startsWith">İle Başlayan</option>
                <option value="endsWith">İle Biten</option>
                <option value="exact">Tam Eşleşme (Normalize)</option>
                <option value="startsWithExact">İle Başlayan (Orijinal)</option>
                <option value="endsWithExact">İle Biten (Orijinal)</option>
              </select>

              <select
                value={etymologyFilter}
                onChange={(e) => setEtymologyFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-parchment-300 bg-white text-ink-700 font-sans text-sm focus:border-maroon-500 outline-none"
              >
                <option value="all">Tüm Etimolojiler</option>
                {etymologyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* A-Z Bar & Random */}
        <div className="border-t border-parchment-200 bg-parchment-50/90 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Mobile Dropdown */}
              <div className="w-full md:hidden">
                <select
                  value={selectedLetter}
                  onChange={(e) => handleLetterClick(e.target.value)}
                  className="w-full p-3 rounded-lg border border-parchment-300 bg-white text-ink-700 font-sans shadow-sm"
                >
                  {ALPHABET.map(letter => (
                    <option key={letter} value={letter}>{letter}</option>
                  ))}
                </select>
              </div>
              {/* Desktop Buttons */}
              <div className="hidden md:flex flex-wrap justify-center gap-2 flex-1">
                {ALPHABET.map(letter => (
                  <button
                    key={letter}
                    onClick={() => handleLetterClick(letter)}
                    className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all font-sans min-w-[2.5rem]
                      ${selectedLetter === letter && !searchTerm
                        ? 'bg-maroon-600 text-white shadow-md transform scale-105'
                        : 'text-ink-700 hover:bg-parchment-200 hover:text-maroon-700 bg-white/50 border border-transparent hover:border-parchment-300'
                      }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              {/* Random Button */}
              <button
                onClick={async () => {
                  const res = await api.get('/api/search/random');
                  if (res.success) setSelectedWord(res.data);
                }}
                className="w-full md:w-auto px-6 py-2 bg-ink-800 text-parchment-50 rounded-lg hover:bg-ink-700 transition-colors font-sans font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
              >
                <span>🎲</span>
                <span>Rastgele</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Detail View (Inline - Replaces List) */}
        {selectedWord ? (
          <div className="bg-parchment-50 rounded-xl shadow-lg border border-parchment-300 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Report Mode */}
            {isReportMode ? (
              <div className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-maroon-800 flex items-center gap-2">
                      🚩 Hata Raporla: {selectedWord.word}
                    </h2>
                    <p className="text-sm text-ink-500 mt-1">
                      Bu kelime ile ilgili hatalı olduğunu düşündüğünüz kısımları lütfen belirtiniz.
                    </p>
                  </div>
                  <button
                    onClick={handleQuickReport}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 shadow-sm whitespace-nowrap"
                  >
                    ⚡ Hızlı Rapor
                  </button>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                  💡 Detay vermek istemiyorsanız "Hızlı Rapor" butonuna tıklayın
                </p>

                {/* Current Data Summary */}
                <div className="bg-parchment-100 p-4 rounded-lg border border-parchment-200 text-sm space-y-2 max-h-60 overflow-y-auto">
                  <h3 className="font-bold text-maroon-700 border-b border-parchment-300 pb-1 mb-2">Mevcut Veriler</h3>
                  <div><strong className="text-ink-600">Kelime:</strong> {selectedWord.word}</div>
                  <div><strong className="text-ink-600">Etimoloji:</strong> {selectedWord.etymology_type}</div>
                  <div><strong className="text-ink-600">Anlam:</strong> {selectedWord.meaning}</div>
                  {selectedWord.variants && selectedWord.variants.length > 0 && (
                    <div><strong className="text-ink-600">Varyantlar:</strong> {selectedWord.variants.join(', ')}</div>
                  )}
                  {selectedWord.full_entry_text && (
                    <div>
                      <strong className="text-ink-600">Full Entry:</strong>
                      <p className="mt-1 text-xs text-ink-500 font-serif whitespace-pre-wrap pl-2 border-l-2 border-parchment-300">
                        {selectedWord.full_entry_text.substring(0, 300)}...
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-ink-600">Hata Türü (Birden fazla seçebilirsiniz)</label>
                  <div className="flex flex-wrap gap-3">
                    {['Kelime Yazımı', 'Anlam', 'Etimoloji', 'Varyantlar', 'Orijinal Metin', 'Diğer'].map(type => (
                      <label key={type} className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-parchment-300 cursor-pointer hover:bg-parchment-50">
                        <input
                          type="checkbox"
                          className="rounded text-maroon-600 focus:ring-maroon-500"
                          checked={reportForm.error_types.includes(type)}
                          onChange={e => {
                            if (e.target.checked) {
                              setReportForm({ ...reportForm, error_types: [...reportForm.error_types, type] });
                            } else {
                              setReportForm({ ...reportForm, error_types: reportForm.error_types.filter(t => t !== type) });
                            }
                          }}
                        />
                        <span className="text-sm font-sans">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-ink-600 mb-1">Önerilen Düzeltme (Opsiyonel)</label>
                  <textarea
                    className="w-full p-2 border rounded h-20 font-sans text-sm"
                    placeholder="Doğrusu ne olmalı?"
                    value={reportForm.suggested_correction}
                    onChange={e => setReportForm({ ...reportForm, suggested_correction: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-ink-600 mb-1">Açıklama (Opsiyonel)</label>
                  <textarea
                    className="w-full p-2 border rounded h-24 font-sans text-sm"
                    placeholder="Hata hakkında ek bilgi..."
                    value={reportForm.description}
                    onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                  />
                </div>

                {reportMessage && (
                  <div className={`p-3 rounded text-center font-bold ${reportMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {reportMessage}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2 border-t border-parchment-200">
                  <button onClick={() => setIsReportMode(false)} className="px-4 py-2 text-ink-600 hover:bg-gray-100 rounded">İptal</button>
                  <button onClick={handleReportSubmit} className="px-4 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700 shadow-sm">Gönder</button>
                </div>
              </div>
            ) : isEditMode ? (
              <div className="p-6 space-y-4">
                <h2 className="text-2xl font-bold text-maroon-800">Düzenle: {editForm.word}</h2>
                {/* ... existing edit form content ... */}
                <div>
                  <label className="block text-sm font-bold text-ink-600 mb-1">Kelime</label>
                  <input
                    className="w-full p-2 border rounded"
                    value={editForm.word}
                    onChange={e => setEditForm({ ...editForm, word: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink-600 mb-1">Anlam</label>
                  <textarea
                    className="w-full p-2 border rounded h-24"
                    value={editForm.meaning}
                    onChange={e => setEditForm({ ...editForm, meaning: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink-600 mb-1">Tam Metin</label>
                  <textarea
                    className="w-full p-2 border rounded h-32 font-serif"
                    value={editForm.full_entry_text}
                    onChange={e => setEditForm({ ...editForm, full_entry_text: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink-600 mb-1">Etimoloji Tipi</label>
                  <select
                    className="w-full p-2 border rounded bg-white"
                    value={editForm.etymology_type}
                    onChange={e => setEditForm({ ...editForm, etymology_type: e.target.value })}
                  >
                    <option value="">Seçiniz...</option>
                    {etymologyTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink-600 mb-1">Varyantlar (Virgülle ayırın)</label>
                  <input
                    className="w-full p-2 border rounded"
                    placeholder="Örn: ep, eb"
                    value={editForm.variants ? (Array.isArray(editForm.variants) ? editForm.variants.join(', ') : editForm.variants) : ''}
                    onChange={e => setEditForm({ ...editForm, variants: e.target.value.split(',').map(v => v.trim()) })}
                  />
                </div>

                <div className="pt-4 border-t border-parchment-300">
                  <label className="block text-sm font-bold text-red-600 mb-1">Yetki Kodu (Zorunlu)</label>
                  <input
                    type="password"
                    className="w-full p-2 border-2 border-red-200 rounded focus:border-red-500 outline-none"
                    placeholder="Kodu giriniz..."
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                  />
                </div>

                {editMessage && <div className="p-2 bg-gray-100 rounded text-center font-bold">{editMessage}</div>}

                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setIsEditMode(false)} className="px-4 py-2 text-ink-600 hover:bg-gray-100 rounded">İptal</button>
                  <button onClick={handleUpdate} className="px-4 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700">Kaydet</button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <>
                <div className="bg-parchment-100 border-b border-parchment-200 p-6 flex justify-between items-center rounded-t-xl">
                  <div>
                    <h2 className="text-4xl font-bold text-maroon-800">{selectedWord.word}</h2>
                    <span className="text-sm font-sans text-ink-500 mt-1 block">
                      {formatEtymology(selectedWord.etymology_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReportClick}
                      className="p-2 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-full transition-colors"
                      title="Hata Raporla"
                    >
                      🚩
                    </button>
                    <button
                      onClick={() => handleEditClick(selectedWord)}
                      className="p-2 hover:bg-parchment-200 rounded-full text-ink-500 transition-colors"
                      title="Düzenle"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setSelectedWord(null)}
                      className="px-4 py-2 bg-white border border-parchment-300 rounded-lg text-ink-600 hover:bg-parchment-50 font-sans text-sm font-medium shadow-sm transition-all"
                    >
                      ← Listeye Dön
                    </button>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                  <div>
                    <h3 className="text-xs font-bold text-maroon-600 uppercase tracking-widest mb-3 font-sans border-b border-parchment-200 pb-1">Anlam</h3>
                    <p className="text-xl text-ink-900 leading-relaxed font-serif">{selectedWord.meaning}</p>
                  </div>

                  {selectedWord.full_entry_text && (
                    <div className="bg-white p-6 rounded-lg border border-parchment-200 shadow-inner">
                      <h3 className="text-xs font-bold text-maroon-600 uppercase tracking-widest mb-3 font-sans border-b border-parchment-100 pb-1">Full Entry</h3>
                      <p className="text-ink-800 whitespace-pre-wrap leading-relaxed font-serif text-xl">
                        {selectedWord.full_entry_text}
                      </p>
                    </div>
                  )}

                  {selectedWord.variants && selectedWord.variants.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-maroon-600 uppercase tracking-widest mb-3 font-sans border-b border-parchment-200 pb-1">Varyantlar</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedWord.variants.map((v, i) => (
                          <span key={i} className="px-3 py-1 bg-parchment-200 text-ink-800 rounded-full text-sm font-sans border border-parchment-300">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Results List */
          <div className="space-y-4">
            {/* Results Info */}
            {/* Results Info - Only show if searching or results exist */}
            {(searchTerm || selectedLetter || results.length > 0) && (
              <div className="text-sm text-ink-500 font-sans flex justify-between items-center px-1">
                <span>Found <strong>{totalResults}</strong> results.</span>
              </div>
            )}

            {results.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedWord(item);
                      setIsReportMode(false);
                      setIsEditMode(false);
                      setReportMessage('');
                      setEditMessage('');
                    }}
                    className="bg-white p-4 sm:p-5 rounded-lg border border-parchment-200 shadow-sm hover:shadow-md hover:border-maroon-300 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="text-lg sm:text-xl font-bold text-maroon-700 group-hover:text-maroon-900">{item.word}</h3>
                      <span className="text-xs font-sans text-ink-400 bg-parchment-100 px-2 py-1 rounded whitespace-nowrap ml-2">
                        {formatEtymology(item.etymology_type)}
                      </span>
                    </div>
                    <p className="text-ink-600 line-clamp-2 text-sm sm:text-base">{item.meaning}</p>
                  </div>
                ))}
              </div>
            ) : (
              !searchTerm && !selectedLetter ? (
                /* Welcome Screen */
                <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-700">
                  <div className="w-16 h-1 bg-maroon-800 mb-6 opacity-20"></div>
                  <p className="text-xl sm:text-2xl font-serif italic text-ink-500 tracking-wide">
                    AristokIes yaptı. <br></br>
                  </p>
                  <div className="w-16 h-1 bg-maroon-800 mt-6 opacity-20"></div>
                  <p className="text-ink-500 font-sans text-sm mt-2"> <br></br>
                    Hatalar olabilir, ilgili hataları belirtmek için hatalı kelimelerdeki rapor sekmesini kullanınız.
                  </p>
                </div>
              ) : (
                /* No Results */
                <div className="text-center py-20 bg-white/50 rounded-xl border border-parchment-200 border-dashed">
                  <div className="text-6xl mb-4 opacity-50">📜</div>
                  <h3 className="text-2xl font-bold text-ink-400">No Results</h3>
                  <p className="text-ink-400 mt-2">Try searching for something else.</p>
                </div>
              )
            )}
            {/* Pagination Controls */}
            {results.length > 0 && (
              <div className="flex justify-center items-center gap-4 mt-6 py-4 border-t border-parchment-200">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-md bg-white border border-parchment-300 text-ink-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-parchment-100 transition-colors"
                >
                  ← Önceki
                </button>

                <span className="text-sm font-sans text-ink-500">
                  Sayfa <span className="font-bold text-maroon-800">{currentPage}</span> / {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-md bg-white border border-parchment-300 text-ink-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-parchment-100 transition-colors"
                >
                  Sonraki →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-maroon-800">Admin Paneli</h3>
              <button onClick={() => setShowAdminPanel(false)} className="text-ink-600 hover:text-ink-900 text-2xl">
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-6">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-semibold text-ink-700 mb-1">Admin Passcode</label>
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={(e) => {
                      setAdminPasscode(e.target.value);
                      setPasscode(e.target.value);
                    }}
                    className="w-full p-2 border rounded"
                    placeholder="Yalnızca admin için"
                  />
                </div>
                <button
                  onClick={fetchAdminReports}
                  className="px-4 py-2 bg-maroon-600 text-white rounded shadow hover:bg-maroon-700"
                >
                  Raporları Getir
                </button>
              </div>

              {adminMessage && (
                <div className="mb-4 p-3 rounded bg-parchment-100 border border-parchment-300 text-ink-700 font-semibold">
                  {adminMessage}
                </div>
              )}

              {/* Rapor Listesi */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-ink-700">Gelen Raporlar ({adminReports.length})</h4>
                  <button onClick={fetchAdminReports} className="text-sm text-blue-600 hover:underline">Yenile</button>
                </div>

                {/* Filtre Sekmeleri */}
                {adminReports.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setAdminFilter('all')}
                      className={`px-4 py-2 text-sm rounded ${adminFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      Tümü ({adminReports.length})
                    </button>
                    <button
                      onClick={() => setAdminFilter('pending')}
                      className={`px-4 py-2 text-sm rounded ${adminFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      Bekleyen ({adminReports.filter(r => r.status === 'pending').length})
                    </button>
                    <button
                      onClick={() => setAdminFilter('reviewed')}
                      className={`px-4 py-2 text-sm rounded ${adminFilter === 'reviewed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      İncelenen ({adminReports.filter(r => r.status === 'reviewed').length})
                    </button>
                    <button
                      onClick={() => setAdminFilter('corrected')}
                      className={`px-4 py-2 text-sm rounded ${adminFilter === 'corrected' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      Düzeltilmiş ({adminReports.filter(r => r.is_word_corrected).length})
                    </button>
                  </div>
                )}

                {!adminReports.length ? (
                  <div className="flex justify-center items-center h-20 bg-gray-50 rounded">
                    <p className="text-gray-500">Rapor yükleniyor...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96 border rounded">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-100 text-gray-700 sticky top-0">
                        <tr>
                          <th className="p-3 border-b">Tarih</th>
                          <th className="p-3 border-b">Kelime</th>
                          <th className="p-3 border-b">Hata Türü</th>
                          <th className="p-3 border-b">Öneri</th>
                          <th className="p-3 border-b">Açıklama</th>
                          <th className="p-3 border-b">Durum</th>
                          <th className="p-3 border-b">İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminReports
                          .filter(r => {
                            if (adminFilter === 'all') return true;
                            if (adminFilter === 'pending') return r.status === 'pending';
                            if (adminFilter === 'reviewed') return r.status === 'reviewed';
                            if (adminFilter === 'corrected') return r.is_word_corrected;
                            return true;
                          })
                          .map(report => (
                            <tr key={report.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(report.created_at).toLocaleDateString()}</td>
                              <td className="p-3 font-bold text-maroon-700">{report.word_text}</td>
                              <td className="p-3 text-xs">{report.error_types.join(', ')}</td>
                              <td className="p-3 text-blue-600 font-mono text-xs">{report.suggested_correction || '-'}</td>
                              <td className="p-3 text-gray-600 max-w-xs truncate" title={report.description}>{report.description || '-'}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                  {report.status}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditFromReport(report)}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReport(report.id)}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                  >
                                    Sil
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Kelime Düzenleme Formu (Rapor Seçildiğinde) */}
              {selectedReport && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-lg font-semibold text-ink-700 mb-4">
                    Kelime Düzenle: <span className="text-maroon-600">{selectedReport.word_text}</span>
                  </h4>

                  {/* Rapor Detayları */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                    <h5 className="font-bold text-sm mb-2">📋 Rapor Detayı:</h5>
                    <p className="text-sm"><strong>Hata Türü:</strong> {selectedReport.error_types.join(', ')}</p>
                    <p className="text-sm"><strong>Önerilen Düzeltme:</strong> {selectedReport.suggested_correction || '-'}</p>
                    <p className="text-sm"><strong>Açıklama:</strong> {selectedReport.description || '-'}</p>
                  </div>

                  {/* Düzenleme Formu */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-ink-600 mb-1">Kelime</label>
                      <input
                        className="w-full p-2 border rounded"
                        value={editForm.word || ''}
                        onChange={e => setEditForm({ ...editForm, word: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink-600 mb-1">Anlam (İngilizce)</label>
                      <textarea
                        className="w-full p-2 border rounded h-24"
                        value={editForm.meaning || ''}
                        onChange={e => setEditForm({ ...editForm, meaning: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink-600 mb-1">Tam Giriş Metni</label>
                      <textarea
                        className="w-full p-2 border rounded h-32 font-serif text-sm"
                        value={editForm.full_entry_text || ''}
                        onChange={e => setEditForm({ ...editForm, full_entry_text: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink-600 mb-1">Etimoloji Tipi</label>
                      <select
                        className="w-full p-2 border rounded bg-white"
                        value={editForm.etymology_type || ''}
                        onChange={e => setEditForm({ ...editForm, etymology_type: e.target.value })}
                      >
                        <option value="">Seçiniz...</option>
                        {etymologyTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-ink-600 mb-1">Çapraz Referans</label>
                      <input
                        className="w-full p-2 border rounded"
                        value={editForm.cross_reference || ''}
                        onChange={e => setEditForm({ ...editForm, cross_reference: e.target.value })}
                        placeholder="Örn: ol, 1 ap"
                      />
                    </div>
                    <div className="pt-4 border-t">
                      <label className="block text-sm font-bold text-red-600 mb-1">Yetki Kodu (Zorunlu)</label>
                      <input
                        type="password"
                        className="w-full p-2 border-2 border-red-200 rounded"
                        placeholder="Kodu giriniz..."
                        value={passcode}
                        onChange={e => setPasscode(e.target.value)}
                      />
                    </div>
                    {editMessage && <div className="p-2 bg-gray-100 rounded text-center font-bold">{editMessage}</div>}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setSelectedReport(null)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        İptal
                      </button>
                      <button
                        onClick={handleUpdateFromReport}
                        className="px-4 py-2 bg-maroon-600 text-white rounded hover:bg-maroon-700"
                      >
                        Güncelle
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ fontSize: '14px' }} className="py-6 text-center text-ink-300 border-t border-parchment-200 mt-auto">
        <p>&copy; 2025 aristokies clauson sözlük. bazı hakları saklıdır bazıları değil.</p>
        <button
          onClick={() => setShowAdminPanel(true)}
          className="mt-4 px-6 py-3 bg-maroon-600 text-white text-base font-semibold rounded-lg hover:bg-maroon-700 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          🔐 Admin Girişi
        </button>
      </footer>
    </div>
  );
}

export default App;
