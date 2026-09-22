FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# copy workspace manifests first so this layer stays cached
# as long as dependencies don't change
COPY package.json package-lock.json ./
COPY synctext/package.json ./synctext/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm ci

COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY synctext ./synctext

# @synctext/db, @synctext/shared must be built before synctext, which imports it
RUN npm run build -w @synctext/db
RUN npm run build -w @synctext/shared
RUN npm run build -w synctext

# ---- runtime image ----
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
# Docker sets HOSTNAME to the container id by default, which the Next.js
# standalone server then binds to instead of all interfaces
ENV HOSTNAME=0.0.0.0

# run application without root privileges
RUN addgroup -S app && adduser -S app -G app

# the standalone output mirrors the workspace layout relative to
# outputFileTracingRoot, so its contents map directly onto /app
COPY --from=builder /app/synctext/.next/standalone ./
COPY --from=builder /app/synctext/public ./synctext/public
COPY --from=builder /app/synctext/.next/static ./synctext/.next/static

RUN chown -R app:app /app

USER app

EXPOSE 3000

CMD ["node", "synctext/server.js"]
