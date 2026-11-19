import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        // npm test: no database needed.
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, "**/*.db.test.ts"],
          environment: "node",
        },
      },
      {
        // npm run test:db: uses the database in .env, inside transactions
        // that are always rolled back.
        extends: true,
        test: {
          name: "db",
          include: ["src/**/*.db.test.ts", "sql/**/*.db.test.ts"],
          setupFiles: ["test/setup-env.ts", "test/setup-db.ts"],
          environment: "node",
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
