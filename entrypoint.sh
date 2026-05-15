#!/bin/sh

set -e

echo "==> Running db migrations"
cd /app/backend
npx prisma migrate deploy


echo "==> Starting node.js backend"
cd /app/backend
node src/server.js &
NODE_PID=$!

echo "==> Starting nginx"
nginx -g "daemon off;" &
NGINX_PID=$!

trap "echo '==> Shutting down...'; kill $NGINX_PID $NODE_PID; wait $NGINX_PID $NODE_PID" SIGTERM SIGINT

wait
