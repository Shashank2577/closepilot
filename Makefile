.PHONY: up down dev logs ps build reset-db shell-db

up:
	docker compose up -d

down:
	docker compose down

dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

logs:
	docker compose logs -f

ps:
	docker compose ps

build:
	docker compose build --no-cache

reset-db:
	docker compose down -v
	docker compose up -d postgres
	sleep 3
	pnpm db:push

shell-db:
	docker compose exec postgres psql -U closepilot -d closepilot
