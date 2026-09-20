FROM node:22-bookworm-slim
WORKDIR /workspace/blockchain
RUN corepack enable
COPY blockchain/package.json blockchain/package.json
COPY contracts contracts
RUN pnpm install --no-frozen-lockfile
COPY blockchain blockchain
EXPOSE 8545
CMD ["pnpm", "run", "node"]