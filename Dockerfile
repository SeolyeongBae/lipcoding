# syntax=docker/dockerfile:1

# ---- Builder ----------------------------------------------------------------
# Debian-based (glibc) image so the dynamically-spawned @github/copilot native
# binary (linux-x64, glibc) resolves and runs at runtime.
FROM node:22-slim AS builder

# pnpm via corepack
RUN corepack enable

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Allow lifecycle scripts (sharp, unrs-resolver) and use the hoisted linker so
# the Next.js standalone bundle ships real files instead of pnpm symlinks.
RUN pnpm install --frozen-lockfile

# Build the Next.js standalone output.
COPY . .
RUN pnpm build

# Assemble the standalone runtime tree at /app/standalone:
#   - server.js + traced node_modules (from Next standalone output)
#   - static assets and public files
#   - the @github Copilot CLI, which Next's tracer cannot see because it is
#     spawned dynamically at runtime.
RUN cp -r public .next/standalone/public \
 && cp -r .next/static .next/standalone/.next/static \
 && mkdir -p .next/standalone/node_modules/@github \
 && cp -r node_modules/@github/. .next/standalone/node_modules/@github/ \
 && test -f .next/standalone/server.js \
 && test -f .next/standalone/node_modules/@github/copilot/npm-loader.js

# ---- Runner -----------------------------------------------------------------
FROM node:22-slim AS runner

ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

WORKDIR /app

# Run as the non-root user that ships with the node image.
COPY --from=builder --chown=node:node /app/.next/standalone ./

USER node

EXPOSE 8080

CMD ["node", "server.js"]
