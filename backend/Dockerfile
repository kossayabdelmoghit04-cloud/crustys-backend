# ==========================================
# STAGE 1: Build & Compile
# ==========================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install open-ssl for Prisma Client compatibility in Alpine
RUN apk add --no-cache openssl

# Copy package configurations
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for tsc compiler)
RUN npm ci

# Generate Prisma Client (crucial for TypeScript compilation)
RUN npx prisma generate

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript to JavaScript (build script compiles to /dist)
RUN npm run build

# Remove devDependencies to minimize final image size, keeping only production modules
RUN npm prune --production

# ==========================================
# STAGE 2: Production Runtime Environment
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies (OpenSSL is required for Prisma to talk to PostgreSQL)
RUN apk add --no-cache openssl tini

# Set node environment
ENV NODE_ENV=production
ENV PORT=5000

# Run container with tini to handle PID 1 zombie processes cleanly
ENTRYPOINT ["/sbin/tini", "--"]

# Copy compiled code and production modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 5000

# Create a non-privileged system user for security hardening
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Execute migrations and start the application
# Note: Using "npx prisma migrate deploy" ensures pending migrations are run before start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
