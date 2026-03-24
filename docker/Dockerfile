FROM node:18-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile --filter server

COPY prisma ./prisma
COPY server ./server

RUN pnpm --filter server build
RUN pnpm prisma generate

# --- runtime stage ---
FROM node:18-alpine AS runner
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile --filter server --prod

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3000 1234

CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm --filter server start"]
