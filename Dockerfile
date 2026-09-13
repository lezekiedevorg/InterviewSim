# syntax=docker/dockerfile:1.7
# ───────────────────────────────────────────────────────────────────────────
# InterviewSim — Next.js 16 en sortie « standalone ».
#
# Trois étapes : dépendances mises en cache, compilation, puis une image
# d'exécution minimale. Le résultat contient seulement server.js, les
# dépendances d'exécution, les fichiers statiques et public/.
#
# Prérequis, tous les deux présents dans le dépôt :
#   - next.config.ts déclare output: "standalone"
#   - app/api/health/route.ts est un gestionnaire sans dépendance
# ───────────────────────────────────────────────────────────────────────────

# ── Étape 1 : dépendances ────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app
# python3 + build-essential : certains paquets natifs compilent au postinstall.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 build-essential ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# `npm ci` et non `npm install` : on veut exactement le lockfile.
RUN npm ci --no-audit --no-fund

# ── Étape 2 : compilation ────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Les polices Google sont récupérées ici : le build a besoin du réseau.
RUN npm run build

# ── Étape 3 : exécution ──────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# curl est nécessaire au HEALTHCHECK ; il n'est pas dans l'image slim.
# On en profite pour créer un utilisateur non privilégié.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
