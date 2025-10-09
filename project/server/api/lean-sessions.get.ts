import { getAllActiveSessions } from "../utils/leanServer";

export default defineEventHandler(async (event) => {
  const sessions = getAllActiveSessions();

  return {
    sessions,
    count: sessions.length,
  };
});
