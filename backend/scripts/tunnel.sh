#!/bin/sh
# ponytail: tunnel sederhana tanpa autossh; upgrade ke launchd/autossh kalau perlu auto-reconnect permanen
set -a; [ -f .env ] && . ./.env; set +a
exec sshpass -p "$HOSTAWB_SSH_PASSWORD" ssh -N \
  -L 3307:127.0.0.1:3307 \
  -p "${HOSTAWB_SSH_PORT:-23022}" \
  -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=accept-new \
  "${HOSTAWB_SSH_USER:-root}@${HOSTAWB_SSH_HOST:-119.8.180.89}"
