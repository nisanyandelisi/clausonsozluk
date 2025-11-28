import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getWordDetail } from '../utils/api'

export default function WordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['word', id],
    queryFn: () => getWordDetail(id),
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-maroon-600 border-t-transparent"></div>
        <p className="mt-4 text-ink-700 font-sans">Yükleniyor...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-sans">❌ Hata: {error.message}</p>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary mt-4"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  const word = data.data

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Geri butonu */}
      <button
        onClick={() => navigate(-1)}
        className="btn btn-ghost mb-6"
      >
        ← Geri
      </button>

      {/* Kelime kartı */}
      <div className="card p-8 mb-6">
        {/* Başlık */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-4xl font-bold text-maroon-600 font-mono">
              {word.word}
            </h1>
            {word.occurrence_number > 1 && (
              <span className="text-lg bg-ink-700 text-white px-3 py-1 rounded font-mono">
                {word.occurrence_number} olug
              </span>
            )}
            <span className="badge badge-basic text-base">
              {word.etymology_type}
            </span>
          </div>

          {/* Varyantlar */}
          {word.variants?.length > 0 && (
            <div className="mb-3">
              <span className="text-ink-600 font-sans font-semibold">Varyantlar: </span>
              {word.variants.map((v, i) => (
                <span key={i} className="font-mono text-ink-900 text-lg">
                  {v}
                  {i < word.variants.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}

          {/* Anlam */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-ink-700 mb-2">Anlam:</h3>
            <p className="text-xl text-ink-900 leading-relaxed">
              {word.meaning || <span className="text-ink-500 italic">Anlam belirtilmemiş</span>}
            </p>
          </div>
        </div>

        <div className="divider"></div>

        {/* Tam giriş metni */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-ink-700 mb-3">Detaylı Açıklama:</h3>
          <div className="bg-parchment-50 rounded-lg p-6 border border-parchment-200">
            <p className="text-ink-900 leading-relaxed whitespace-pre-wrap font-serif">
              {word.full_entry_text || <span className="text-ink-500 italic">Detaylı açıklama bulunmamaktadır.</span>}
            </p>
          </div>
        </div>

        {/* Çapraz referans */}
        {word.cross_reference && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-ink-700 mb-2">Çapraz Referans:</h3>
            {word.cross_reference_detail ? (
              <Link
                to={`/word/${word.cross_reference_detail.id}`}
                className="inline-block px-4 py-2 bg-maroon-100 text-maroon-700 rounded-lg hover:bg-maroon-200 transition-colors font-mono"
              >
                → {word.cross_reference_detail.word}
                <span className="text-sm ml-2">({word.cross_reference_detail.meaning})</span>
              </Link>
            ) : (
              <span className="text-ink-700 font-mono">{word.cross_reference}</span>
            )}
          </div>
        )}

        {/* Diğer girişler (aynı kelime) */}
        {word.other_occurrences?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-ink-700 mb-3">
              Bu Kelimenin Diğer Anlamları:
            </h3>
            <div className="space-y-2">
              {word.other_occurrences.map((occ) => (
                <Link
                  key={occ.id}
                  to={`/word/${occ.id}`}
                  className="block p-4 bg-parchment-50 rounded-lg border border-parchment-200 hover:bg-parchment-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-ink-700 text-white px-2 py-1 rounded font-mono">
                      {occ.occurrence_number} olug
                    </span>
                    <span className="text-ink-900">{occ.meaning}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Meta bilgiler */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-ink-700 mb-3">Meta Bilgiler</h3>
        <div className="grid grid-cols-2 gap-4 text-sm font-sans">
          <div>
            <span className="text-ink-600">Kelime ID:</span>
            <span className="ml-2 font-mono text-ink-900">{word.id}</span>
          </div>
          <div>
            <span className="text-ink-600">Etimoloji Tipi:</span>
            <span className="ml-2 font-mono text-ink-900">{word.etymology_type}</span>
          </div>
          {word.created_at && (
            <div>
              <span className="text-ink-600">Eklenme Tarihi:</span>
              <span className="ml-2 font-mono text-ink-900">
                {new Date(word.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
