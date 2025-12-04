# ============================
# 1. Build stage
# ============================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first (better layer cache)
COPY package*.json ./

# If you use pnpm or yarn, adjust accordingly
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript → JavaScript
RUN npm run build

# ============================
# 2. Runtime stage
# ============================
FROM node:20-alpine

WORKDIR /app

# Copy only what we need for runtime
COPY package*.json ./

RUN npm install --only=dev

# Copy built JS from builder
COPY --from=builder /app/dist ./dist

# Env defaults (can override in docker-compose)
ENV NODE_ENV=dev
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
