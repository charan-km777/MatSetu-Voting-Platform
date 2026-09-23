import app from "./app";
import { logger } from "./lib/logger";
import { matsetuStore } from "./matsetu-store";

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

const start = async () => {
  try {
    await matsetuStore.ready();
  } catch (error) {
    logger.error({ err: error }, "Persistent data store initialization failed");
    process.exit(1);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port, store: matsetuStore.mode }, "Server listening");
  });
};

void start();
