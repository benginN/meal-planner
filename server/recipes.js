import { readFileSync, existsSync } from 'node:fs';
import { db, transaction } from './db.js';
import { normalizeName, CATEGORIES } from '../shared/format.js';

// Formdan eklenen yeni malzemeler için kaba reyon tahmini; listeden sonradan değiştirilebilir.
const GUESSES = [
  ['Yağ & Temel Malzeme', true, ['tuz', 'zeytinyağı', 'ayçiçek yağı', 'sıvı yağ', 'su', 'sıcak su', 'şeker', 'toz şeker', 'un', 'sirke']],
  ['Baharat', true, ['karabiber', 'pul biber', 'kimyon', 'kekik', 'nane', 'kuru nane', 'sumak', 'toz kırmızı biber', 'kırmızı biber', 'zerdeçal', 'köri', 'tarçın', 'yenibahar', 'defne yaprağı', 'isot']],
  ['Sebze & Meyve', false, ['soğan', 'kuru soğan', 'sarımsak', 'domates', 'biber', 'yeşil biber', 'kapya biber', 'patates', 'havuç', 'patlıcan', 'kabak', 'ıspanak', 'maydanoz', 'dereotu', 'limon', 'salatalık', 'marul', 'mantar', 'taze soğan', 'brokoli', 'karnabahar', 'pırasa', 'kereviz', 'lahana', 'roka', 'taze fasulye', 'bezelye', 'elma', 'portakal', 'avokado', 'zencefil']],
  ['Et, Tavuk & Balık', false, ['kıyma', 'dana kıyma', 'kuşbaşı', 'tavuk', 'tavuk göğsü', 'tavuk but', 'tavuk baget', 'somon', 'levrek', 'hamsi', 'ton balığı', 'sucuk', 'pastırma', 'hindi', 'köfte', 'karides']],
  ['Süt Ürünleri & Yumurta', false, ['süt', 'yoğurt', 'süzme yoğurt', 'yumurta', 'tereyağı', 'beyaz peynir', 'kaşar', 'kaşar peyniri', 'krema', 'lor', 'labne', 'parmesan', 'mozzarella', 'kefir']],
  ['Bakliyat, Tahıl & Makarna', false, ['pirinç', 'bulgur', 'makarna', 'spagetti', 'kırmızı mercimek', 'yeşil mercimek', 'nohut', 'kuru fasulye', 'erişte', 'şehriye', 'arpa şehriye', 'kinoa', 'yulaf', 'kuskus', 'barbunya']],
  ['Konserve, Salça & Sos', false, ['salça', 'domates salçası', 'biber salçası', 'domates sosu', 'soya sosu', 'nar ekşisi', 'hardal', 'mayonez', 'ketçap', 'konserve mısır', 'mısır', 'turşu', 'zeytin', 'et suyu', 'tavuk suyu']],
  ['Fırın & Unlu Mamul', false, ['ekmek', 'lavaş', 'yufka', 'galeta unu', 'tortilla', 'milföy', 'bazlama']],
  ['Kuruyemiş & Kuru Meyve', false, ['ceviz', 'badem', 'fındık', 'fıstık', 'çam fıstığı', 'kuru üzüm', 'kuş üzümü', 'susam', 'kuru kayısı']],
];

function guess(name) {
  for (const [category, staple, names] of GUESSES) {
    if (names.includes(name)) return { category, staple };
  }
  return { category: 'Diğer', staple: false };
}

const LANGS = ['tr', 'en', 'de'];
const langOf = (lang) => (LANGS.includes(lang) ? lang : 'tr');
// Türkçe asıl sütundur; diğer diller "_en" / "_de" ekiyle saklanır.
const col = (field, lang) => (lang === 'tr' ? field : `${field}_${lang}`);
const clean = (text) => String(text || '').trim().replace(/\s+/g, ' ');

