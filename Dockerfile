# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────
# Stage 1: builder — kompilacja Vite/React do dist/
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy lockfiles + workspace placeholder so `npm ci` sees całą strukturę.
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install (włącznie z workspace `server` żeby lockfile się zgadzał).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Copy frontend sources only — server src nie jest potrzebny do bundla.
COPY tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js index.html ./
COPY public ./public
COPY src ./src

# tsc --noEmit + vite build
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: runner — nginx serwujący dist/ + proxy /api → server:3001
# ─────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Custom config: SPA fallback + /api proxy.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Statics
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
