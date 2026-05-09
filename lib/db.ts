import "server-only";

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

import {
  createEmptyTemplateDocument,
  parseTemplateDocument,
  type TemplateDocument,
} from "@/lib/template-document";

let db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "qiosk.db");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

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

    CREATE TABLE IF NOT EXISTS template_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('draft', 'published')),
      version INTEGER,
      document TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      published_at INTEGER,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS template_versions_one_draft
      ON template_versions(template_id)
      WHERE kind = 'draft';

    CREATE UNIQUE INDEX IF NOT EXISTS template_versions_published_version
      ON template_versions(template_id, version)
      WHERE kind = 'published';
  `);

  seedMissingDraftVersions(db);

  return db;
}

function defaultTemplateDocumentJson(): string {
  return JSON.stringify(createEmptyTemplateDocument());
}

function seedMissingDraftVersions(database: Database.Database) {
  const now = Date.now();
  database
    .prepare(
      `
      INSERT INTO template_versions (
        template_id,
        kind,
        version,
        document,
        created_at,
        published_at
      )
      SELECT
        templates.id,
        'draft',
        NULL,
        ?,
        ?,
        NULL
      FROM templates
      WHERE NOT EXISTS (
        SELECT 1
        FROM template_versions
        WHERE template_versions.template_id = templates.id
          AND template_versions.kind = 'draft'
      )
      `,
    )
    .run(defaultTemplateDocumentJson(), now);
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

export type TemplateVersionRow = {
  id: number;
  template_id: number;
  kind: "draft" | "published";
  version: number | null;
  document: string;
  created_at: number;
  published_at: number | null;
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

export function getTemplateById(id: number): TemplateRow | undefined {
  return getDb()
    .prepare(
      "SELECT id, name, width, height, description, created_at FROM templates WHERE id = ?",
    )
    .get(id) as TemplateRow | undefined;
}

export function getDraftTemplateVersion(
  templateId: number,
): TemplateVersionRow | undefined {
  return getDb()
    .prepare(
      "SELECT id, template_id, kind, version, document, created_at, published_at FROM template_versions WHERE template_id = ? AND kind = 'draft' LIMIT 1",
    )
    .get(templateId) as TemplateVersionRow | undefined;
}

export function getDraftDocument(templateId: number): TemplateDocument {
  const draft = getDraftTemplateVersion(templateId);
  if (draft) return parseTemplateDocument(draft.document);

  const template = getTemplateById(templateId);
  if (!template) return createEmptyTemplateDocument();

  ensureDraftVersion(templateId);
  return createEmptyTemplateDocument();
}

export function getPublishedVersions(templateId: number): TemplateVersionRow[] {
  return getDb()
    .prepare(
      "SELECT id, template_id, kind, version, document, created_at, published_at FROM template_versions WHERE template_id = ? AND kind = 'published' ORDER BY version DESC, id DESC",
    )
    .all(templateId) as TemplateVersionRow[];
}

export function insertTemplate(input: {
  name: string;
  width: number;
  height: number;
  description: string;
}): number {
  const database = getDb();
  const createdAt = Date.now();

  return database.transaction(() => {
    const result = database
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

    const templateId = Number(result.lastInsertRowid);
    database
      .prepare(
        "INSERT INTO template_versions (template_id, kind, version, document, created_at, published_at) VALUES (?, 'draft', NULL, ?, ?, NULL)",
      )
      .run(templateId, defaultTemplateDocumentJson(), createdAt);

    return templateId;
  })();
}

export function upsertDraftDocument(
  templateId: number,
  document: TemplateDocument,
): void {
  const database = getDb();
  const serialized = JSON.stringify(document);
  const now = Date.now();
  const result = database
    .prepare(
      "UPDATE template_versions SET document = ? WHERE template_id = ? AND kind = 'draft'",
    )
    .run(serialized, templateId);

  if (result.changes === 0) {
    database
      .prepare(
        "INSERT INTO template_versions (template_id, kind, version, document, created_at, published_at) VALUES (?, 'draft', NULL, ?, ?, NULL)",
      )
      .run(templateId, serialized, now);
  }
}

export function publishTemplate(templateId: number): number {
  const database = getDb();
  return database.transaction(() => {
    const draft = getDraftTemplateVersion(templateId);
    if (!draft) throw new Error("Draft version not found.");

    const nextVersionRow = database
      .prepare(
        "SELECT COALESCE(MAX(version), 0) + 1 AS version FROM template_versions WHERE template_id = ? AND kind = 'published'",
      )
      .get(templateId) as { version: number };

    const now = Date.now();
    const result = database
      .prepare(
        "INSERT INTO template_versions (template_id, kind, version, document, created_at, published_at) VALUES (?, 'published', ?, ?, ?, ?)",
      )
      .run(templateId, nextVersionRow.version, draft.document, now, now);

    return Number(result.lastInsertRowid);
  })();
}

export function restorePublishedToDraft(
  templateId: number,
  versionId: number,
): void {
  const database = getDb();
  database.transaction(() => {
    const published = database
      .prepare(
        "SELECT document FROM template_versions WHERE id = ? AND template_id = ? AND kind = 'published'",
      )
      .get(versionId, templateId) as { document: string } | undefined;

    if (!published) throw new Error("Published version not found.");

    const serialized = JSON.stringify(parseTemplateDocument(published.document));
    const result = database
      .prepare(
        "UPDATE template_versions SET document = ? WHERE template_id = ? AND kind = 'draft'",
      )
      .run(serialized, templateId);

    if (result.changes === 0) {
      database
        .prepare(
          "INSERT INTO template_versions (template_id, kind, version, document, created_at, published_at) VALUES (?, 'draft', NULL, ?, ?, NULL)",
        )
        .run(templateId, serialized, Date.now());
    }
  })();
}

function ensureDraftVersion(templateId: number): void {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO template_versions (template_id, kind, version, document, created_at, published_at) VALUES (?, 'draft', NULL, ?, ?, NULL)",
    )
    .run(templateId, defaultTemplateDocumentJson(), Date.now());
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
