FROM node:22-bookworm-slim
WORKDIR /workspace
RUN corepack enable
COPY blockchain blockchain
COPY contracts contracts
WORKDIR /workspace/blockchain
RUN pnpm install --ignore-workspace --no-lockfile
EXPOSE 8545
CMD ["pnpm", "run", "node"]