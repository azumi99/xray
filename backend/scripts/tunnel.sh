#!/bin/sh
# ponytail: tunnel sederhana tanpa autossh; upgrade ke launchd/autossh kalau perlu auto-reconnect permanen
# .env diparse dengan grep/cut (bukan di-source) supaya karakter spesial di password aman
envget() { grep -m1 "^$1=" .env | cut -d= -f2-; }
HOST="${HOSTAWB_SSH_HOST:-$(envget HOSTAWB_SSH_HOST)}"
PORT="${HOSTAWB_SSH_PORT:-$(envget HOSTAWB_SSH_PORT)}"
USER_="${HOSTAWB_SSH_USER:-$(envget HOSTAWB_SSH_USER)}"
PASS="${HOSTAWB_SSH_PASSWORD:-$(envget HOSTAWB_SSH_PASSWORD)}"
FWD="${HOSTAWB_SSH_FWD:-$(envget HOSTAWB_SSH_FWD)}"
exec sshpass -p "$PASS" ssh -N \
  -L "3307:${FWD:-10.1.1.102:3306}" \
  -p "${PORT:-23022}" \
  -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new \
  "${USER_:-root}@${HOST:-119.8.180.89}"
