import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./services/prisma.js";
import { sessionPgPool } from "./middleware/session.js";
import { runMaintenance } from "./services/maintenance.js";

const server = app.listen(env.port, () => {
  console.log(`BuildScience API listening on port ${env.port} [${env.nodeEnv}]`);
});

void runMaintenance().catch((error) => console.error("Maintenance xatosi:", error));
const maintenanceTimer = setInterval(() => {
  void runMaintenance().catch((error) => console.error("Maintenance xatosi:", error));
}, 24 * 60 * 60 * 1000);
maintenanceTimer.unref();

// Nginx keepalive (default 60s) dan uzunroq bo'lishi kerak — aks holda 502 xatolar chiqadi.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Graceful shutdown: deploy/restart paytida faol so'rovlar uzilmaydi.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(maintenanceTimer);
  console.log(`${signal} received, shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after 10s timeout.");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
      await sessionPgPool.end();
    } catch (err) {
      console.error("Error during shutdown cleanup:", err);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
