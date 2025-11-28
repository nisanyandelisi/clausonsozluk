#!/bin/bash

# Clauson Sözlük - Render PostgreSQL Schema Loader
# Bu script schema.sql dosyasını Render database'ine yükler

echo "🚀 Clauson Sözlük - Render Database Schema Loader"
echo "=================================================="
echo ""

# Render PostgreSQL External URL'yi buraya yapıştır
# Örnek: postgresql://clauson_user:PASSWORD@dpg-xxx.frankfurt-postgres.render.com/clauson_db
read -p "Render PostgreSQL External URL'i yapıştır: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Database URL boş olamaz!"
    exit 1
fi

echo ""
echo "📂 Schema dosyası yükleniyor..."
echo ""

# Schema'yı yükle
psql "$DATABASE_URL" -f ../database/schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema başarıyla yüklendi!"
    echo ""
    echo "📊 Tablo kontrolü yapılıyor..."
    psql "$DATABASE_URL" -c "\dt"
    echo ""
    echo "🎉 Database hazır! Şimdi verileri import edebilirsin."
else
    echo ""
    echo "❌ Schema yüklenirken hata oluştu!"
    exit 1
fi
