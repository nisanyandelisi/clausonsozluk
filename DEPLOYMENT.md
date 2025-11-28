# 🚀 Clauson Sözlük - Deployment Rehberi

## Mimari
```
Frontend (React + Vite) → GitHub Pages
Backend (Node.js + Express) → Render.com
Database (PostgreSQL) → Render.com
```

---

## 📋 ADIM 1: GitHub Repository Oluştur

```bash
cd /home/logos/0-Clauson/Clauson-Sozluk

# Git başlat (eğer yoksa)
git init
git add .
git commit -m "Initial commit: Clauson Dictionary"

# GitHub'da repository oluştur (tarayıcıda):
# https://github.com/new
# Repository adı: Clauson-Sozluk
# Public olarak oluştur

# Remote ekle
git remote add origin https://github.com/YOUR-USERNAME/Clauson-Sozluk.git
git branch -M main
git push -u origin main
```

---

## 📋 ADIM 2: Render.com - PostgreSQL Database

### 2.1 Database Oluştur
1. https://render.com → Sign Up/Login
2. **New +** → **PostgreSQL**
3. Ayarlar:
   - **Name**: `clauson-db`
   - **Database**: `clauson_db`
   - **User**: `clauson_user`
   - **Region**: **Frankfurt** (Türkiye'ye yakın)
   - **Plan**: **Free**
4. **Create Database** butonuna tıkla

### 2.2 Connection Info'yu Kaydet
Database oluştuktan sonra:
- **Internal Database URL**: `postgresql://clauson_user:...@...`
- **External Database URL**: `postgresql://clauson_user:...@...`
- Bu URL'leri kaydet!

### 2.3 Schema ve Veriler Yükle

#### Seçenek A: Render Shell'den (Önerilen)
```bash
# Render Dashboard → clauson-db → Shell butonu

# 1. Schema yükle
\i database/schema.sql

# Veya manuel SQL çalıştır (Render Shell'de dosya yüklenemezse):
# GitHub'daki schema.sql içeriğini kopyala-yapıştır
```

#### Seçenek B: Local'den psql ile
```bash
# Local bilgisayarından
psql "postgresql://clauson_user:PASSWORD@dpg-xxx.frankfurt-postgres.render.com/clauson_db" \
  -f backend/database/schema.sql
```

### 2.4 Verileri İçe Aktar

**Yöntem 1: Node.js Script ile (Backend deploy'dan sonra)**
```bash
# Render Web Service'ten Shell aç
npm run import-data-node
```

**Yöntem 2: Python Script ile (Local'den)**
```bash
cd backend
export DB_HOST=dpg-xxx.frankfurt-postgres.render.com
export DB_NAME=clauson_db
export DB_USER=clauson_user
export DB_PASSWORD=xxx
export DB_PORT=5432

python3 scripts/import_data.py
```

---

## 📋 ADIM 3: Render.com - Backend Web Service

### 3.1 Web Service Oluştur
1. Render Dashboard → **New +** → **Web Service**
2. **Connect Repository**: GitHub repository'nizi seçin
3. Ayarlar:
   - **Name**: `clauson-backend`
   - **Region**: **Frankfurt**
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: **Node**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

### 3.2 Environment Variables Ekle
```env
DB_NAME=clauson_db
DB_USER=clauson_user
DB_PASSWORD=<Render'dan aldığın password>
DB_HOST=<Internal hostname - örn: dpg-xxx-a.frankfurt-postgres.render.com>
DB_PORT=5432
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://YOUR-USERNAME.github.io
```

### 3.3 Deploy Et
- **Create Web Service** → Otomatik deploy başlar
- Build loglarını izle
- Deploy tamamlandığında: `https://clauson-backend.onrender.com`

### 3.4 Health Check
```bash
curl https://clauson-backend.onrender.com/health
# Beklenen: {"status":"healthy","database":"connected"}
```

---

## 📋 ADIM 4: GitHub Pages - Frontend

### 4.1 GitHub Repository Settings
1. GitHub repo → **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `gh-pages` / `(root)`
4. **Save**

### 4.2 GitHub Secrets Ekle
1. Repository → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://clauson-backend.onrender.com`

### 4.3 GitHub Actions İlk Deploy
```bash
# Kod değişikliği yapıp push et
git add .
git commit -m "Configure production deployment"
git push origin main

# GitHub Actions otomatik çalışır
# Repository → Actions sekmesinden izle
```

### 4.4 Site URL'i
Deploy tamamlandığında:
```
https://YOUR-USERNAME.github.io/Clauson-Sozluk/
```

---

## 📋 ADIM 5: CORS ve Frontend URL Güncelle

### 5.1 Backend CORS'u güncelle
`backend/src/index.js`:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://YOUR-USERNAME.github.io', // Buraya GitHub Pages URL'ini yaz
  process.env.FRONTEND_URL
].filter(Boolean);
```

### 5.2 Commit ve Push
```bash
git add backend/src/index.js
git commit -m "Update CORS for production"
git push
```

Render otomatik yeniden deploy eder.

---

## ✅ Kontrol Listesi

- [ ] GitHub repository oluşturuldu
- [ ] Render PostgreSQL database oluşturuldu
- [ ] Database schema yüklendi
- [ ] Database verileri import edildi (9064 kelime)
- [ ] Render Web Service oluşturuldu
- [ ] Backend environment variables eklendi
- [ ] Backend deploy edildi ve health check ✅
- [ ] GitHub Pages ayarlandı
- [ ] GitHub Actions secret (VITE_API_URL) eklendi
- [ ] Frontend deploy edildi
- [ ] CORS ayarları güncellendi
- [ ] Site test edildi (arama çalışıyor ✅)
- [ ] Admin paneli test edildi (#admin)

---

## 🐛 Sorun Giderme

### Backend 500 Hatası
```bash
# Render Dashboard → clauson-backend → Logs
# Database bağlantısını kontrol et
```

### Frontend API Hatası
```bash
# Browser Console → Network tab
# CORS hatasını kontrol et
# API URL'i doğru mu?
```

### Veritabanı Boş
```bash
# Render Shell'den kontrol:
SELECT COUNT(*) FROM words;
# Beklenen: 9064
```

### Render Free Tier Sleep Mode
- İlk istek ~30 saniye sürebilir
- Sonrası normal hızda çalışır

---

## 🔒 Güvenlik Notları

1. **Asla commit etme**:
   - `.env` dosyaları
   - Passcode'ları
   - Database şifreleri

2. **Production'da değiştir**:
   - Admin passcode'u (`teneke` yerine güçlü bir şifre)
   - `backend/src/controllers/reportController.js`
   - `backend/src/controllers/adminController.js`

3. **HTTPS zorunlu**:
   - GitHub Pages otomatik HTTPS
   - Render otomatik HTTPS

---

## 📊 Performans

### Optimizasyonlar
- ✅ Vite code splitting
- ✅ PostgreSQL indexleri
- ✅ Compression middleware
- ✅ Connection pooling

### Limitler (Free Tier)
- **Render PostgreSQL**: 1 GB storage
- **Render Web Service**: 750 saat/ay
- **GitHub Pages**: 100 GB bandwidth/ay

---

## 🎯 Sonraki Adımlar

1. Custom domain ekle (opsiyonel)
2. Admin passcode'u güçlendir
3. Rate limiting ekle
4. Database backup sistemi kur
5. Monitoring ekle (Sentry, LogRocket)

---

Başarılar! 🚀
