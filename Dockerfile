# Production Multi-Stage Dockerfile for AlphaQuant AI using Bun
FROM oven/bun:1-alpine AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src/server ./src/server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/src/shared ./src/shared
COPY --from=builder /app/src/utils ./src/utils
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["bun", "run", "server.ts"]
