import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DrizzleDb = ReturnType<typeof drizzleD1> | ReturnType<typeof drizzleSqlite>;

export function getDbFromD1(binding: D1Database) {
  return drizzleD1(binding, { schema });
}

export async function getDbFromSqliteFile(filePath: string) {
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}
