# Stellr Academy Backend - Docker Configuration
# 
# This Dockerfile creates a production-ready container for the NestJS backend
# with optimized build process and security best practices.

# Use Node.js LTS version for stability and security
FROM node:18-alpine AS builder

# Set working directory in container
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - smaller image without dev dependencies
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Install only runtime dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy necessary configuration files
COPY --chown=nestjs:nodejs .env.example .env.example

# Create directories for logs and uploads
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nestjs:nodejs /app/logs /app/uploads

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
                 const options = { hostname: 'localhost', port: 3000, path: '/api/v1/health', timeout: 2000 }; \
                 const req = http.request(options, (res) => { \
                   process.exit(res.statusCode === 200 ? 0 : 1); \
                 }); \
                 req.on('error', () => process.exit(1)); \
                 req.end();"

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/main"]

# Metadata labels for container information
LABEL maintainer="Stellr Academy Team" \
      description="Stellr Academy Backend - Learning Platform API" \
      version="1.0.0" \
      org.opencontainers.image.source="https://github.com/Uvarsity-Learning-Platform/Stellr-Backend"