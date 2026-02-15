FROM oven/bun:1.3.6

WORKDIR /app

# Install dependencies based on workspace manifests for better layer caching
COPY package.json bun.lock pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/server/package.json apps/server/
COPY packages/api/package.json packages/api/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/config/package.json packages/config/

RUN bun install --no-save

# Copy source after installing deps
COPY apps apps
COPY packages packages

# Build the API server
RUN cd apps/server && bun run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "cd apps/server && bun run start"]
