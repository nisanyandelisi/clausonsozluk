export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="card p-8">
        <h1 className="heading-1">Hakkında</h1>

        <div className="space-y-6 text-ink-900 leading-relaxed">
          <section>
            <h2 className="heading-3">Clauson Sözlüğü</h2>
            <p>
              <strong>An Etymological Dictionary of Pre-Thirteenth-Century Turkish</strong>,
              Sir Gerard Clauson (1891-1974) tarafından yazılmış monumentalmonumental bir eserdir.
              Bu sözlük, 13. yüzyıl öncesi Türkçe'nin en kapsamlı etimolojik kaynağıdır.
            </p>
          </section>

          <div className="divider"></div>

          <section>
            <h2 className="heading-3">Sir Gerard Clauson (1891-1974)</h2>
            <p>
              İngiliz diplomat, Türkolog ve dilbilimci. Türk dilleri üzerine yaptığı çalışmalarla
              dünya çapında tanınmıştır. En önemli eseri olan bu etimoloji sözlüğü,
              Türkoloji alanında hâlâ en önemli referans kaynaklarından biridir.
            </p>
          </section>

          <div className="divider"></div>

          <section>
            <h2 className="heading-3">Dijital Dönüşüm</h2>
            <p>
              Bu proje, Clauson'un eserinin <strong>ilk kez dijital ortama aktarılması</strong> çalışmasıdır.
              Amacımız, bu değerli kaynağı araştırmacılara ve Türk dili meraklılarına daha erişilebilir
              kılmaktır.
            </p>
          </section>

          <div className="divider"></div>

          <section>
            <h2 className="heading-3">Özellikler</h2>
            <ul className="list-disc list-inside space-y-2 font-sans">
              <li>✓ <strong>Çift yönlü arama:</strong> Türkçe kelime veya İngilizce anlam</li>
              <li>✓ <strong>Akıllı eşleşme:</strong> Büyük/küçük harf duyarsız, kısmi eşleşme</li>
              <li>✓ <strong>Fuzzy matching:</strong> Yaklaşık eşleşme desteği</li>
              <li>✓ <strong>Kelime varyantları:</strong> Farklı yazım şekilleri</li>
              <li>✓ <strong>Çapraz referanslar:</strong> İlişkili kelimelere geçiş</li>
              <li>✓ <strong>Detaylı etimoloji:</strong> Tam giriş metinleri</li>
              <li>✓ <strong>İstatistikler:</strong> Sözlük hakkında detaylı bilgiler</li>
            </ul>
          </section>

          <div className="divider"></div>

          <section>
            <h2 className="heading-3">Teknik Detaylar</h2>
            <div className="bg-parchment-50 rounded-lg p-6 border border-parchment-200 font-sans text-sm">
              <p className="mb-2"><strong>Backend:</strong> Node.js, Express, PostgreSQL</p>
              <p className="mb-2"><strong>Frontend:</strong> React, Tailwind CSS</p>
              <p className="mb-2"><strong>Arama:</strong> PostgreSQL Full-Text Search + Trigram Matching</p>
              <p><strong>Tasarım:</strong> Akademik & Klasik</p>
            </div>
          </section>

          <div className="divider"></div>

          <section>
            <h2 className="heading-3">İletişim</h2>
            <p className="font-sans">
              Bu proje hakkında sorularınız veya önerileriniz için iletişime geçebilirsiniz.
            </p>
          </section>

          <div className="mt-8 p-6 bg-maroon-50 border-2 border-maroon-200 rounded-lg text-center">
            <p className="text-maroon-800 italic">
              "Bu dijital sözlük, Sir Gerard Clauson'un ölümsüz eserine ve
              Türk dilinin tarihine bir saygı duruşudur."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
