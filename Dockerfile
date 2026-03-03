# ---- Build API Stage ----
FROM node:22-alpine AS api-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npx prisma generate

COPY src ./src/
RUN npm run build

# ---- Build Frontend Stage ----
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
ARG VITE_POLLY_API_KEY
ENV VITE_POLLY_API_KEY=$VITE_POLLY_API_KEY
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=api-builder /app/dist ./dist/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist/
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY entrypoint.sh ./

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["./entrypoint.sh"]
