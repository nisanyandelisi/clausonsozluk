import { Link } from 'react-router-dom'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-4 border-maroon-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 mb-1">
                Clauson Türk Etimoloji Sözlüğü
              </h1>
              <p className="text-sm sm:text-base text-ink-700 italic font-sans">
                An Etymological Dictionary of Pre-Thirteenth-Century Turkish
              </p>
              <p className="text-xs text-ink-600 mt-1 font-sans">
                by Sir Gerard Clauson (1891-1974)
              </p>
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-parchment-100 border-t border-parchment-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center space-x-8 py-3">
              <Link to="/" className="text-ink-700 hover:text-maroon-600 font-sans text-sm font-medium transition-colors">
                Ana Sayfa
              </Link>
              <Link to="/statistics" className="text-ink-700 hover:text-maroon-600 font-sans text-sm font-medium transition-colors">
                İstatistikler
              </Link>
              <Link to="/about" className="text-ink-700 hover:text-maroon-600 font-sans text-sm font-medium transition-colors">
                Hakkında
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-ink-900 text-parchment-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm font-sans">
              Bu dijital sözlük, Sir Gerard Clauson'un ölümsüz eserine bir saygı duruşudur.
            </p>
            <p className="text-xs text-parchment-300 mt-2 font-sans">
              İlk defa dijital ortama aktarılmıştır • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
