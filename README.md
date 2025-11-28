# Clauson Türk Etimoloji Sözlüğü

> An Etymological Dictionary of Pre-Thirteenth-Century Turkish
> By Sir Gerard Clauson (1891-1974)

## 📚 Proje Hakkında

Bu proje, Sir Gerard Clauson'un ünlü "An Etymological Dictionary of Pre-Thirteenth-Century Turkish" eserinin dijital versiyonudur. İlk kez dijital ortama aktarılmaktadır.

### Özellikler

- ✅ Çift yönlü arama (Türkçe ↔ İngilizce)
- ✅ Akıllı eşleşme (büyük/küçük harf duyarsız, kısmi eşleşme)
- ✅ Kelime varyantları desteği
- ✅ Çapraz referans sistemi
- ✅ Akademik tasarım
- ✅ Mobil uyumlu

### İstatistikler

- **Toplam Giriş:** ~6,400 (tamamlandığında)
- **Benzersiz Kelime:** ~5,200
- **Etimoloji Tipleri:** 11+ kategori
- **Tarihî Dönem:** 8. yüzyıl - 13. yüzyıl

## 🛠️ Teknoloji Yığını

### Backend
- Node.js + Express
- PostgreSQL 15 (Full-text search)
- TypeScript

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- React Query

## 📂 Proje Yapısı

```
clauson-dictionary/
├── backend/           # API server
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── controllers/
│   │   ├── models/    # Database models
│   │   └── utils/     # Helper functions
│   ├── database/      # SQL schemas
│   └── scripts/       # Data import scripts
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── styles/
│   └── public/
└── data/              # JSON source files
```

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 15+
- npm veya yarn

### Adımlar

```bash
# 1. Repository'yi klonla
git clone [repository-url]

# 2. Backend kurulumu
cd backend
npm install
npm run setup-db

# 3. Verileri yükle
npm run import-data

# 4. Backend'i başlat
npm run dev

# 5. Frontend kurulumu (yeni terminal)
cd ../frontend
npm install
npm run dev
```

## 📖 Kullanım

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📝 Lisans

Bu proje akademik ve eğitim amaçlıdır.

## 🙏 Teşekkürler

Sir Gerard Clauson'un bu muazzam eserine ve Türk dilinin tarihine yaptığı katkılar için şükranlarımızla...
