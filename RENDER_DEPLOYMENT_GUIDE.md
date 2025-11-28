# 🚀 Render.com Deployment Rehberi - Adım Adım

## ADIM 1️⃣: PostgreSQL Database Oluştur

1. **Render.com'da "PostgreSQL" seçeneğine tıkla**

2. **Ayarları gir:**
   - **Name**: `clauson-db`
   - **Database**: `clauson_db`
   - **User**: `clauson_user`
   - **Region**: **Frankfurt (EU Central)** ← ÖNEMLİ: Türkiye'ye en yakın!
   - **PostgreSQL Version**: 15
   - **Plan**: **Free**

3. **"Create Database" butonuna tıkla**

4. **Bekle** (2-3 dakika sürer)

---

## ADIM 2️⃣: Database Bilgilerini Kaydet

Database hazır olunca **"Info"** sekmesinde şu bilgileri göreceksin:

```
Internal Database URL: postgresql://clauson_user:xxx@dpg-xxx-a.frankfurt-postgres.render.com/clauson_db
External Database URL: postgresql://clauson_user:xxx@dpg-xxx.frankfurt-postgres.render.com/clauson_db
Hostname: dpg-xxx-a.frankfurt-postgres.render.com
Port: 5432
Database: clauson_db
Username: clauson_user
Password: [otomatik oluşturulmuş]
```

**ÖNEMLİ:**
- **Internal Database URL**'yi kopyala ve bir yere yapıştır (backend için kullanacağız)
- **External Database URL**'yi de kaydet (lokal bilgisayarından bağlanmak için)

---

## ADIM 3️⃣: Schema'yı Yükle

### Seçenek A: Render Shell'den (Tavsiye Edilen)

1. Render Dashboard → `clauson-db` → **"Shell"** butonuna tıkla
2. Shell açılınca aşağıdaki SQL komutlarını **SIRAYLA** kopyala-yapıştır:

```sql
-- Extension'ları aktifleştir
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Ana kelimeler tablosu
CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    word_normalized TEXT NOT NULL,
    search_keywords TEXT[],
    meaning TEXT,
    etymology_type TEXT,
    cross_reference TEXT,
    full_entry_text TEXT,
    occurrence_number INTEGER DEFAULT 1,
    is_corrected BOOLEAN DEFAULT FALSE,
    corrected_at TIMESTAMP,
    corrected_by TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Kelime varyantları tablosu
CREATE TABLE variants (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    variant TEXT NOT NULL,
    variant_normalized TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Raporlar tablosu
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    word_id INTEGER REFERENCES words(id) ON DELETE CASCADE,
    word_text TEXT,
    error_types TEXT[],
    suggested_correction TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- İndeksler
CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_words_word_normalized ON words(word_normalized);
CREATE INDEX idx_words_etymology_type ON words(etymology_type);
CREATE INDEX idx_variants_word_id ON variants(word_id);
CREATE INDEX idx_variants_variant ON variants(variant);
CREATE INDEX idx_words_meaning_fts ON words USING GIN(to_tsvector('english', COALESCE(meaning, '')));
CREATE INDEX idx_words_word_fts ON words USING GIN(to_tsvector('simple', word));
CREATE INDEX idx_words_word_trgm ON words USING GIN(word_normalized gin_trgm_ops);
CREATE INDEX idx_words_meaning_trgm ON words USING GIN(meaning gin_trgm_ops);
CREATE INDEX idx_variants_variant_trgm ON variants USING GIN(variant_normalized gin_trgm_ops);
CREATE INDEX idx_words_word_etym ON words(word, etymology_type);
CREATE INDEX idx_words_occurrence ON words(word, occurrence_number);

-- Normalize fonksiyonu
CREATE OR REPLACE FUNCTION normalize_word(word TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN TRANSLATE(
        LOWER(
            REGEXP_REPLACE(
                REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                    word,
                    'İ', 'i'), 'I', 'i'),
                    'Ş', 's'), 'ş', 's'),
                    'Ğ', 'g'), 'ğ', 'g'),
                    'Ü', 'u'), 'ü', 'u'),
                    'Ö', 'o'), 'ö', 'o'),
                    'Ç', 'c'), 'ç', 'c'),
                '^\d+\s*', '')
        ),
        'ıñŋḏḍéāīūʾʿ:-*?''()[]/.,;',
        'innddeaiu'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_words_updated_at
    BEFORE UPDATE ON words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

3. **Kontrol et:**
```sql
\dt
-- words, variants, reports tabloları görünmeli
```

### Seçenek B: Lokal Bilgisayardan psql ile

Eğer bilgisayarında `psql` kuruluysa:

```bash
cd /home/logos/0-Clauson/Clauson-Sozluk/backend
psql "BURAYA_EXTERNAL_DATABASE_URL_YAPISTIR" -f database/schema.sql
```

Örnek:
```bash
psql "postgresql://clauson_user:PASSWORD@dpg-xxx.frankfurt-postgres.render.com/clauson_db" -f database/schema.sql
```

---

## ADIM 4️⃣: Verileri İçe Aktar

### Yöntem 1: Python Script ile (Lokal Bilgisayardan)

```bash
cd /home/logos/0-Clauson/Clauson-Sozluk/backend

