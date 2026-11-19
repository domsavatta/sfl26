/**
 * Database test setup: each test runs in a transaction that is always rolled
 * back, and `query` from "db" (used by the models) runs inside it.
 */
import sql from "mssql";
import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { beginTestTransaction, rollbackTestTransaction } from "./db";

vi.mock("db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("db")>();
  const { testRequest } = await import("./db");
  return {
    ...actual,
    query: (text: string, params: import("db").QueryParams = {}) =>
      actual.addParams(testRequest(), params).query(text),
  };
});

beforeEach(async () => {
  const { pool } = await vi.importActual<typeof import("db")>("db");
  await beginTestTransaction(await pool());
});

afterEach(rollbackTestTransaction);

afterAll(() => sql.close());
