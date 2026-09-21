import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SLOTS } from '../shared/format.js';

const DATA_DIR = process.env.DATA_DIR || '/data';
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, 'yemek.db'));

const had = (table) =>
  !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
// Read before the schema below creates it: tells a fresh install from one that has to be migrated.
const hadBought = had('shopping_bought');
const hadState = had('shopping_state');

// The slot list lives in shared/format.js; the CHECK constraint is derived from it so that adding a
// meal there cannot leave the table behind.
const SLOT_CHECK = `CHECK (slot IN (${SLOTS.map((s) => `'${s.id}'`).join(', ')}))`;

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
    slot TEXT NOT NULL ${SLOT_CHECK},
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

  -- What is already in the basket, held at the finest grain there is: one planned meal's share of one
  -- ingredient. The list can be grouped by aisle, per dish or per day, and those are three views of
  -- the same shopping trip — so a tick is never stored against a view. Ticking a row marks every
  -- share it covers, and each view's box and amount are the roll-up of the shares under it: tick
  -- 500 g of blueberries in the aisle view and both days go with it; tick Monday's 250 g and the
  -- aisle row is left holding 250 g. The entry reference cascades, so clearing a week or dropping a
  -- meal takes its shares with it and a recycled plan id cannot inherit an old tick.
  CREATE TABLE IF NOT EXISTS shopping_bought (
    entry_id INTEGER NOT NULL REFERENCES plan_entries(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, ingredient_id)
  );

  CREATE TABLE IF NOT EXISTS shopping_manual (
    id INTEGER PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    text TEXT NOT NULL,
    checked INTEGER NOT NULL DEFAULT 0
  );

  -- Collections are the cook's own shelves ("Sevdiklerim", "Hızlı"): free-form, unlike a recipe's
  -- category (what the dish is) and its tags (what it is made of). Recipes are shared between
  -- profiles, so collections are too.
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS recipe_collections (
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, collection_id)
  );
`);

// Columns added later: create them if an existing database lacks them.
// When a translation column (_en/_de) is empty the UI falls back to the base (Turkish) column.
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

// Meal slots have been added after releases (breakfast, later the afternoon snack). SQLite cannot
// alter a CHECK constraint in place, so a database whose plan table predates a slot gets rebuilt once.
// Rows keep their ids, but shopping_bought references them: foreign keys are switched off for the
// rebuild (SQLite's own recipe for this) so the DROP does not cascade the basket away.
const planSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'plan_entries'").get().sql;
if (SLOTS.some((s) => !planSql.includes(`'${s.id}'`))) {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE plan_entries_new (
        id INTEGER PRIMARY KEY,
        profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        week_start TEXT NOT NULL,
        day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
        slot TEXT NOT NULL ${SLOT_CHECK},
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        servings REAL NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO plan_entries_new (id, profile_id, week_start, day, slot, recipe_id, servings, position)
        SELECT id, profile_id, week_start, day, slot, recipe_id, servings, position FROM plan_entries;
      DROP TABLE plan_entries;
      ALTER TABLE plan_entries_new RENAME TO plan_entries;
      CREATE INDEX IF NOT EXISTS idx_plan_week ON plan_entries(profile_id, week_start);
    `);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  db.exec('PRAGMA foreign_keys = ON');
}

// Ticks used to be stored per ingredient for the whole week (shopping_state.checked), and briefly per
// view (shopping_scope_state). Both are replaced by the per-share table: a week-wide tick meant every
// share of that ingredient was bought, so that is what it becomes. Runs once, when the new table is
// first created.
if (!hadBought && hadState) {
  const moved = db
    .prepare(
      `INSERT OR IGNORE INTO shopping_bought (entry_id, ingredient_id)
       SELECT p.id, s.ingredient_id
       FROM shopping_state s
       JOIN plan_entries p ON p.profile_id = s.profile_id AND p.week_start = s.week_start
       JOIN recipe_ingredients ri ON ri.recipe_id = p.recipe_id AND ri.ingredient_id = s.ingredient_id
       WHERE s.checked = 1`
    )
    .run();
  if (Number(moved.changes) > 0) console.log(`Shopping ticks migrated: ${moved.changes} share(s)`);
}
if (had('shopping_scope_state')) db.exec('DROP TABLE shopping_scope_state');

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
