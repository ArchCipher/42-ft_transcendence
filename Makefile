COMPOSE = docker compose -f compose.yaml

# optional domain override when creating the local environment
DOMAIN_NAME ?=

all: up

# ---- setup -------------------------------------------------------------------

# create missing local configuration and tls files
setup: setup_env setup_cert
	@echo "local environment and tls certificate ready"

# create the local environment file from the committed template when missing
setup_env:
	@if [ -f .env ]; then \
		echo ".env already exists, keeping it"; \
	else \
		cp .env.example .env; \
		DB_PASSWORD=$$(openssl rand -hex 32); \
		INTERNAL_SERVICE_TOKEN=$$(openssl rand -hex 32); \
		sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$$DB_PASSWORD/" .env; \
		sed -i "s/^INTERNAL_SERVICE_TOKEN=.*/INTERNAL_SERVICE_TOKEN=$$INTERNAL_SERVICE_TOKEN/" .env; \
		if [ -n "$(DOMAIN_NAME)" ]; then \
			sed -i "s/^DOMAIN_NAME=.*/DOMAIN_NAME=$(DOMAIN_NAME)/" .env; \
		fi; \
		echo "created .env with local credentials"; \
	fi

# create the self-signed tls certificate when missing
setup_cert: setup_env
	@DOMAIN=$$(sed -n 's/^DOMAIN_NAME=//p' .env); \
	test -n "$$DOMAIN" || (echo "DOMAIN_NAME empty in .env"; exit 1); \
	CERT="secrets/$$DOMAIN.crt"; \
	KEY="secrets/$$DOMAIN.key"; \
	if [ -f "$$CERT" ] && [ -f "$$KEY" ]; then \
		echo "tls certificate already exists, keeping it"; \
	else \
		mkdir -p secrets; \
		openssl req \
			-newkey rsa:2048 \
			-x509 \
			-sha256 \
			-days 3650 \
			-nodes \
			-out "$$CERT" \
			-keyout "$$KEY" \
			-subj "/C=DE/ST=Berlin/L=Berlin/O=42-Berlin/OU=IT/CN=$$DOMAIN" \
			-addext "subjectAltName=DNS:$$DOMAIN"; \
		echo "created tls certificate for $$DOMAIN"; \
	fi

# ---- containers --------------------------------------------------------------

# build and start containers

up: setup
	$(COMPOSE) up --build -d

# stop containers
down:
	$(COMPOSE) down

# follow container logs
logs:
	$(COMPOSE) logs -f

# list running project containers
ps:
	$(COMPOSE) ps

# show basic compose state
test: ps
	$(COMPOSE) images
	$(COMPOSE) ls

# prune images GLOBALLY (removes dangling images GLOBALLY)
iprune:
	docker image prune -f

# this small target is used to run database migrations in development when you want to change the schema.
# see the DEV.md for more information
migrate-dev:
	@test -n "$(NAME)" || (echo "Usage: make migrate-dev NAME=description"; exit 1)
	$(COMPOSE) up -d --wait db # reuse the existing db container.
	# run as the current user to avoid permission issues on files written by the migration
	$(COMPOSE) run --rm \
	-u "$$(id -u):$$(id -g)" \
	-v "$(CURDIR)/packages/db:/app/packages/db" \
	migrate \
	npx prisma migrate dev --name "$(NAME)"

# create a PostgreSQL backup immediately
backup-db: setup
	$(COMPOSE) up -d --wait db
	$(COMPOSE) build backup
	$(COMPOSE) run --rm --no-deps backup once

# list stored PostgreSQL backups
backup-db-list: setup
	$(COMPOSE) build backup
	$(COMPOSE) run --rm --no-deps backup list

# restore the selected PostgreSQL backup into the application database
backup-db-restore: setup
	@test -n "$(BACKUP)" || (echo "Usage: make backup-db-restore BACKUP=<filename>"; exit 1)
	$(COMPOSE) up -d --wait db
	$(COMPOSE) build backup migrate
	$(COMPOSE) run --rm --no-deps --entrypoint /usr/local/bin/restore.sh backup validate "$(BACKUP)"
	$(COMPOSE) stop nginx collab web cleanup backup
	@if $(COMPOSE) run --rm --no-deps --entrypoint /usr/local/bin/restore.sh backup restore "$(BACKUP)"; then \
		if $(COMPOSE) run --rm --no-deps migrate; then \
			$(COMPOSE) up -d; \
			echo "database restore workflow complete"; \
		else \
			echo "database restored, but migrations failed; application services remain stopped"; \
			exit 1; \
		fi; \
	else \
		echo "database restore failed; application services remain stopped"; \
		exit 1; \
	fi

# ---- code quality ------------------------------------------------------------

lint:
	npm run lint

typecheck:
	npm run typecheck

# ---- cleanup -----------------------------------------------------------------

# stop containers
clean: down

# stop containers and remove project volumes
fclean:
	$(COMPOSE) down -v --remove-orphans
	docker image prune -f

# rebuild the project from a clean state
re: fclean all

.PHONY: all setup setup_env setup_cert up down logs ps test iprune migrate-dev backup-db backup-db-list backup-db-restore clean fclean re
