# Clauson Türk Etimoloji Sözlüğü - Kurulum Kılavuzu

## 📋 Gereksinimler

- **Node.js** 18+ ([İndir](https://nodejs.org/))
- **PostgreSQL** 15+ ([İndir](https://www.postgresql.org/download/))
- **Python** 3.8+ (veri import scripti için)
- **npm** veya **yarn**

## 🚀 Hızlı Başlangıç

### 1. PostgreSQL Kurulumu ve Veritabanı Oluşturma

```bash
# PostgreSQL'e bağlan
sudo -u postgres psql

# Veritabanı oluştur
CREATE DATABASE clauson_db;

# Kullanıcı oluştur (opsiyonel)
CREATE USER clauson_user WITH PASSWORD 'güçlü_şifre';
GRANT ALL PRIVILEGES ON DATABASE clauson_db TO clauson_user;

# Çıkış
\q
```

### 2. Veritabanı Şemasını Yükle

```bash
cd clauson-dictionary/backend

# Şemayı yükle
psql -U postgres -d clauson_db -f database/schema.sql
```

### 3. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env

# .env dosyasını düzenle (veritabanı bilgilerini gir)
nano .env
```

**.env örneği:**
```env
DB_NAME=clauson_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. JSON Verilerini İçe Aktar

```bash
# Python bağımlılıklarını yükle
pip3 install psycopg2-binary

# Verileri import et
python3 scripts/import_data.py
```

**Beklenen çıktı:**
```
🚀 CLAUSON ETİMOLOJİ SÖZLÜĞÜ - VERİ İMPORT
======================================================================
✓ 1,608 giriş işlendi
✓ 203 varyant eklendi
📊 VERİTABANI İSTATİSTİKLERİ
✓ Benzersiz kelime sayısı: 1,300
✓ Toplam giriş sayısı: 1,608
```

### 5. Backend'i Başlat

```bash
# Geliştirme modu
npm run dev

# Veya production modu
npm start
```

Backend şu adreste çalışacak: **http://localhost:3000**

### 6. Frontend Kurulumu

```bash
# Yeni bir terminal aç
cd ../frontend

# Bağımlılıkları yükle
npm install

# Frontend'i başlat
npm run dev
```

Frontend şu adreste çalışacak: **http://localhost:5173**

## ✅ Kurulum Kontrolü

### Backend Test:
```bash
curl http://localhost:3000/health
```

Beklenen yanıt:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Arama Testi:
```bash
curl "http://localhost:3000/api/search?q=ol&type=turkish"
```

## 🐛 Sorun Giderme

### PostgreSQL bağlantı hatası
```bash
# PostgreSQL'in çalıştığını kontrol et
sudo systemctl status postgresql

# Çalışmıyorsa başlat
sudo systemctl start postgresql
```

### Port zaten kullanımda hatası
```bash
# 3000 portunu kullanan işlemi bul
lsof -i :3000

# İşlemi sonlandır
kill -9 <PID>
```

### npm install hataları
```bash
# npm cache temizle
npm cache clean --force

# Tekrar dene
npm install
```

### Python psycopg2 hatası
```bash
# Sistem bağımlılıklarını yükle (Ubuntu/Debian)
sudo apt-get install libpq-dev python3-dev

# Tekrar dene
pip3 install psycopg2-binary
```

## 📦 Production Deployment

### Backend

```bash
cd backend

# Production build
NODE_ENV=production npm start
```

### Frontend

```bash
cd frontend

# Production build
npm run build

# Build dosyaları dist/ klasöründe oluşur
```

**Nginx örnek konfigürasyonu:**
```nginx
server {
    listen 80;
    server_name sozluk.example.com;

    # Frontend
    location / {
        root /var/www/clauson-dictionary/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔒 Güvenlik Önerileri

1. **Güçlü şifreler kullanın:**
   ```env
   DB_PASSWORD=en_az_16_karakter_uzunluğunda
   ```

2. **Production'da NODE_ENV ayarlayın:**
   ```env
   NODE_ENV=production
   ```

3. **Firewall kuralları ekleyin:**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

4. **PostgreSQL'i sadece localhost'tan erişilebilir yapın:**
   ```bash
   # /etc/postgresql/15/main/pg_hba.conf
   host    all    all    127.0.0.1/32    md5
   ```

## 📊 Performans Optimizasyonları

1. **PostgreSQL connection pool ayarları:**
   ```javascript
   // backend/src/config/database.js
   max: 20,  // Maksimum bağlantı
   ```

2. **PostgreSQL shared_buffers:**
   ```bash
   # /etc/postgresql/15/main/postgresql.conf
   shared_buffers = 256MB
   ```

3. **Frontend build optimizasyonu:**
   ```bash
   # Vite build optimizasyonu
   npm run build -- --minify
   ```

## 📞 Destek

Sorun yaşarsanız:
- GitHub Issues: [github.com/...](https://github.com/...)
- Email: [...]
