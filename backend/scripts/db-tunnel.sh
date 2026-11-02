#!/bin/sh
# Tunnel DB utama (awbxray di server) — lokal 3308 → server 127.0.0.1:3306
envget() { grep -m1 "^$1=" .env | cut -d= -f2-; }
HOST="${DB_SSH_HOST:-$(envget DB_SSH_HOST)}"
PORT="${DB_SSH_PORT:-$(envget DB_SSH_PORT)}"
USER_="${DB_SSH_USER:-$(envget DB_SSH_USER)}"
PASS="${DB_SSH_PASSWORD:-$(envget DB_SSH_PASSWORD)}"
exec sshpass -p "$PASS" ssh -N \
  -L "3308:127.0.0.1:3306" \
  -p "${PORT:-23022}" \
  -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new \
  "${USER_:-root}@${HOST:-119.8.180.89}"
