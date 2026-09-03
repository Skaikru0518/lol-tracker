# ---------- Build Stage ----------
FROM node:22-alpine AS builder

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app


# Copy everything (node_modules and .next excluded via .dockerignore)
COPY . .

# Install dependencies and build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    CI=true pnpm install --ignore-scripts --frozen-lockfile
RUN pnpm prisma generate 
RUN pnpm run build

# ---------- Production Stage ----------
FROM node:22-alpine

# Create non-root user first
RUN addgroup --system --gid 84977 nodejs && \
    adduser --system --uid 84977 nextjs

WORKDIR /app
RUN chown nextjs:nodejs /app

# Switch to non-root user before copying
USER nextjs

# Copy Next.js standalone build output with correct ownership
COPY --chown=nextjs:nodejs --from=builder /app/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start Next.js standalone server directly with node
CMD ["node", "server.js"]