// Malzeme hangi dilde yazılmış olursa olsun aynı kayda bağlanır.
export function findOrCreateIngredient(rawName, hint = {}, lang = 'tr') {
  const typed = clean(rawName);
  if (!typed) throw new Error('Malzeme adı boş olamaz');
  const key = normalizeName(typed);
  const existing =
    db
      .prepare('SELECT * FROM ingredients')
      .all()
      .find((i) => [i.name, i.name_en, i.name_de].some((n) => n && normalizeName(n) === key)) ||
    db.prepare('SELECT ingredient_id AS id FROM ingredient_aliases WHERE alias = ?').get(key);

  if (existing) {
    // Seed'den gelen çeviriler, henüz çevirisi olmayan malzemeleri tamamlar.
    for (const l of ['en', 'de']) {
      if (hint[`name_${l}`] && !existing[`name_${l}`]) {
        db.prepare(`UPDATE ingredients SET name_${l} = ? WHERE id = ?`).run(clean(hint[`name_${l}`]), existing.id);
      }
    }
    return existing.id;
  }

  const name = lang === 'tr' ? key : typed;
  const g = guess(key);
  const category = CATEGORIES.includes(hint.category) ? hint.category : g.category;
  const staple = hint.staple ?? g.staple;
  const translated = (l) => clean(hint[`name_${l}`]) || (lang === l ? typed : null);
  const res = db
    .prepare('INSERT INTO ingredients (name, category, is_staple, name_en, name_de) VALUES (?, ?, ?, ?, ?)')
    .run(name, category, staple ? 1 : 0, translated('en'), translated('de'));
  return Number(res.lastInsertRowid);
}

export function listRecipes() {
  const rows = db.prepare('SELECT * FROM recipes ORDER BY name COLLATE NOCASE').all();
  const ings = db
    .prepare(
      `SELECT ri.recipe_id, ri.amount, ri.unit, ri.note, ri.note_en, ri.note_de,
              i.id AS ingredient_id, i.name, i.name_en, i.name_de, i.category, i.is_staple
       FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
       ORDER BY ri.recipe_id, ri.position`
    )
    .all();
  const byRecipe = new Map();
  for (const { recipe_id, ...ing } of ings) {
    if (!byRecipe.has(recipe_id)) byRecipe.set(recipe_id, []);
    byRecipe.get(recipe_id).push(ing);
  }
  return rows.map((r) => ({ ...r, tags: JSON.parse(r.tags), ingredients: byRecipe.get(r.id) || [] }));
}

export function getRecipe(id) {
  return listRecipes().find((r) => r.id === id) || null;
}

// Porsiyon başına besin değerleri; hepsi opsiyonel.
const MACROS = ['kcal', 'protein_g', 'carbs_g', 'fat_g'];
const TEXTS = ['name', 'instructions', 'notes'];

function validate(data) {
  const name = clean(data.name);
  if (!name) throw new Error('Tarif adı gerekli');
  const base = Number(data.base_servings) || 2;
  return {
    name,
    category: String(data.category || 'Ana Yemek').trim(),
    base_servings: base > 0 ? base : 2,
    duration_min: data.duration_min ? Number(data.duration_min) : null,
    tags: JSON.stringify(Array.isArray(data.tags) ? data.tags.map(String) : []),
    instructions: String(data.instructions || ''),
    notes: String(data.notes || ''),
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    macros: MACROS.map((m) => (data[m] === '' || data[m] == null || !Number.isFinite(Number(data[m])) ? null : Number(data[m]))),
  };
}

