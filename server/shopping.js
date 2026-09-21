import { db, transaction } from './db.js';
import { toBaseUnit, CATEGORIES, SLOTS } from '../shared/format.js';

export function getPlan(profileId, week) {
  return db
    .prepare(
      `SELECT p.id, p.day, p.slot, p.recipe_id, p.servings, p.position, r.name AS recipe_name, r.name_en AS recipe_name_en, r.name_de AS recipe_name_de,
              r.base_servings, r.kcal, r.protein_g
       FROM plan_entries p JOIN recipes r ON r.id = p.recipe_id
       WHERE p.profile_id = ? AND p.week_start = ?
       ORDER BY p.day, p.slot, p.position, p.id`
    )
    .all(profileId, week);
}

const SLOT_ORDER = Object.fromEntries(SLOTS.map((s, i) => [s.id, i]));
const amountList = (totals) => [...totals].map(([unit, amount]) => ({ amount, unit }));

// Scales every planned recipe's ingredients by servings and sums them per ingredient.
export function buildShoppingList(profileId, week) {
  const rows = db
    .prepare(
      `SELECT i.id, i.name, i.name_en, i.name_de, i.category, i.is_staple, ri.amount, ri.unit,
              p.servings / r.base_servings AS factor, r.id AS recipe_id,
              p.id AS entry_id, p.day, p.slot, p.position
       FROM plan_entries p
       JOIN recipes r ON r.id = p.recipe_id
       JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE p.profile_id = ? AND p.week_start = ?`
    )
    .all(profileId, week);

  const state = new Map(
    db
      .prepare('SELECT ingredient_id, excluded FROM shopping_state WHERE profile_id = ? AND week_start = ?')
      .all(profileId, week)
      .map((s) => [s.ingredient_id, s])
  );

  // What is already in the basket, one planned meal's share at a time.
  const bought = new Set(
    db
      .prepare(
        `SELECT b.entry_id || ':' || b.ingredient_id AS key
         FROM shopping_bought b JOIN plan_entries p ON p.id = b.entry_id
         WHERE p.profile_id = ? AND p.week_start = ?`
      )
      .all(profileId, week)
      .map((r) => r.key)
  );

  const items = new Map();
  for (const row of rows) {
    let item = items.get(row.id);
    if (!item) {
      const s = state.get(row.id);
      item = {
        ingredient_id: row.id,
        name: row.name,
        name_en: row.name_en,
        name_de: row.name_de,
        category: row.category,
        is_staple: !!row.is_staple,
        excluded: !!s?.excluded,
        totals: new Map(),
        unmeasured: false,
        recipes: new Set(),
        // One entry per planned meal that needs this ingredient, so that the UI can regroup the
        // list per meal or per day without asking the server again.
        sources: new Map(),
      };
      items.set(row.id, item);
    }
    item.recipes.add(row.recipe_id);
    let source = item.sources.get(row.entry_id);
    if (!source) {
      source = {
        entry_id: row.entry_id,
        day: row.day,
        slot: row.slot,
        position: row.position,
        recipe_id: row.recipe_id,
        bought: bought.has(`${row.entry_id}:${row.id}`),
        totals: new Map(),
      };
      item.sources.set(row.entry_id, source);
    }
    if (row.amount == null) {
      item.unmeasured = true;
    } else {
      const base = toBaseUnit(row.amount * row.factor, row.unit);
      item.totals.set(base.unit, (item.totals.get(base.unit) || 0) + base.amount);
      source.totals.set(base.unit, (source.totals.get(base.unit) || 0) + base.amount);
    }
  }

  const list = [...items.values()].map(({ totals, unmeasured, recipes, sources, ...item }) => ({
    ...item,
    // Units that cannot be converted into each other ("2 pc + 200 g") are returned separately; the UI shows them side by side.
    amounts: amountList(totals),
    recipe_ids: [...recipes],
    // An ingredient counts as done only once every share of it is in the basket. Callers that show a
    // single line per ingredient (the Glance widget) can keep reading `checked`.
    checked: [...sources.values()].every((s) => s.bought),
    sources: [...sources.values()]
      .sort((a, b) => a.day - b.day || SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.position - b.position || a.entry_id - b.entry_id)
      .map(({ totals: t, ...source }) => ({ ...source, amounts: amountList(t) })),
  }));
  list.sort(
    (a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name, 'tr')
  );

  const manual = db
    .prepare('SELECT id, text, checked FROM shopping_manual WHERE profile_id = ? AND week_start = ? ORDER BY id')
    .all(profileId, week)
    .map((m) => ({ ...m, checked: !!m.checked }));

  return { items: list, manual };
}

// What is still missing of an ingredient: the shares that are not in the basket yet. An item whose
// shares are all bought never reaches here (it counts as done).
export function remainingAmounts(item) {
  const totals = new Map();
  for (const source of item.sources ?? []) {
    if (source.bought) continue;
    for (const a of source.amounts) totals.set(a.unit, (totals.get(a.unit) || 0) + a.amount);
  }
  return amountList(totals);
}

// Ticking a row puts its shares in the basket (or takes them out). The caller names the planned meals
// the row covers, which is what makes the same click mean "the whole week" in the aisle view and
// "just Monday" in the day view.
export function setBought(profileId, week, ingredientId, entryIds, bought) {
  const mine = db
    .prepare(`SELECT id FROM plan_entries WHERE profile_id = ? AND week_start = ?`)
    .all(profileId, week)
    .map((r) => r.id);
  const targets = entryIds.map(Number).filter((id) => mine.includes(id));
  transaction(() => {
    for (const entryId of targets) {
      if (bought) {
        db.prepare('INSERT OR IGNORE INTO shopping_bought (entry_id, ingredient_id) VALUES (?, ?)').run(entryId, ingredientId);
      } else {
        db.prepare('DELETE FROM shopping_bought WHERE entry_id = ? AND ingredient_id = ?').run(entryId, ingredientId);
      }
    }
  });
  return targets.length;
}

// "Have it at home" drops an ingredient for the whole week, so it stays keyed by the week.
export function setExcluded(profileId, week, ingredientId, excluded) {
  db.prepare(
    `INSERT INTO shopping_state (profile_id, week_start, ingredient_id) VALUES (?, ?, ?)
     ON CONFLICT DO NOTHING`
  ).run(profileId, week, ingredientId);
  db.prepare(
    'UPDATE shopping_state SET excluded = ? WHERE profile_id = ? AND week_start = ? AND ingredient_id = ?'
  ).run(excluded ? 1 : 0, profileId, week, ingredientId);
}
