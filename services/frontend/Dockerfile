# Placeholder

# React/Vue/other frontend
FROM node:22-alpine AS build
WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .
# RUN npm run build

# Build server that serves static files
FROM nginx:alpine
# COPY --from=build /app/dist /usr/share/nginx/html
# index.html placeholder
RUN echo '<!doctype html><title>SyncText</title><h1>SyncText</h1>' > /usr/share/nginx/html/index.html
EXPOSE 80
