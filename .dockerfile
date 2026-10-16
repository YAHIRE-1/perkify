FROM oven/bun:1
WORKDIR /app

RUN apt-get update && apt-get install -y curl ca-certificates \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs \
 && corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=server...

ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "--filter", "server", "start"]