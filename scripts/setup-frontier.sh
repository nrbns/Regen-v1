#!/bin/bash
# Setup script for Postgres frontier
# Runs migrations and seeds initial data

set -e

echo "🚀 Setting up Postgres Frontier..."

# Check if Postgres is available
until pg_isready -h localhost -p 5432 -U regen; do
  echo "⏳ Waiting for Postgres..."
  sleep 2
done

echo "✅ Postgres is ready"

# Run migrations
echo "📝 Running migrations..."
psql -h localhost -p 5432 -U regen -d regen -f migrations/0001_init_frontier.sql

echo "✅ Migrations complete"

# Migrate .cursor file if it exists
if [ -f .cursor ]; then
  echo "📦 Migrating .cursor file..."
  python scripts/migrate-cursor-to-frontier.py
  echo "✅ Migration complete"
else
  echo "ℹ️  No .cursor file found, skipping migration"
fi

echo "🎉 Frontier setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start workers: docker-compose up frontier-worker"
echo "  2. Check stats: psql -h localhost -U regen -d regen -c 'SELECT state, COUNT(*) FROM frontier GROUP BY state;'"








