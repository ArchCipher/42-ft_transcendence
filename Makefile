COMPOSE = docker compose -f compose.yaml

# Optional: make setup DOMAIN_NAME=localhost
# After setup, .env is the source of truth
DOMAIN_NAME ?=

# ---- Rules -------------------------------------------------------------------

# start containers
all: up

# setup .env, secrets/. Optional SSL/TLS cert if DOMAIN_NAME is passed
# usage: make setup DOMAIN_NAME=<ldomain_name>
setup: setup_env setup_secrets setup_cert
	@echo "Fill .env. Add passwords to secrets/*.txt"

# setup env file
setup_env:
	@test ! -f .env || (echo ".env already exists"; exit 1)
	cp .env_example .env
ifdef DOMAIN_NAME
	@tmp=$$(mktemp); \
	sed "s/^DOMAIN_NAME=.*/DOMAIN_NAME=$(DOMAIN_NAME)/" .env > $$tmp && mv $$tmp .env
endif

# setup secrets/
setup_secrets:
	mkdir -p secrets && touch secrets/db_password.txt

# setup SSL/TLS certificate (# Reads DOMAIN_NAME from .env)
setup_cert:
	@test -f .env || (echo "Missing .env — run make setup_env first"; exit 1)
	@DOMAIN=$$(sed -n 's/^DOMAIN_NAME=//p' .env); \
	test -n "$$DOMAIN" || (echo "DOMAIN_NAME empty in .env"; exit 1); \
	mkdir -p secrets && \
	openssl req -newkey rsa:2048 \
			-x509 \
			-sha256 \
			-days 3650 \
			-nodes \
			-out secrets/$$DOMAIN.crt \
			-keyout secrets/$$DOMAIN.key \
			-subj "/C=SI/ST=Germany/L=Berlin/O=42-Berlin/OU=IT/CN=$$DOMAIN" \
			-addext "subjectAltName=DNS:$$DOMAIN"

# start containers
up:
	$(COMPOSE) up --build -d

# stop containers
down:
	$(COMPOSE) down

# container logs
logs:
	$(COMPOSE) logs -f

# list containers
ps:
	$(COMPOSE) ps

# list containers, images, networks
test: ps
	$(COMPOSE) images
	$(COMPOSE) ls

# ---- Cleanup -----------------------------------------------------------------

# stop containers
clean: down

# stop containers and remove DB volumes
fclean:
	$(COMPOSE) down -v --remove-orphans

re: fclean all

.PHONY: all setup setup_env setup_secrets setup_cert up down logs ps test clean fclean re
