export default function SearchResults({ results, onWordClick, searchTerm }) {
  // Etimoloji tipine göre badge class
  const getEtymologyBadgeClass = (type) => {
    const map = {
      'Basic': 'badge-basic',
      'D': 'badge-d',
      'F': 'badge-f',
      'VU': 'badge-vu',
      'PU': 'badge-default',
      'E': 'badge-default',
      'C': 'badge-default',
    }
    return map[type] || 'badge-default'
  }

  // Match tipine göre ikon
  const getMatchTypeIcon = (type) => {
    const icons = {
      'exact': '🎯',
      'prefix': '🔗',
      'variant': '🔄',
      'fuzzy': '🔍',
      'fulltext': '📝',
      'partial': '✨',
    }
    return icons[type] || '•'
  }

  return (
    <div className="space-y-4">
      {/* Sonuç sayısı */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-ink-900">
          {results.length} sonuç bulundu
        </h2>
        <p className="text-sm text-ink-600 font-sans">
          "{searchTerm}" için
        </p>
      </div>

      {/* Sonuç listesi */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={`${result.id}-${index}`}
            className="card p-6 cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => onWordClick(result.id)}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Sol: Kelime bilgileri */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Kelime */}
                  <h3 className="text-2xl font-bold text-maroon-600 font-mono">
                    {result.word}
                  </h3>

                  {/* Occurrence number (1 olug, 2 olug) */}
                  {result.occurrence_number > 1 && (
                    <span className="text-xs bg-ink-700 text-white px-2 py-1 rounded font-mono">
                      {result.occurrence_number} olug
                    </span>
                  )}

                  {/* Etimoloji badge */}
                  <span className={`badge ${getEtymologyBadgeClass(result.etymology_type)}`}>
                    {result.etymology_type}
                  </span>

                  {/* Match type ikon */}
                  <span
                    className="text-sm"
                    title={`Match type: ${result.match_type}`}
                  >
                    {getMatchTypeIcon(result.match_type)}
                  </span>
                </div>

                {/* Varyantlar */}
                {result.variants?.length > 0 && (
                  <div className="mb-2 text-sm text-ink-600 font-sans">
                    <span className="font-semibold">Varyantlar:</span>{' '}
                    {result.variants.map((v, i) => (
                      <span key={i}>
                        <span className="font-mono text-ink-800">{v}</span>
                        {i < result.variants.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}

                {/* Anlam */}
                <p className="text-lg text-ink-900 leading-relaxed">
                  {result.meaning || <span className="text-ink-500 italic">Anlam belirtilmemiş</span>}
                </p>
              </div>

              {/* Sağ: Similarity score */}
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-xs text-ink-600 font-sans mb-1">Eşleşme</div>
                  <div className="text-2xl font-bold text-maroon-600 font-mono">
                    {(parseFloat(result.similarity_score) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Hover hint */}
            <div className="mt-4 pt-3 border-t border-parchment-200 text-sm text-ink-600 font-sans">
              Detaylar için tıklayın →
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
