# Multi-stage Docker build for optimized caching and smaller final image
# Stage 1: Dependencies - Install npm packages (cached unless package*.json changes)
# Stage 2: Builder - Build the application
# Stage 3: Runner - Final minimal production image

# Dependencies stage
FROM node:20.18-alpine AS dependencies

# Install dependencies for building
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy prisma schema (needed for postinstall script)
COPY prisma ./prisma/

# Install dependencies (cached unless package*.json changes)
RUN npm ci

# Build stage
FROM node:20.18-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files and installed dependencies from dependencies stage
COPY package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npm run db:generate

# Copy source code last (most likely to change)
COPY . .

# Accept build arguments for build-time variables
# Using ARG instead of ENV prevents secrets from being baked into the image layers
ARG SKIP_ENV_VALIDATION=true
ARG NODE_ENV=production
ARG DATABASE_URL="postgresql://placeholder:password@localhost:5432/placeholder"
ARG NEXTAUTH_SECRET="placeholder-secret-for-build"
ARG NEXTAUTH_URL="http://localhost:3000"

# Use build arguments as environment variables only during build
# These ENV values are only available during the build stage and won't persist in the final image
ENV SKIP_ENV_VALIDATION=$SKIP_ENV_VALIDATION
ENV NODE_ENV=$NODE_ENV
ENV DATABASE_URL=$DATABASE_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL

# Build the application
RUN npm run build:ci

# Production stage
FROM node:20.18-alpine AS runner

WORKDIR /app

# Install production dependencies
RUN apk add --no-cache libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Change ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "server.js"]