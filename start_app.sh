#!/bin/bash

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Clauson Sözlüğü Başlatılıyor ===${NC}"

# 1. Backend'i Başlat
echo -e "\n${GREEN}1. Backend Başlatılıyor...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 Backend bağımlılıkları yükleniyor..."
    npm install
fi
# Arka planda çalıştır
npm run dev &
BACKEND_PID=$!
cd ..

# 2. Frontend'i Başlat
echo -e "\n${GREEN}2. Frontend Başlatılıyor...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Frontend bağımlılıkları yükleniyor..."
    npm install
fi
# Arka planda çalıştır
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${BLUE}=== Uygulama Çalışıyor ===${NC}"
echo -e "Frontend: http://localhost:5173"
echo -e "Backend: http://localhost:3000"
echo -e "Durdurmak için CTRL+C yapın."

# Kapanışta processleri öldür
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# Processleri bekle
wait
