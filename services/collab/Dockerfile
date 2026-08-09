FROM node:22-alpine AS builder

WORKDIR /app

# copy workspace manifests first so this layer stays cached
# as long as dependencies don't change
# (synctext/package.json is deliberately not copied here: this image
# only needs the collab service and the db package it depends on)
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY services/collab/package.json ./services/collab/package.json
RUN npm ci

COPY packages/db ./packages/db
COPY services/collab ./services/collab

# @synctext/db must be built before collab, which imports it
RUN npm run build -w @synctext/db
RUN npm run build -w @synctext/collab

# ---- runtime image ----
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# same manifests as the builder stage, but installed without devDependencies
# (typescript, @types/*) so the runtime image doesn't ship the compiler
COPY package.json package-lock.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY services/collab/package.json ./services/collab/package.json
RUN npm ci --omit=dev

COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/services/collab/dist ./services/collab/dist

# run application without root privileges
RUN addgroup -S app && adduser -S app -G app
RUN chown -R app:app /app
USER app

WORKDIR /app/services/collab

EXPOSE 1234

CMD ["node", "dist/server.js"]
