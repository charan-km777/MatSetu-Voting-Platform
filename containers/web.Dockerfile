FROM node:22-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/matsetu/package.json artifacts/matsetu/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
RUN pnpm install --frozen-lockfile
COPY artifacts/matsetu artifacts/matsetu
COPY lib/api-client-react lib/api-client-react
COPY lib/api-zod lib/api-zod
RUN PORT=4173 BASE_PATH=/ pnpm --filter @workspace/matsetu run build

FROM nginx:1.27-alpine
COPY --from=build /workspace/artifacts/matsetu/dist/public /usr/share/nginx/html
COPY containers/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80