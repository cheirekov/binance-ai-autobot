FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm -C packages/shared build
RUN pnpm -C apps/ui build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173
ENV DATA_DIR=/data
ENV API_BASE_URL=http://api:3000

WORKDIR /app/apps/ui
CMD ["node", "server-dist/index.js"]
