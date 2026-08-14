FROM node:22-alpine

WORKDIR /app

# copy workspace manifests first so this layer stays cached
# as long as dependencies don't change
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/package.json
RUN npm ci

COPY packages/db ./packages/db

WORKDIR /app/packages/db

# applies already-written migrations, never generates new ones
CMD ["npx", "prisma", "migrate", "deploy"]
