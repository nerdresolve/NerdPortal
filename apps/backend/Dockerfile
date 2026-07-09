FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++
WORKDIR /repo/apps/backend

FROM base AS deps
COPY apps/backend/package*.json ./
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production

RUN apk add --no-cache su-exec \
  && addgroup -S itportal && adduser -S itportal -G itportal

COPY --from=deps /repo/apps/backend/node_modules ./node_modules
COPY apps/backend/. .
COPY database/migrations /repo/database/migrations
COPY database/seeds /repo/database/seeds

RUN mkdir -p /repo/apps/backend/uploads && chown -R itportal:itportal /repo
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
