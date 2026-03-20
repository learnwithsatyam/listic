FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY apps/api/ ./
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
