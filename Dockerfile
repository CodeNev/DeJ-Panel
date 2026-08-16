FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build:railway
RUN cd app && npm ci && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S dej && adduser -S dej -G dej
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/app/dist ./app-dist
RUN mkdir -p /app/data && chown dej:dej /app/data
USER dej
ENV NODE_ENV=production
ENV PORT=8787
ENV DEJ_SQLITE_PATH=/app/data/dej-panel.sqlite
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:8787/health || exit 1
CMD ["node", "dist/railway-server.js"]
