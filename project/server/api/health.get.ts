export default defineEventHandler(async (event) => {
  return {
    message: "NextLean API is running",
    version: "1.0.0",
    lean_version: "v4",
  };
});