# Environment variables ayarla
export DB_HOST=dpg-xxx.frankfurt-postgres.render.com
export DB_NAME=clauson_db
export DB_USER=clauson_user
export DB_PASSWORD=BURAYA_RENDER_PASSWORDUNU_YAPISTIR
export DB_PORT=5432

# Script'i çalıştır
python3 scripts/import_data.py
```

**Beklenen çıktı:**
```
✅ 9064 kelime import edildi
✅ Database hazır!
```

### Yöntem 2: Backend Deploy Ettikten Sonra (Tavsiye Edilen)

Backend Render'a deploy edildikten sonra, Render Dashboard'dan:

1. `clauson-backend` → **"Shell"** → Terminal aç
2. Şu komutu çalıştır:
```bash
npm run import-data-node
```

---

## ADIM 5️⃣: Backend Web Service Oluştur

1. **Render Dashboard → "New +" → "Web Service"**

2. **GitHub Repository Bağla:**
   - "Connect a repository" → GitHub hesabını bağla
   - `Clauson-Sozluk` repository'sini seç

3. **Ayarlar:**
   - **Name**: `clauson-backend`
   - **Region**: **Frankfurt (EU Central)**
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: **Node**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

4. **Environment Variables Ekle:**

"Advanced" → "Environment Variables" → Şu değişkenleri ekle:

```
DB_NAME=clauson_db
DB_USER=clauson_user
DB_PASSWORD=<Render database password>
DB_HOST=<Internal hostname - örn: dpg-xxx-a.frankfurt-postgres.render.com>
DB_PORT=5432
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://YOUR-GITHUB-USERNAME.github.io
```

**ÖNEMLİ:**
- `DB_HOST` için **Internal Database URL**'den hostname'i kopyala
- `DB_PASSWORD` Render'ın otomatik oluşturduğu password
- `FRONTEND_URL`'yi daha sonra GitHub username'in ile değiştireceksin

5. **"Create Web Service" butonuna tıkla**

6. **Deploy işlemini izle** (Build logs görünecek, 2-3 dakika sürer)

7. **Deploy tamamlandığında:**
   - URL: `https://clauson-backend.onrender.com`
   - Health check: `https://clauson-backend.onrender.com/health`

---

## ADIM 6️⃣: Backend Kontrolü

Tarayıcıda aç:
```
https://clauson-backend.onrender.com/health
```

**Beklenen yanıt:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-28T..."
}
```

Eğer `"database": "connected"` görüyorsan, **backend hazır!** ✅

---

## ADIM 7️⃣: GitHub Repository Oluştur

1. **GitHub'da:** https://github.com/new
2. **Repository adı**: `Clauson-Sozluk`
3. **Public** seç (GitHub Pages için gerekli)
4. **Create repository**

---

## ADIM 8️⃣: Kodu GitHub'a Yükle

Lokal bilgisayarında:

```bash
cd /home/logos/0-Clauson/Clauson-Sozluk

# Git başlat (eğer yoksa)
git init
git add .
git commit -m "Initial commit: Clauson Turkish Etymology Dictionary"

