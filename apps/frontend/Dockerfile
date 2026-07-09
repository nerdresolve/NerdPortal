FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup -S itportal && adduser -S itportal -G itportal

COPY --from=builder /app/public ./public
COPY --from=builder --chown=itportal:itportal /app/.next/standalone ./
COPY --from=builder --chown=itportal:itportal /app/.next/static ./.next/static

USER itportal

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
