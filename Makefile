DOCKER_COMPOSE_FILE :=  -f ./docker-compose.yml --project-name sfl

build:
	docker compose $(DOCKER_COMPOSE_FILE) down
	docker compose $(DOCKER_COMPOSE_FILE) build

up:
	docker compose $(DOCKER_COMPOSE_FILE) up

recover-db:
	docker compose $(DOCKER_COMPOSE_FILE) exec mssql sh /var/opt/recover.sh

down:
	docker compose $(DOCKER_COMPOSE_FILE) down --remove-orphans

clean:
	docker compose $(DOCKER_COMPOSE_FILE) down --remove-orphans
	docker compose $(DOCKER_COMPOSE_FILE) build --no-cache

bash-db-root:
	docker compose $(DOCKER_COMPOSE_FILE) exec -u 0 mssql bash

standalone:
	cp -r ./.next/static ./.next/standalone/.next
	cp -r ./public ./.next/standalone
	cp ./.env.local ./.next/standalone/.env.local
	find ./.next/standalone -type f -name "*.js" | xargs sed -i '' 's/node:inspector/node--inspector/g'
	cd ./.next/standalone && node server.js

bash-db:
	docker compose $(DOCKER_COMPOSE_FILE) exec mssql bash

push:
	git commit -a --amend --no-edit & git push origin HEAD -f

update-packages: 
	ncu -u

.PHONY: build up down clean bash-db push db bash-db-root
.PHONY: update-packages recover-db standalone