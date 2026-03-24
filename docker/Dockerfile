FROM node:18-alpine AS base
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-workspace.yaml* ./
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile --filter server

COPY prisma ./prisma
COPY server ./server

RUN pnpm --filter server build
RUN pnpm prisma generate

EXPOSE 3000 1234

CMD ["pnpm", "--filter", "server", "start"]
