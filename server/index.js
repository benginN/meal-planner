import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { fileURLToPath } from 'node:url';
import { db, transaction } from './db.js';
import {
  listRecipes, getRecipe, createRecipe, updateRecipe, deleteRecipe, importRecipes, loadSeed,
} from './recipes.js';
import { getPlan, buildShoppingList, setShoppingState } from './shopping.js';
import { CATEGORIES, SLOTS, UNIT_LABELS as GLANCE_UNITS, formatAmount, weekStartOf, addDays, isoDate, normalizeName } from '../shared/format.js';

loadSeed(fileURLToPath(new URL('../seed/recipes.json', import.meta.url)));

const app = new Hono();
const api = new Hono();

api.onError((err, c) => {
  const conflict = /UNIQUE/.test(err.message);
  if (!conflict) console.error(err);
  return c.json({ error: conflict ? 'That name is already in use' : err.message }, conflict ? 409 : 400);
});

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
function scope(c, src) {
  const profileId = Number(src.profile ?? src.profile_id);
  const week = String(src.week ?? src.week_start ?? '');
  if (!profileId || !WEEK_RE.test(week)) throw new Error('profile ve week gerekli');
  return { profileId, week };
}

// --- Profiller
api.get('/profiles', (c) => c.json(db.prepare('SELECT * FROM profiles ORDER BY id').all()));
api.post('/profiles', async (c) => {
  const { name, color } = await c.req.json();
  if (!String(name || '').trim()) throw new Error('Profile name is required');
  const res = db.prepare('INSERT INTO profiles (name, color) VALUES (?, ?)').run(name.trim(), color || '#c2410c');
  return c.json({ id: Number(res.lastInsertRowid) }, 201);
});
api.put('/profiles/:id', async (c) => {
  const { name, color } = await c.req.json();
  db.prepare('UPDATE profiles SET name = ?, color = ? WHERE id = ?').run(String(name).trim(), color, Number(c.req.param('id')));
  return c.json({ ok: true });
});
api.delete('/profiles/:id', (c) => {
  if (db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n <= 1) throw new Error('Son profil silinemez');
  db.prepare('DELETE FROM profiles WHERE id = ?').run(Number(c.req.param('id')));
  return c.json({ ok: true });
});

// --- Tarifler
api.get('/recipes', (c) => c.json(listRecipes()));
api.post('/recipes', async (c) => c.json(getRecipe(createRecipe(await c.req.json(), c.req.query('lang'))), 201));
api.put('/recipes/:id', async (c) => {
  const id = Number(c.req.param('id'));
  updateRecipe(id, await c.req.json(), c.req.query('lang'));
  return c.json(getRecipe(id));
});
api.delete('/recipes/:id', (c) => {
  deleteRecipe(Number(c.req.param('id')));
  return c.json({ ok: true });
});
api.post('/import', async (c) => c.json({ added: importRecipes(await c.req.json()) }));

// --- Ingredient catalogue
api.get('/ingredients', (c) => c.json(db.prepare('SELECT * FROM ingredients ORDER BY name').all()));
api.put('/ingredients/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  if ('category' in body) {
    if (!CATEGORIES.includes(body.category)) throw new Error('Invalid category');
    db.prepare('UPDATE ingredients SET category = ? WHERE id = ?').run(body.category, id);
  }
  if ('is_staple' in body) db.prepare('UPDATE ingredients SET is_staple = ? WHERE id = ?').run(body.is_staple ? 1 : 0, id);
  if ('name' in body) db.prepare('UPDATE ingredients SET name = ? WHERE id = ?').run(normalizeName(body.name), id);
  return c.json({ ok: true });
});

