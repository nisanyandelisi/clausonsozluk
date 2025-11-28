import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { autocomplete } from '../utils/api'

export default function SearchBar({ initialValue = '', onSearch, searchType, onTypeChange }) {
  const [inputValue, setInputValue] = useState(initialValue)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Autocomplete query
  const { data: suggestions } = useQuery({
    queryKey: ['autocomplete', inputValue],
    queryFn: () => autocomplete(inputValue),
    enabled: inputValue.length >= 2 && showSuggestions,
  })

  useEffect(() => {
    setInputValue(initialValue)
  }, [initialValue])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSearch(inputValue.trim())
      setShowSuggestions(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setInputValue(value)
    setShowSuggestions(true)

    // Gerçek zamanlı arama (debounce ile)
    if (value.trim().length >= 2) {
      const timer = setTimeout(() => {
        onSearch(value.trim())
      }, 300)
      return () => clearTimeout(timer)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion)
    onSearch(suggestion)
    setShowSuggestions(false)
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        {/* Arama tipi seçici */}
        <div className="flex gap-2 mb-4 justify-center">
          <button
            type="button"
            onClick={() => onTypeChange('turkish')}
            className={`btn ${
              searchType === 'turkish' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            🇹🇷 Türkçe
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('english')}
            className={`btn ${
              searchType === 'english' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            🇬🇧 English
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('both')}
            className={`btn ${
              searchType === 'both' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            🌍 Her İkisi
          </button>
        </div>

        {/* Arama input */}
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={
              searchType === 'turkish'
                ? "Öz Türkçe kelime arayın (örn: ol, ağır, ap)"
                : searchType === 'english'
                ? "İngilizce anlam arayın (örn: hunt, pain, very)"
                : "Türkçe kelime veya İngilizce anlam arayın"
            }
            className="input text-lg pr-12"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-maroon-600 hover:text-maroon-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          {/* Autocomplete önerileri */}
          {showSuggestions && suggestions?.suggestions?.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border-2 border-parchment-300 overflow-hidden">
              {suggestions.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-parchment-100 transition-colors font-mono text-ink-900"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Arama ipuçları */}
      <div className="mt-4 text-center text-sm text-ink-600 font-sans">
        <p>
          💡 <strong>İpucu:</strong> Kısmi eşleşme desteklenir.
          "ol" yazarsanız "ol-", "ola:", "olug" gibi kelimeleri de bulur.
        </p>
      </div>
    </div>
  )
}
