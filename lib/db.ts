import "server-only";

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "qiosk.db");
  db = new Database(file);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
  `);

  return db;
}

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  created_at: number;
};

export type TemplateRow = {
  id: number;
  name: string;
  width: number;
  height: number;
  description: string;
  created_at: number;
};

export function countUsers(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM users")
    .get() as { c: number };
  return row.c;
}

export function getUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare(
      "SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?",
    )
    .get(username) as UserRow | undefined;
}

/** First row with role admin (lowest id). */
export function getAdminUser(): UserRow | undefined {
  return getDb()
    .prepare(
      "SELECT id, username, password_hash, role, created_at FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1",
    )
    .get() as UserRow | undefined;
}

export function getTemplates(): TemplateRow[] {
  return getDb()
    .prepare(
      "SELECT id, name, width, height, description, created_at FROM templates ORDER BY created_at DESC, id DESC",
    )
    .all() as TemplateRow[];
}

export function insertTemplate(input: {
  name: string;
  width: number;
  height: number;
  description: string;
}): number {
  const createdAt = Date.now();
  const result = getDb()
    .prepare(
      "INSERT INTO templates (name, width, height, description, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(
      input.name,
      input.width,
      input.height,
      input.description,
      createdAt,
    );
  return Number(result.lastInsertRowid);
}

export function insertUser(
  username: string,
  passwordHash: string,
  role: string,
): number {
  const createdAt = Date.now();
  const result = getDb()
    .prepare(
      "INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(username, passwordHash, role, createdAt);
  return Number(result.lastInsertRowid);
}
