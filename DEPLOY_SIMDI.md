# 🚀 Hemen Deploy Et - Basit Talimatlar

## ŞU AN YAPMAN GEREKENLER

### 1️⃣ Render.com'da şu an gördüğün ekranda:

**"PostgreSQL" butonuna tıkla** ← BU!

### 2️⃣ Açılan formda şu bilgileri gir:

```
Name: clauson-db
Database: clauson_db
User: clauson_user
Region: Frankfurt (EU Central)   ← ÖNEMLİ: Türkiye'ye en yakın!
Plan: Free
```

**"Create Database" butonuna tıkla**

### 3️⃣ 2-3 dakika bekle...

Database hazır olunca **"Info"** sekmesine git.

### 4️⃣ Şu bilgileri KOPYALA:

- **Internal Database URL**: `postgresql://clauson_user:xxx@dpg-...`
- **External Database URL**: `postgresql://clauson_user:xxx@dpg-...`
- **Password**: `xxx...`

Bu bilgileri bir yere yapıştır (Notepad'e vs.), sonra lazım olacak.

---

## SONRA NE YAPACAĞIZ?

### A) Schema Yükle (2 yöntem var)

**Yöntem 1: Render Shell'den (kolay)**
- Render Dashboard → `clauson-db` → "Shell" butonu
- SQL komutlarını kopyala-yapıştır (RENDER_DEPLOYMENT_GUIDE.md'de var)

**Yöntem 2: Lokal bilgisayardan**
```bash
cd /home/logos/0-Clauson/Clauson-Sozluk/backend
psql "BURAYA_EXTERNAL_URL_YAPISTIR" -f database/schema.sql
```

### B) Verileri İçe Aktar

```bash
cd /home/logos/0-Clauson/Clauson-Sozluk/backend

export DB_HOST=dpg-xxx.frankfurt-postgres.render.com
export DB_NAME=clauson_db
export DB_USER=clauson_user
export DB_PASSWORD=BURAYA_PASSWORD
export DB_PORT=5432

python3 scripts/import_data.py
```

### C) Backend Deploy

1. Render → "New +" → "Web Service"
2. GitHub repo bağla: `Clauson-Sozluk`
3. Ayarlar:
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Region: Frankfurt
4. Environment variables ekle (RENDER_DEPLOYMENT_GUIDE.md'de liste var)

### D) GitHub'a Yükle

```bash
cd /home/logos/0-Clauson/Clauson-Sozluk
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/Clauson-Sozluk.git
git push -u origin main
```

### E) GitHub Pages

1. Repo → Settings → Pages
2. Source: `gh-pages` branch
3. GitHub Actions secret ekle: `VITE_API_URL` = `https://clauson-backend.onrender.com`

---

## ÖZET

1. **Şu an**: PostgreSQL oluştur ← SEN BURADASIN
2. **Sonra**: Schema yükle (SQL komutları)
3. **Sonra**: Verileri import et (Python script)
4. **Sonra**: Backend deploy (Render Web Service)
5. **Sonra**: GitHub'a push
6. **En son**: GitHub Pages aktif et

---

**Detaylı talimatlar:** `RENDER_DEPLOYMENT_GUIDE.md`

**Sorular:** Bana sor! 😊
