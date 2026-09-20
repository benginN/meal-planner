import { db } from './db.js';
import { toBaseUnit, CATEGORIES } from '../shared/format.js';

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

// Scales every planned recipe's ingredients by servings and sums them per ingredient.
export function buildShoppingList(profileId, week) {
  const rows = db
    .prepare(
      `SELECT i.id, i.name, i.name_en, i.name_de, i.category, i.is_staple, ri.amount, ri.unit,
              p.servings / r.base_servings AS factor, r.id AS recipe_id
       FROM plan_entries p
       JOIN recipes r ON r.id = p.recipe_id
       JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE p.profile_id = ? AND p.week_start = ?`
    )
    .all(profileId, week);

  const state = new Map(
    db
      .prepare('SELECT ingredient_id, checked, excluded FROM shopping_state WHERE profile_id = ? AND week_start = ?')
      .all(profileId, week)
      .map((s) => [s.ingredient_id, s])
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
        checked: !!s?.checked,
        excluded: !!s?.excluded,
        totals: new Map(),
        unmeasured: false,
        recipes: new Set(),
      };
      items.set(row.id, item);
    }
    item.recipes.add(row.recipe_id);
    if (row.amount == null) {
      item.unmeasured = true;
    } else {
      const base = toBaseUnit(row.amount * row.factor, row.unit);
      item.totals.set(base.unit, (item.totals.get(base.unit) || 0) + base.amount);
    }
  }

  const list = [...items.values()].map(({ totals, unmeasured, recipes, ...item }) => ({
    ...item,
    // Units that cannot be converted into each other ("2 pc + 200 g") are returned separately; the UI shows them side by side.
    amounts: [...totals].map(([unit, amount]) => ({ amount, unit })),
    recipe_ids: [...recipes],
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

export function setShoppingState(profileId, week, ingredientId, patch) {
  db.prepare(
    `INSERT INTO shopping_state (profile_id, week_start, ingredient_id) VALUES (?, ?, ?)
     ON CONFLICT DO NOTHING`
  ).run(profileId, week, ingredientId);
  for (const field of ['checked', 'excluded']) {
    if (field in patch) {
      db.prepare(
        `UPDATE shopping_state SET ${field} = ? WHERE profile_id = ? AND week_start = ? AND ingredient_id = ?`
      ).run(patch[field] ? 1 : 0, profileId, week, ingredientId);
    }
  }
}
