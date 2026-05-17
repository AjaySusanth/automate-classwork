#!/bin/sh

echo "==> Running db migrations"
cd /app/backend

# Attempt standard migration deploy.
# We write output to a temp file so we can inspect the specific error code
# without set -e killing the process before we can handle it gracefully.
if ! npx prisma migrate deploy > /tmp/migrate.log 2>&1; then
  cat /tmp/migrate.log

  if grep -q "P3005" /tmp/migrate.log; then
    echo ""
    echo "==> P3005 detected: database has existing tables but no migration history."
    echo "==> This happens when the DB was bootstrapped via 'prisma db push' instead of"
    echo "==> 'prisma migrate deploy' (common on first manual deployments)."
    echo "==> Safely syncing schema to current state using 'prisma db push'..."
    echo "==> NOTE: This does NOT drop tables or delete data."
    npx prisma db push --skip-generate
    echo "==> Schema sync complete. Future deploys will use migrate deploy normally."
  else
    echo "==> Migration failed with an unexpected error. Aborting container startup."
    exit 1
  fi
else
  cat /tmp/migrate.log
  echo "==> Migrations applied successfully."
fi


echo "==> Starting node.js backend"
cd /app/backend
node src/server.js &
NODE_PID=$!

echo "==> Starting nginx"
nginx -g "daemon off;" &
NGINX_PID=$!

trap "echo '==> Shutting down...'; kill $NGINX_PID $NODE_PID; wait $NGINX_PID $NODE_PID" SIGTERM SIGINT

wait
