import { useQuery } from '@tanstack/react-query'
import { getStatistics } from '../utils/api'

export default function StatisticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics,
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-maroon-600 border-t-transparent"></div>
        <p className="mt-4 text-ink-700 font-sans">Yükleniyor...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-sans">❌ Hata: {error.message}</p>
        </div>
      </div>
    )
  }

  const stats = data.statistics

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="heading-1 text-center mb-8">Sözlük İstatistikleri</h1>

      {/* Genel istatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="text-4xl font-bold text-maroon-600 mb-2">
            {stats.unique_words?.toLocaleString('tr-TR') || '0'}
          </div>
          <div className="text-ink-700 font-sans">Benzersiz Kelime</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-4xl font-bold text-maroon-600 mb-2">
            {stats.total_entries?.toLocaleString('tr-TR') || '0'}
          </div>
          <div className="text-ink-700 font-sans">Toplam Giriş</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-4xl font-bold text-maroon-600 mb-2">
            {stats.total_variants?.toLocaleString('tr-TR') || '0'}
          </div>
          <div className="text-ink-700 font-sans">Varyant</div>
        </div>

        <div className="card p-6 text-center">
          <div className="text-4xl font-bold text-maroon-600 mb-2">
            {stats.etymology_types || '0'}
          </div>
          <div className="text-ink-700 font-sans">Etimoloji Tipi</div>
        </div>
      </div>

      {/* Etimoloji tipi dağılımı */}
      <div className="card p-8 mb-8">
        <h2 className="heading-2 mb-6">Etimoloji Tipi Dağılımı</h2>
        <div className="space-y-4">
          {stats.etymology_distribution?.map((etym, index) => {
            const percentage = (etym.count / stats.total_entries) * 100
            return (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="badge badge-default font-mono text-sm w-20 text-center">
                      {etym.etymology_type}
                    </span>
                    <span className="text-ink-900 font-sans">
                      {etym.count.toLocaleString('tr-TR')} giriş
                    </span>
                  </div>
                  <span className="text-ink-600 font-sans font-bold">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-parchment-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-maroon-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* En çok tekrarlanan kelimeler */}
      <div className="card p-8">
        <h2 className="heading-2 mb-6">En Çok Tekrarlanan Kelimeler</h2>
        <p className="text-ink-600 font-sans mb-4">
          Aynı kelime farklı anlamlarda kullanılıyorsa "olug" sistemiyle numaralandırılır.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.most_repeated?.map((word, index) => (
            <div
              key={index}
              className="bg-parchment-50 rounded-lg p-4 border border-parchment-200 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-center">
                <span className="text-xl font-mono text-maroon-600 font-bold">
                  {word.word}
                </span>
                <span className="text-2xl font-bold text-ink-900">
                  {word.max_occurrence}
                  <span className="text-sm text-ink-600 ml-1">olug</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bilgilendirme */}
      <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg font-sans">
        <h3 className="font-semibold text-blue-900 mb-2">📖 Etimoloji Tipi Açıklamaları:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Basic:</strong> Temel Türkçe kelimeler</li>
          <li><strong>D (Derived):</strong> Türemiş kelimeler</li>
          <li><strong>F (Foreign):</strong> Yabancı kökenli kelimeler</li>
          <li><strong>VU (Very Uncertain):</strong> Çok belirsiz kökenli</li>
          <li><strong>PU (Partly Uncertain):</strong> Kısmen belirsiz kökenli</li>
          <li><strong>E (Error):</strong> Hata / düzeltme</li>
          <li><strong>C (Compound):</strong> Bileşik kelimeler</li>
        </ul>
      </div>
    </div>
  )
}
