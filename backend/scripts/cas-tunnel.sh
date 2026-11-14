#!/bin/sh
# Tunnel DB CAS (awbxray-CAS di CAS-RDS 10.1.1.113) — lokal 3309.
# Jump: 110.239.67.228:23022 (CAS-BACKUP-00). Loop auto-reconnect.
envget() { grep -m1 "^$1=" .env | cut -d= -f2-; }
HOST="${CAS_SSH_HOST:-$(envget CAS_SSH_HOST)}"
PORT="${CAS_SSH_PORT:-$(envget CAS_SSH_PORT)}"
USER_="${CAS_SSH_USER:-$(envget CAS_SSH_USER)}"
PASS="${CAS_SSH_PASSWORD:-$(envget CAS_SSH_PASSWORD)}"
FWD="${CAS_SSH_FWD:-$(envget CAS_SSH_FWD)}"
while true; do
  sshpass -p "$PASS" ssh -N \
    -L "3309:${FWD:-10.1.1.113:3306}" \
    -p "${PORT:-23022}" \
    -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new \
    "${USER_:-root}@${HOST:-110.239.67.228}"
  echo "[cas-tunnel] koneksi putus — reconnect dalam 2s"
  sleep 2
done
