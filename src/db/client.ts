import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type DrizzleDb = ReturnType<typeof drizzleD1> | ReturnType<typeof drizzleSqlite>;

export function getDbFromD1(binding: D1Database) {
  return drizzleD1(binding, { schema });
}

export async function getDbFromSqliteFile(filePath: string) {
  const Database = (await import("better-sqlite3")).default;
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  return drizzleSqlite(sqlite, { schema });
}
