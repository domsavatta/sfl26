// Loads .env / .env.local the same way Next.js does, for the database tests.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true, {
  info: () => {},
  error: console.error,
});
