FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/api-spec/package.json lib/api-spec/package.json
COPY lib/db/package.json lib/db/package.json
RUN pnpm install --frozen-lockfile
COPY artifacts/api-server artifacts/api-server
COPY lib/api-zod lib/api-zod
COPY lib/api-spec lib/api-spec
COPY lib/db lib/db
RUN pnpm --filter @workspace/api-server run build

FROM node:22-bookworm-slim
WORKDIR /workspace
RUN corepack enable
COPY --from=build /workspace /workspace
ENV NODE_ENV=production
EXPOSE 5000
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]