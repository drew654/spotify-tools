# ---------- Build Stage ----------
FROM node:20-slim AS builder
WORKDIR /app

# Install native build tools needed by better-sqlite3 and lightningcss
RUN apt-get update && apt-get install -y python3 make g++ build-essential libsqlite3-dev && rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (including devDeps) so lightningcss/tailwindcss
# are present for the Next.js build step that compiles CSS.
COPY package*.json ./
RUN npm ci

# Rebuild native modules from source for the Linux target
RUN npm rebuild better-sqlite3 --build-from-source
RUN npm rebuild lightningcss --build-from-source

# Copy source and build the Next.js app
COPY . .
RUN npm run build

# ---------- Runtime Stage ----------
FROM node:20-slim AS runtime
WORKDIR /app

# Install sqlite3 runtime library needed by better-sqlite3
RUN apt-get update && apt-get install -y libsqlite3-dev && rm -rf /var/lib/apt/lists/*

# Copy the built app and all node_modules (with Linux-native binaries) from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/instrumentation*.js ./
COPY --from=builder /app/instrumentation*.ts ./

EXPOSE 3000

CMD ["npm", "run", "start"]
