# ==========================================
# 1. Build React Client (Vite)
# ==========================================
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# ==========================================
# 2. Production Runner (Node + Express + SQLite)
# ==========================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install native compilation dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ gcc --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install server production dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy server source and database
COPY server/ ./server/

# Copy compiled frontend from builder into client/dist
COPY --from=frontend-builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/index.js"]
