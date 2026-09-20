import { useMemo, useState } from 'react';
import Modal from './Modal';
import { api } from '../api';
import type { Recipe } from '../types';
import { UNITS } from '../../shared/format.js';
import { useI18n } from '../i18n';

interface Props {
  recipe: Recipe | null;
  recipes: Recipe[];
  onClose: () => void;
  onSaved: () => void;
}

interface Row {
  name: string;
  amount: string;
  unit: string;
  note: string;
}

const EMPTY_ROW: Row = { name: '', amount: '', unit: '', note: '' };
const DEFAULT_CATEGORIES = ['Ana Yemek', 'Çorba', 'Salata', 'Makarna & Pilav', 'Zeytinyağlı', 'Atıştırmalık', 'Tatlı'];

export default function RecipeForm({ recipe, recipes, onClose, onSaved }: Props) {
  // Form seçili dildeki metni düzenler; kaydederken sunucu o dilin alanlarına yazar.
  const { t, term, pick, lang, locale } = useI18n();
  const [name, setName] = useState(recipe ? pick(recipe, 'name') : '');
  const [category, setCategory] = useState(recipe?.category ?? 'Ana Yemek');
  const [baseServings, setBaseServings] = useState(String(recipe?.base_servings ?? 2));
  const [duration, setDuration] = useState(recipe?.duration_min ? String(recipe.duration_min) : '');
  const [tags, setTags] = useState(recipe?.tags.join(', ') ?? '');
  const [instructions, setInstructions] = useState(recipe ? pick(recipe, 'instructions') : '');
  const [notes, setNotes] = useState(recipe ? pick(recipe, 'notes') : '');
  const [macros, setMacros] = useState({
    kcal: recipe?.kcal?.toString() ?? '',
    protein_g: recipe?.protein_g?.toString() ?? '',
    carbs_g: recipe?.carbs_g?.toString() ?? '',
    fat_g: recipe?.fat_g?.toString() ?? '',
  });
  const [rows, setRows] = useState<Row[]>(
    recipe
      ? recipe.ingredients.map((i) => ({ name: pick(i, 'name'), amount: i.amount == null ? '' : String(i.amount).replace('.', ','), unit: i.unit ?? '', note: pick(i, 'note') }))
      : [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => [...new Set([...DEFAULT_CATEGORIES, ...recipes.map((r) => r.category)])], [recipes]);
  const knownIngredients = useMemo(
    () => [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => pick(i, 'name'))))].sort((a, b) => a.localeCompare(b, locale)),
    [recipes, pick, locale]
  );

  const setRow = (index: number, patch: Partial<Row>) => setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      name,
      category,
      base_servings: Number(baseServings.replace(',', '.')),
      duration_min: duration ? Number(duration) : null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      instructions,
      notes,
      ...macros,
      ingredients: rows.filter((r) => r.name.trim()),
    };
    try {
      await (recipe ? api.put(`/recipes/${recipe.id}?lang=${lang}`, body) : api.post(`/recipes?lang=${lang}`, body));
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!recipe || !confirm(t('confirmDeleteRecipe', { name: pick(recipe, 'name') }))) return;
    await api.del(`/recipes/${recipe.id}`);
    onSaved();
  };

  return (
    <Modal title={recipe ? t('editRecipe') : t('createRecipe')} onClose={onClose} wide>
      <form className="recipe-form" onSubmit={save}>
        <label className="full">{t('name')}<input required autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>{t('category')}
          <input list="recipe-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="recipe-categories">{categories.map((c) => <option key={c} value={c} label={term(c)} />)}</datalist>
        </label>
        <label>{t('servesCount')}<input required inputMode="decimal" value={baseServings} onChange={(e) => setBaseServings(e.target.value)} /></label>
        <label>{t('duration')}<input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
        <label>{t('tags')}<input placeholder={t('tagsPlaceholder')} value={tags} onChange={(e) => setTags(e.target.value)} /></label>

        <fieldset className="full">
          <legend>{t('ingredients')} <small>{t('ingredientsHint')}</small></legend>
          <datalist id="known-ingredients">{knownIngredients.map((n) => <option key={n} value={n} />)}</datalist>
          {rows.map((row, i) => (
            <div key={i} className="ing-row">
              <input className="ing-amount" placeholder={t('amount')} inputMode="decimal" value={row.amount} onChange={(e) => setRow(i, { amount: e.target.value })} />
              <select value={row.unit} onChange={(e) => setRow(i, { unit: e.target.value })} aria-label={t('unit')}>
                <option value="">{t('unit')}</option>
                {UNITS.map((u) => <option key={u} value={u}>{term(u)}</option>)}
              </select>
              <input className="ing-name" list="known-ingredients" placeholder={t('ingredient')} value={row.name} onChange={(e) => setRow(i, { name: e.target.value })} />
              <input className="ing-note" placeholder={t('notePlaceholder')} value={row.note} onChange={(e) => setRow(i, { note: e.target.value })} />
              <button type="button" aria-label={t('removeRow')} onClick={() => setRows(rows.filter((_, x) => x !== i))}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => setRows([...rows, EMPTY_ROW])}>{t('addIngredient')}</button>
        </fieldset>

        <label className="full">{t('instructions')}<textarea rows={7} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></label>
        <fieldset className="full macro-fields">
          <legend>{t('macrosLegend')} <small>{t('optional')}</small></legend>
          {([['kcal', 'kcal'], ['protein_g', t('proteinG')], ['carbs_g', t('carbsG')], ['fat_g', t('fatG')]] as const).map(([key, label]) => (
            <label key={key}>{label}
              <input inputMode="decimal" value={macros[key]} onChange={(e) => setMacros({ ...macros, [key]: e.target.value.replace(',', '.') })} />
            </label>
          ))}
        </fieldset>

        <label className="full">{t('notes')}<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>

        {error && <p className="error full">{error}</p>}
        <div className="modal-foot full">
          {recipe && <button type="button" className="danger" onClick={remove}>{t('delete')}</button>}
          <button type="button" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="primary" disabled={saving}>{t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}
