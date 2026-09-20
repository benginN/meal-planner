import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR || '/data';
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, 'yemek.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#c2410c'
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Ana Yemek',
    base_servings REAL NOT NULL DEFAULT 2,
    duration_min INTEGER,
    tags TEXT NOT NULL DEFAULT '[]',
    instructions TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Diğer',
    is_staple INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ingredient_aliases (
    alias TEXT PRIMARY KEY,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
    amount REAL,
    unit TEXT,
    note TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS plan_entries (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
    slot TEXT NOT NULL CHECK (slot IN ('ogle', 'aksam')),
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    servings REAL NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_plan_week ON plan_entries(profile_id, week_start);

  CREATE TABLE IF NOT EXISTS shopping_state (
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    checked INTEGER NOT NULL DEFAULT 0,
    excluded INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (profile_id, week_start, ingredient_id)
  );

  CREATE TABLE IF NOT EXISTS shopping_manual (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    text TEXT NOT NULL,
    checked INTEGER NOT NULL DEFAULT 0
  );
`);

// Sonradan eklenen sütunlar: mevcut veritabanlarında yoksa ekle.
// Çeviri sütunları (_en/_de) boşsa arayüz Türkçe asıl sütuna düşer.
const ADDED_COLUMNS = {
  recipes: {
    kcal: 'REAL', protein_g: 'REAL', carbs_g: 'REAL', fat_g: 'REAL',
    name_en: 'TEXT', name_de: 'TEXT', instructions_en: 'TEXT', instructions_de: 'TEXT', notes_en: 'TEXT', notes_de: 'TEXT',
  },
  ingredients: { name_en: 'TEXT', name_de: 'TEXT' },
  recipe_ingredients: { note_en: 'TEXT', note_de: 'TEXT' },
};
for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [column, type] of Object.entries(columns)) {
    if (!existing.has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

if (db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n === 0) {
  db.prepare('INSERT INTO profiles (name, color) VALUES (?, ?)').run('Ortak', '#c2410c');
}

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
