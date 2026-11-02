#!/bin/sh
# Jalankan kedua tunnel di background lalu backend dev; tunnel dimatikan saat berhenti (Ctrl+C)
./scripts/tunnel.sh & T1=$!
./scripts/db-tunnel.sh & T2=$!
trap 'kill $T1 $T2 2>/dev/null' EXIT INT TERM
echo "menunggu tunnel (3307 manifest, 3308 db)..."
for i in $(seq 1 20); do
  (nc -z 127.0.0.1 3307 && nc -z 127.0.0.1 3308) 2>/dev/null && break
  sleep 1
done
npm run start:dev
