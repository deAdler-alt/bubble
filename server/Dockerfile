# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────
# Stage 1: builder — install all deps + tsc → dist/
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Backend ma własny package.json z pełnym zestawem deps —
# traktujemy go jak samodzielny projekt (bez workspace overhead).
COPY server/package.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund

COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: runner — tylko prod deps + dist
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Re-install bez devDeps (mniejszy image).
COPY server/package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev --no-audit --no-fund --ignore-scripts \
    && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3001
# Domyślny user `node` z node:alpine — nie root.
USER node

# Healthcheck używa wbudowanego `node` (alpine nie ma curl/wget by default w userland).
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))" || exit 1

CMD ["node", "dist/index.js"]