function writeIngredients(recipeId, ingredients, lang) {
  // Düzenlenen dil dışındaki malzeme notları kaybolmasın.
  const previous = new Map(
    db.prepare('SELECT ingredient_id, note, note_en, note_de FROM recipe_ingredients WHERE recipe_id = ?').all(recipeId).map((r) => [r.ingredient_id, r])
  );
  db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(recipeId);
  const insert = db.prepare(
    'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, note, note_en, note_de, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  ingredients.forEach((ing, i) => {
    if (!clean(ing.name)) return;
    const ingredientId = findOrCreateIngredient(ing.name, ing, lang);
    const amount = ing.amount === '' || ing.amount == null ? null : Number(String(ing.amount).replace(',', '.'));
    const old = previous.get(ingredientId) || {};
    const notes = { note: old.note ?? '', note_en: ing.note_en ?? old.note_en ?? null, note_de: ing.note_de ?? old.note_de ?? null };
    notes[col('note', lang)] = String(ing.note || '');
    // Türkçe not zorunlu sütun; başka dilde oluşturulan satırda o dilin notuna düşer.
    if (!previous.has(ingredientId) && lang !== 'tr') notes.note = String(ing.note || '');
    insert.run(recipeId, ingredientId, Number.isFinite(amount) ? amount : null, ing.unit || null, notes.note, notes.note_en, notes.note_de, i);
  });
}

export function createRecipe(data, lang = 'tr') {
  lang = langOf(lang);
  const r = validate(data);
  return transaction(() => {
    const res = db
      .prepare(
        `INSERT INTO recipes (name, category, base_servings, duration_min, tags, instructions, notes, kcal, protein_g, carbs_g, fat_g,
                              name_en, name_de, instructions_en, instructions_de, notes_en, notes_de)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        r.name, r.category, r.base_servings, r.duration_min, r.tags, r.instructions, r.notes, ...r.macros,
        // Seed çevirileri hazır getirir; arayüzden başka dilde eklenen tarifte yazılan metin o dilin de karşılığıdır.
        ...TEXTS.flatMap((f) => ['en', 'de'].map((l) => data[`${f}_${l}`] ?? (lang === l ? r[f] : null)))
      );
    const id = Number(res.lastInsertRowid);
    writeIngredients(id, r.ingredients, lang);
    return id;
  });
}

export function updateRecipe(id, data, lang = 'tr') {
  lang = langOf(lang);
  const r = validate(data);
  transaction(() => {
    db.prepare(
      `UPDATE recipes SET ${col('name', lang)} = ?, ${col('instructions', lang)} = ?, ${col('notes', lang)} = ?,
              category = ?, base_servings = ?, duration_min = ?, tags = ?, kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ? WHERE id = ?`
    ).run(r.name, r.instructions, r.notes, r.category, r.base_servings, r.duration_min, r.tags, ...r.macros, id);
    writeIngredients(id, r.ingredients, lang);
  });
}

export function deleteRecipe(id) {
  db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
}

// Aynı isimde tarif varsa Türkçe içeriğine dokunmaz (arayüzden yapılan düzenlemeler ezilmesin);
// yalnızca boş kalan çevirileri tamamlar.
export function importRecipes(list) {
  let added = 0;
  for (const data of list) {
    const name = clean(data.name);
    if (!name) continue;
    const existing = db.prepare('SELECT * FROM recipes WHERE name = ?').get(name);
    if (!existing) {
      createRecipe(data);
      added++;
      continue;
    }
    for (const l of ['en', 'de']) {
      for (const f of TEXTS) {
        const value = data[`${f}_${l}`];
        if (value && !existing[`${f}_${l}`]) db.prepare(`UPDATE recipes SET ${f}_${l} = ? WHERE id = ?`).run(value, existing.id);
      }
    }
    for (const ing of data.ingredients || []) {
      const ingredientId = findOrCreateIngredient(ing.name, ing);
      for (const l of ['en', 'de']) {
        if (!ing[`note_${l}`]) continue;
        db.prepare(
          `UPDATE recipe_ingredients SET note_${l} = ? WHERE recipe_id = ? AND ingredient_id = ? AND note_${l} IS NULL`
        ).run(ing[`note_${l}`], existing.id, ingredientId);
      }
    }
  }
  return added;
}

export function loadSeed(path) {
  if (!existsSync(path)) return;
  const added = importRecipes(JSON.parse(readFileSync(path, 'utf8')));
  if (added) console.log(`Seed: ${added} yeni tarif eklendi`);
}
