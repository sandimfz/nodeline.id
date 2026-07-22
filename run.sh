#!/bin/bash

# Fungsi untuk mematikan semua background process saat Ctrl+C ditekan
cleanup() {
    echo -e "\n🛑 Menghentikan semua layanan..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Tangkap sinyal SIGINT (Ctrl+C) dan SIGTERM
trap cleanup SIGINT SIGTERM

echo "🚀 Menjalankan semua layanan..."

# 1. Run Admin
echo "📦 [1/3] Menjalankan Admin (bun dev)..."
(cd admin && bun dev) &

# 2. Run API
echo "📦 [2/3] Menjalankan API (nest start)..."
(cd api && nest start) &

# 3. Run Client
echo "📦 [3/3] Menjalankan Client (bun start -p 3001)..."
(cd client && bun start -p 3001) &

# Tahan skrip agar tetap berjalan di foreground
wait