// --- Weekly plan
api.get('/plan', (c) => {
  const { profileId, week } = scope(c, c.req.query());
  return c.json(getPlan(profileId, week));
});
api.post('/plan', async (c) => {
  const body = await c.req.json();
  const { profileId, week } = scope(c, body);
  const recipe = db.prepare('SELECT base_servings FROM recipes WHERE id = ?').get(Number(body.recipe_id));
  if (!recipe) throw new Error('Recipe not found');
  if (!SLOTS.some((s) => s.id === body.slot)) throw new Error('Invalid meal slot');
  const res = db
    .prepare(
      `INSERT INTO plan_entries (profile_id, week_start, day, slot, recipe_id, servings, position)
       VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM plan_entries))`
    )
    .run(profileId, week, Number(body.day), body.slot, Number(body.recipe_id), Number(body.servings) || recipe.base_servings);
  return c.json({ id: Number(res.lastInsertRowid) }, 201);
});
api.patch('/plan/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  if ('servings' in body) {
    const servings = Number(body.servings);
    if (!(servings > 0)) throw new Error('Servings must be positive');
    db.prepare('UPDATE plan_entries SET servings = ? WHERE id = ?').run(servings, id);
  }
  if ('day' in body && 'slot' in body) {
    if (!SLOTS.some((s) => s.id === body.slot)) throw new Error('Invalid meal slot');
    db.prepare(
      'UPDATE plan_entries SET day = ?, slot = ?, position = (SELECT COALESCE(MAX(position), 0) + 1 FROM plan_entries) WHERE id = ?'
    ).run(Number(body.day), body.slot, id);
  }
  return c.json({ ok: true });
});
api.delete('/plan/:id', (c) => {
  db.prepare('DELETE FROM plan_entries WHERE id = ?').run(Number(c.req.param('id')));
  return c.json({ ok: true });
});
api.delete('/plan', (c) => {
  const { profileId, week } = scope(c, c.req.query());
  db.prepare('DELETE FROM plan_entries WHERE profile_id = ? AND week_start = ?').run(profileId, week);
  return c.json({ ok: true });
});
// Copies another week's (or another profile's) plan into this week.
api.post('/plan/copy', async (c) => {
  const body = await c.req.json();
  const { profileId, week } = scope(c, body);
  const fromProfile = Number(body.from_profile_id) || profileId;
  if (!WEEK_RE.test(body.from_week)) throw new Error('from_week gerekli');
  const copied = transaction(() =>
    db
      .prepare(
        `INSERT INTO plan_entries (profile_id, week_start, day, slot, recipe_id, servings, position)
         SELECT ?, ?, day, slot, recipe_id, servings, position FROM plan_entries
         WHERE profile_id = ? AND week_start = ?`
      )
      .run(profileId, week, fromProfile, body.from_week)
  );
  return c.json({ copied: Number(copied.changes) });
});
api.get('/weeks', (c) => {
  const profileId = Number(c.req.query('profile'));
  return c.json(
    db
      .prepare(
        'SELECT week_start, COUNT(*) AS meals FROM plan_entries WHERE profile_id = ? GROUP BY week_start ORDER BY week_start DESC'
      )
      .all(profileId)
  );
});

// --- Shopping list
api.get('/shopping', (c) => {
  const { profileId, week } = scope(c, c.req.query());
  return c.json(buildShoppingList(profileId, week));
});
api.put('/shopping/state', async (c) => {
  const body = await c.req.json();
  const { profileId, week } = scope(c, body);
  setShoppingState(profileId, week, Number(body.ingredient_id), body);
  return c.json({ ok: true });
});
api.post('/shopping/manual', async (c) => {
  const body = await c.req.json();
  const { profileId, week } = scope(c, body);
  const text = String(body.text || '').trim();
  if (!text) throw new Error('Metin gerekli');
  const res = db.prepare('INSERT INTO shopping_manual (profile_id, week_start, text) VALUES (?, ?, ?)').run(profileId, week, text);
  return c.json({ id: Number(res.lastInsertRowid) }, 201);
});
api.patch('/shopping/manual/:id', async (c) => {
  const { checked } = await c.req.json();
  db.prepare('UPDATE shopping_manual SET checked = ? WHERE id = ?').run(checked ? 1 : 0, Number(c.req.param('id')));
  return c.json({ ok: true });
});
api.delete('/shopping/manual/:id', (c) => {
  db.prepare('DELETE FROM shopping_manual WHERE id = ?').run(Number(c.req.param('id')));
  return c.json({ ok: true });
});

// --- Summary for the Glance custom-api widget. ?profile=<id or name> (defaults to the first profile), ?lang=tr|en|de.
api.get('/glance', (c) => {
  const lang = ['en', 'de'].includes(c.req.query('lang')) ? c.req.query('lang') : 'tr';
  const pick = (row, field) => (lang !== 'tr' && row[`${field}_${lang}`]) || row[field];
  const unitLabel = (unit) => (lang === 'tr' ? unit : GLANCE_UNITS[unit]?.[lang] ?? unit);
  const q = c.req.query('profile');
  const profile =
    (q && db.prepare('SELECT * FROM profiles WHERE id = ? OR name = ?').get(Number(q) || 0, q)) ||
    db.prepare('SELECT * FROM profiles ORDER BY id LIMIT 1').get();

  const mealsOn = (date) => {
    const week = weekStartOf(date);
    const day = (date.getDay() + 6) % 7;
    const entries = getPlan(profile.id, week).filter((e) => e.day === day);
    return Object.fromEntries(
      SLOTS.map((s) => [s.id, entries.filter((e) => e.slot === s.id).map((e) => pick(e, 'recipe_name')).join(', ')])
    );
  };

  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const week = weekStartOf(today);
  const { items, manual } = buildShoppingList(profile.id, week);
  const visible = [...items.filter((i) => !i.is_staple && !i.excluded), ...manual];
  const remaining = visible.filter((i) => !i.checked);

  return c.json({
    profile: profile.name,
    date: isoDate(today),
    week_start: week,
    week_end: addDays(week, 6),
    today: mealsOn(today),
    tomorrow: mealsOn(tomorrow),
    shopping: {
      total: visible.length,
      remaining: remaining.length,
      items: remaining.slice(0, 15).map((i) =>
        i.text
          ? i.text
          : [i.amounts.map((a) => formatAmount(a.amount, a.unit, { unitLabel, decimal: lang === 'en' ? '.' : ',' })).join(' + '), pick(i, 'name')]
              .filter(Boolean)
              .join(' ')
      ),
    },
  });
});

app.route('/api', api);
app.use('/*', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => console.log(`Meal planner listening on http://localhost:${port}`));
