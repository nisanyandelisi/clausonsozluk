export default function SearchFilters({ fuzzyThreshold, onFuzzyChange, etymologyFilter, onEtymologyChange }) {
  const etymologyTypes = [
    { value: '', label: 'Tümü' },
    { value: 'Basic', label: 'Basic' },
    { value: 'D', label: 'D (Derived)' },
    { value: 'F', label: 'F (Foreign)' },
    { value: 'VU', label: 'VU (Very Uncertain)' },
    { value: 'PU', label: 'PU (Partly Uncertain)' },
    { value: 'E', label: 'E (Error)' },
    { value: 'C', label: 'C (Compound)' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-md border border-parchment-300 p-6">
      <h3 className="text-lg font-semibold text-ink-900 mb-4">Filtreler</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fuzzy Matching Threshold */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-2 font-sans">
            Fuzzy Matching Hassasiyeti: <strong>{fuzzyThreshold.toFixed(2)}</strong>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={fuzzyThreshold}
            onChange={(e) => onFuzzyChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-parchment-200 rounded-lg appearance-none cursor-pointer accent-maroon-600"
          />
          <div className="flex justify-between text-xs text-ink-600 mt-1 font-sans">
            <span>Kesin (0.0)</span>
            <span>Esnek (1.0)</span>
          </div>
          <p className="text-xs text-ink-600 mt-2 font-sans">
            Düşük değer: Daha kesin eşleşme • Yüksek değer: Daha esnek eşleşme
          </p>
        </div>

        {/* Etimoloji Tipi */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-2 font-sans">
            Etimoloji Tipi
          </label>
          <select
            value={etymologyFilter}
            onChange={(e) => onEtymologyChange(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border-2 border-parchment-300 bg-white text-ink-900 font-sans focus:outline-none focus:border-maroon-600"
          >
            {etymologyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-600 mt-2 font-sans">
            Kelimeleri etimoloji tipine göre filtreleyin
          </p>
        </div>
      </div>

      {/* Filtre bilgisi */}
      {(fuzzyThreshold !== 0.3 || etymologyFilter) && (
        <div className="mt-4 pt-4 border-t border-parchment-200 flex items-center gap-2">
          <span className="text-sm text-ink-600 font-sans">Aktif filtreler:</span>
          {fuzzyThreshold !== 0.3 && (
            <span className="badge badge-default">
              Fuzzy: {fuzzyThreshold.toFixed(2)}
            </span>
          )}
          {etymologyFilter && (
            <span className="badge badge-default">
              Etimoloji: {etymologyFilter}
            </span>
          )}
          <button
            onClick={() => {
              onFuzzyChange(0.3)
              onEtymologyChange('')
            }}
            className="ml-auto text-sm text-maroon-600 hover:text-maroon-700 font-sans font-medium"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}
    </div>
  )
}
