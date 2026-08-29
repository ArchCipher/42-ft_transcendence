COMPOSE = docker compose -f compose.yaml

# optional domain override when creating the local environment
DOMAIN_NAME ?=

all: up

# ---- setup -------------------------------------------------------------------

# create the local environment and tls certificate
setup: setup_env setup_cert
	@echo "local environment and tls certificate ready"

# create the local environment file from the committed template
setup_env:
	@test ! -f .env || (echo ".env already exists"; exit 1)
	cp .env.example .env
ifdef DOMAIN_NAME
	@tmp=$$(mktemp); \
	sed "s/^DOMAIN_NAME=.*/DOMAIN_NAME=$(DOMAIN_NAME)/" .env > $$tmp && mv $$tmp .env
endif

# create a self-signed tls certificate using DOMAIN_NAME from .env
setup_cert:
	@test -f .env || (echo "missing .env — run make setup_env first"; exit 1)
	@DOMAIN=$$(sed -n 's/^DOMAIN_NAME=//p' .env); \
	test -n "$$DOMAIN" || (echo "DOMAIN_NAME empty in .env"; exit 1); \
	mkdir -p secrets && \
	openssl req \
		-newkey rsa:2048 \
		-x509 \
		-sha256 \
		-days 3650 \
		-nodes \
		-out secrets/$$DOMAIN.crt \
		-keyout secrets/$$DOMAIN.key \
		-subj "/C=DE/ST=Berlin/L=Berlin/O=42-Berlin/OU=IT/CN=$$DOMAIN" \
		-addext "subjectAltName=DNS:$$DOMAIN"

# ---- containers --------------------------------------------------------------

# build and start containers

up:
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


# ---- cleanup -----------------------------------------------------------------

# stop containers
clean: down

# stop containers and remove project volumes
fclean:
	$(COMPOSE) down -v --remove-orphans
	docker image prune -f

# rebuild the project from a clean state
re: fclean all

.PHONY: all setup setup_env setup_cert up down logs ps test iprune migrate-dev clean fclean re
