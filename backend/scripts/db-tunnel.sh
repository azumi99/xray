#!/bin/sh
# Tunnel DB utama (awbxray di server) — lokal 3308 → server 127.0.0.1:3306
# Loop auto-reconnect: koneksi SSH yang putus (network blip / idle drop) otomatis
# dibangun ulang setelah 2 detik — tidak perlu restart manual.
envget() { grep -m1 "^$1=" .env | cut -d= -f2-; }
HOST="${DB_SSH_HOST:-$(envget DB_SSH_HOST)}"
PORT="${DB_SSH_PORT:-$(envget DB_SSH_PORT)}"
USER_="${DB_SSH_USER:-$(envget DB_SSH_USER)}"
PASS="${DB_SSH_PASSWORD:-$(envget DB_SSH_PASSWORD)}"
while true; do
  sshpass -p "$PASS" ssh -N \
    -L "3308:127.0.0.1:3306" \
    -p "${PORT:-23022}" \
    -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new \
    "${USER_:-root}@${HOST:-119.8.180.89}"
  echo "[db-tunnel] koneksi putus — reconnect dalam 2s"
  sleep 2
done
