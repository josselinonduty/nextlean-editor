# Stage 1: Build
FROM node:22-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm build

# Stage 2: Runtime
FROM node:22-slim

# Install system dependencies for Elan/Lean
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Setup user
USER node
WORKDIR /home/node/app

# Install Elan
ENV ELAN_HOME="/home/node/.elan"
ENV PATH="$ELAN_HOME/bin:$PATH"
# Install elan and default toolchain to none
RUN curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh -s -- -y --default-toolchain none

# Install specific Lean version
# We copy just the toolchain file first to leverage Docker cache for the heavy download
COPY --chown=node:node lean_project/lean-toolchain ./lean_project/lean-toolchain
RUN cd lean_project && elan toolchain install $(cat lean-toolchain) && elan default $(cat lean-toolchain)

# Copy built application
COPY --from=builder --chown=node:node /app/.output ./.output

# Copy lean_project source
COPY --chown=node:node lean_project ./lean_project

# Expose port
EXPOSE 3000

# Environment variables
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

# Run
CMD ["node", ".output/server/index.mjs"]