# Remote ekle
git remote add origin https://github.com/YOUR-USERNAME/Clauson-Sozluk.git
git branch -M main
git push -u origin main
```

**DİKKAT:** `YOUR-USERNAME` yerine kendi GitHub username'ini yaz!

---

## ADIM 9️⃣: GitHub Pages Ayarla

1. **GitHub repo → Settings → Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `gh-pages` / `(root)`
4. **Save**

---

## ADIM 🔟: GitHub Secrets Ekle

1. **Repository → Settings → Secrets and variables → Actions**
2. **"New repository secret" butonuna tıkla**
3. **Secret ekle:**
   - **Name**: `VITE_API_URL`
   - **Value**: `https://clauson-backend.onrender.com`
4. **"Add secret"**

---

## ADIM 1️⃣1️⃣: Frontend CORS Güncelle

Backend'e geri dön ve CORS'u güncelle:

`backend/src/index.js` dosyasında:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://YOUR-USERNAME.github.io', // ← Buraya GitHub username'ini yaz!
  process.env.FRONTEND_URL
].filter(Boolean);
```

Değişikliği commit et:

```bash
cd /home/logos/0-Clauson/Clauson-Sozluk
git add backend/src/index.js
git commit -m "Update CORS for GitHub Pages"
git push
```

Render otomatik yeniden deploy edecek.

---

## ADIM 1️⃣2️⃣: İlk Deploy (GitHub Actions)

GitHub'a push yaptığın an, GitHub Actions otomatik çalışacak:

1. **GitHub repo → Actions** sekmesi
2. **"Deploy to GitHub Pages" workflow'unu izle**
3. **Yeşil ✅ göreceksin (2-3 dakika)**

Deploy tamamlandığında:

```
https://YOUR-USERNAME.github.io/Clauson-Sozluk/
```

adresinde sitin yayında olacak! 🎉

---

## ✅ Kontrol Listesi

- [ ] Render PostgreSQL database oluşturuldu
- [ ] Schema yüklendi (words, variants, reports tabloları var)
- [ ] 9064 kelime import edildi
- [ ] Render Web Service oluşturuldu
- [ ] Backend environment variables eklendi
- [ ] Backend deploy edildi (`/health` endpoint çalışıyor)
- [ ] GitHub repository oluşturuldu
- [ ] Kod GitHub'a yüklendi
- [ ] GitHub Pages ayarlandı
- [ ] GitHub Actions secret eklendi (`VITE_API_URL`)
- [ ] Backend CORS güncellendi
- [ ] Frontend deploy edildi
- [ ] Site test edildi (arama çalışıyor)

---

## 🐛 Sorun Giderme

### Backend 500 Hatası
```bash
Render Dashboard → clauson-backend → Logs
# Database bağlantısını kontrol et
```

### Frontend API Hatası
```bash
# Browser Console → Network tab
# CORS hatasını kontrol et
# API URL doğru mu?
```

### Veritabanı Boş
```sql
-- Render Shell'den:
SELECT COUNT(*) FROM words;
-- Beklenen: 9064
```

### Render Free Tier Sleep Mode
- İlk istek ~30 saniye sürebilir (sunucu uyandırılıyor)
- Sonrası normal hızda çalışır

---

## 🔒 GÜVENLİK ÖNEMLİ!

### Asla commit etme:
- `.env` dosyaları ✅ (zaten .gitignore'da)
- Database şifreleri
- API keys

### Production'da değiştir:
- Admin passcode'u (`teneke` → güçlü şifre)
- `backend/src/controllers/reportController.js`
- `backend/src/controllers/adminController.js`

---

## 🎯 Anonim Deployment

Bu deployment tamamen anonim:
- GitHub hesabını anonim email ile oluşturabilirsin
- Render.com kişisel bilgi gerektirmiyor (free tier)
- IP adresin hiçbir yerde görünmüyor
- Tüm işlemler tarayıcı üzerinden yapılıyor

---

**Başarılar! 🚀**

Sorularını README.md'ye ekleyebilirsin veya GitHub Issues kullanabilirsin.
