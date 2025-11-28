import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { searchWords } from '../utils/api'
import SearchBar from '../components/SearchBar'
import SearchResults from '../components/SearchResults'
import SearchFilters from '../components/SearchFilters'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'both')
  const [fuzzyThreshold, setFuzzyThreshold] = useState(parseFloat(searchParams.get('fuzzy')) || 0.3)
  const [etymologyFilter, setEtymologyFilter] = useState(searchParams.get('etymology') || '')

  // Arama query'si
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', searchTerm, searchType, fuzzyThreshold, etymologyFilter],
    queryFn: () => searchWords({
      query: searchTerm,
      type: searchType,
      fuzzy: fuzzyThreshold,
      etymology: etymologyFilter || undefined
    }),
    enabled: searchTerm.length >= 2,
  })

  // URL parametrelerini güncelle
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const params = {
        q: searchTerm,
        type: searchType,
        fuzzy: fuzzyThreshold.toString()
      }
      if (etymologyFilter) params.etymology = etymologyFilter
      setSearchParams(params)
    }
  }, [searchTerm, searchType, fuzzyThreshold, etymologyFilter])

  const handleSearch = (term) => {
    setSearchTerm(term)
  }

  const handleWordClick = (wordId) => {
    navigate(`/word/${wordId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Arama kutusu */}
      <div className="mb-8">
        <SearchBar
          initialValue={searchTerm}
          onSearch={handleSearch}
          searchType={searchType}
          onTypeChange={setSearchType}
        />
      </div>

      {/* Filtreler */}
      {searchTerm.length >= 2 && (
        <div className="mb-6">
          <SearchFilters
            fuzzyThreshold={fuzzyThreshold}
            onFuzzyChange={setFuzzyThreshold}
            etymologyFilter={etymologyFilter}
            onEtymologyChange={setEtymologyFilter}
          />
        </div>
      )}

      {/* Sonuçlar */}
      <div className="mt-8">
        {searchTerm.length < 2 ? (
          <div className="text-center py-16">
            <div className="inline-block p-8 bg-white rounded-lg shadow-md border border-parchment-300">
              <svg
                className="mx-auto h-16 w-16 text-ink-700 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-ink-900 mb-2">
                Aramaya Başlayın
              </h3>
              <p className="text-ink-700 font-sans">
                Türkçe kelime veya İngilizce anlam arayın
              </p>
              <div className="mt-6 text-sm text-ink-600 font-sans space-y-2">
                <p><strong>Örnekler:</strong></p>
                <p>• "ol" → ol, ol-, ola:, olug</p>
                <p>• "hunt" → hunting, game, hunter</p>
                <p>• "ağır" → heavy, pain, honor</p>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-maroon-600 border-t-transparent"></div>
            <p className="mt-4 text-ink-700 font-sans">Aranıyor...</p>
          </div>
        ) : isError ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-sans">
              ❌ Hata: {error.message}
            </p>
          </div>
        ) : data?.results?.length === 0 ? (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-sans">
              "{searchTerm}" için sonuç bulunamadı
            </p>
            <p className="text-sm text-yellow-700 mt-2 font-sans">
              Farklı bir arama terimi deneyin veya fuzzy matching değerini artırın
            </p>
          </div>
        ) : (
          <SearchResults
            results={data.results}
            onWordClick={handleWordClick}
            searchTerm={searchTerm}
          />
        )}
      </div>
    </div>
  )
}
