import { cleanupInactiveSessions } from "../utils/leanServer";

export default defineNitroPlugin((nitroApp) => {
  console.log("Starting Lean server session cleanup task");

  const cleanupInterval = setInterval(() => {
    cleanupInactiveSessions(30 * 60 * 1000);
  }, 5 * 60 * 1000);

  nitroApp.hooks.hook("close", () => {
    console.log("Stopping Lean server session cleanup task");
    clearInterval(cleanupInterval);
  });
});
