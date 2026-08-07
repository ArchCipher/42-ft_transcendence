FROM node:22-alpine

WORKDIR /app

# install dependencies from the lockfile
COPY package.json package-lock.json ./
RUN npm ci

# copy and build the next.js application
COPY . .
RUN npm run build

ENV NODE_ENV=production

# run application without root privileges
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app

USER app

EXPOSE 3000

CMD ["npm", "run", "start"]
