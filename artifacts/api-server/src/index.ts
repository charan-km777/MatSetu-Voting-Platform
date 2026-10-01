import { createApp } from "./app";
import { logger } from "./lib/logger";
import { createMatSetuRepository } from "./matsetu-store";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  const repository = await createMatSetuRepository();
  const app = createApp(repository);
  const server = app.listen(port, () => {
    logger.info(
      { port, persistence: process.env["MONGODB_URI"] ? "mongodb" : "memory" },
      "Server listening",
    );
  });

  server.on("error", async (error) => {
    logger.error({ err: error }, "Error listening on port");
    await repository.close();
    process.exit(1);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down server");
    await repository.close();
    server.close(() => process.exit(0));
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

start().catch((error: unknown) => {
  logger.error({ err: error }, "Server startup failed");
  process.exit(1);
});