FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/collab/package.json ./services/collab/package.json

RUN npm ci

COPY packages/shared ./packages/shared
COPY services/collab ./services/collab

# @synctext/shared must be built before collab
RUN npm run build -w @synctext/shared \
    && npm run build -w @synctext/collab

# run application without root privileges
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app

USER app

WORKDIR /app/services/collab

EXPOSE 1234

CMD ["node", "dist/server.js"]
