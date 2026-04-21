# Frontend Dockerfile (Next.js standalone). Mirrors the backend Dockerfile
# pattern; same lessons applied (no --ignore-scripts, npm install not ci,
# Debian base instead of Alpine to dodge the npm 10.x build hang we saw on
# the prod box).
ARG NODE_VERSION=20-bookworm-slim

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd -r appendpage && useradd -r -g appendpage -s /usr/sbin/nologin appendpage
COPY --from=build --chown=appendpage:appendpage /app/.next/standalone /app/
COPY --from=build --chown=appendpage:appendpage /app/.next/static /app/.next/static
USER appendpage
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
