.PHONY: help dev test build lint clean docker-build docker-up docker-down logs

# Default target
help:
	@echo "Regen Browser — Developer Commands"
	@echo "=================================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install          - Install all dependencies"
	@echo "  make setup            - Complete project setup (install + migrations)"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start full dev stack (docker + frontend + backend)"
	@echo "  make dev-backend      - Start just backend services (docker + node)"
	@echo "  make dev-frontend     - Start just frontend (React Vite)"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test             - Run all tests (unit + integration)"
	@echo "  make test-unit        - Run unit tests only"
	@echo "  make test-e2e         - Run end-to-end tests"
	@echo "  make test-watch       - Run tests in watch mode"
	@echo "  make lint             - Run ESLint + TypeScript checks"
	@echo "  make lint-fix         - Auto-fix linting issues"
	@echo "  make coverage         - Generate test coverage report"
	@echo ""
	@echo "Build & Deploy:"
	@echo "  make build            - Build production bundles (frontend + backend)"
	@echo "  make build-frontend   - Build frontend only"
	@echo "  make build-backend    - Build backend only"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build     - Build all Docker images"
	@echo "  make docker-up        - Start all containers (docker-compose up)"
	@echo "  make docker-down      - Stop all containers"
	@echo "  make docker-logs      - View container logs"
	@echo "  make docker-clean     - Remove containers + volumes"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate       - Run pending migrations"
	@echo "  make db-reset         - Reset database (drop + migrate)"
	@echo "  make db-seed          - Seed database with sample data"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make format           - Format code with Prettier"
	@echo "  make security-audit   - Run security checks (Snyk)"
	@echo "  make check-secrets    - Scan for hardcoded secrets"
	@echo ""

# Installation
install:
	npm install
	npm run setup:env

setup: install docker-build db-migrate
	@echo "✅ Project setup complete!"
	@echo "Run 'make dev' to start development"

# Development
dev: docker-up
	@echo "🚀 Starting dev stack..."
	@npm run dev 2>&1 &
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:3001"
	@echo "API Docs: http://localhost:3001/api/docs"
	@echo "Redis UI: http://localhost:8001"
	@echo "MinIO UI: http://localhost:9001"

dev-backend: docker-up
	npm run dev:backend

dev-frontend:
	npm run dev:frontend

# Testing
test:
	npm run test

test-unit:
	npm run test:unit

test-e2e:
	npm run test:e2e

test-watch:
	npm run test:watch

coverage:
	npm run test:coverage
	@echo "📊 Coverage report: coverage/index.html"

# Linting
lint:
	npm run lint

lint-fix:
	npm run lint:fix

# Building
build: lint test
	npm run build

build-frontend:
	npm run build:frontend

build-backend:
	npm run build:backend

# Docker
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d
	@echo "✅ Docker containers started"
	@echo "Postgres: localhost:5432"
	@echo "Redis: localhost:6379"
	@echo "Milvus: localhost:19530"
	@echo "MinIO: localhost:9000"
	@echo "Local LLM: localhost:8000"

docker-down:
	docker-compose down
	@echo "✅ Docker containers stopped"

docker-logs:
	docker-compose logs -f

docker-clean:
	docker-compose down -v
	@echo "✅ Docker containers and volumes removed"

# Database
db-migrate:
	npm run migrate
	@echo "✅ Migrations complete"

db-reset:
	docker-compose exec postgres psql -U regen -d regen -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	npm run migrate
	@echo "✅ Database reset and migrated"

db-seed:
	npm run seed
	@echo "✅ Sample data seeded"

# Utilities
clean:
	rm -rf dist/
	rm -rf build/
	rm -rf coverage/
	@echo "✅ Build artifacts cleaned"

format:
	npm run format

security-audit:
	npm audit
	npx snyk test || true

check-secrets:
	@echo "🔍 Scanning for hardcoded secrets..."
	git diff --cached | grep -E '(password|secret|token|api[_-]?key)' && echo "⚠️  Potential secret detected!" || echo "✅ No secrets found"

# CI/Local build (equivalent to GitHub Actions)
ci: lint test build
	@echo "✅ CI checks passed"

# Quick demo
demo: docker-up
	@echo "🎬 Running demo flow..."
	npm run demo

# Show status
status:
	@echo "📊 Service Status:"
	@docker ps --format "table {{.Names}}\t{{.Status}}" || echo "Docker not running"
	@echo ""
	@echo "📦 Project Info:"
	@node -e "console.log('Node:', process.version)"
	@npm -v 2>/dev/null | sed 's/^/NPM: /'

# Git hooks
install-hooks:
	npx husky install
	npx husky add .husky/pre-commit "make lint"
	npx husky add .husky/pre-push "make test"
	@echo "✅ Git hooks installed"

# Troubleshooting
logs-backend:
	docker-compose logs -f backend

logs-frontend:
	npm run dev:frontend -- --host

logs-postgres:
	docker-compose logs -f postgres

reset:
	make docker-clean
	make clean
	make install
	@echo "✅ Complete reset done"
