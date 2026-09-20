import { useEffect, useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Recipe } from '../types';
import { normalizeName } from '../../shared/format.js';
import { useI18n } from '../i18n';
import { store } from '../storage';

interface Props {
  recipes: Recipe[];
  onOpen: (recipe: Recipe) => void;
  onNew: () => void;
  /** Plandaki boş bir öğünden gelindiyse: karta dokunmak tarifi açmaz, o öğüne ekler. */
  picking: string | null;
  onCancelPick: () => void;
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: (r: Recipe) => void }) {
  const { t, term, servings, pick } = useI18n();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { type: 'recipe', recipeId: recipe.id, label: pick(recipe, 'name') },
  });
  const meta = [
    term(recipe.category),
    recipe.duration_min && t('minutes', { n: recipe.duration_min }),
    servings(recipe.base_servings),
  ];
  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`recipe-card${isDragging ? ' dragging' : ''}`}
      onClick={() => onOpen(recipe)}
    >
      <span className="recipe-text">
        <span className="recipe-name">{pick(recipe, 'name')}</span>
        <span className="recipe-meta">{meta.filter(Boolean).join(' · ')}</span>
      </span>
      {recipe.kcal != null && (
        <span className="kcal-pill" title={t('perServing')}>
          <strong>{Math.round(recipe.kcal)}</strong> kcal
          {recipe.protein_g != null && <small>{Math.round(recipe.protein_g)} g P</small>}
        </span>
      )}
    </li>
  );
}

export default function RecipePanel({ recipes, onOpen, onNew, picking, onCancelPick }: Props) {
  const { t, term, pick, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(() => {
    // Telefonda filtreler ekranın tamamını kaplıyor; tercih kaydedilmemişse orada kapalı başlar.
    const saved = store.get('filtersOpen');
    if (saved != null) return saved !== '0';
    return !(window.matchMedia && window.matchMedia('(max-width: 960px)').matches);
  });

  useEffect(() => store.set('filtersOpen', filtersOpen ? '1' : '0'), [filtersOpen]);

  const sortTr = (a: string, b: string) => a.localeCompare(b, 'tr');
  const categories = useMemo(() => [...new Set(recipes.map((r) => r.category))].sort(sortTr), [recipes]);
  const tags = useMemo(() => [...new Set(recipes.flatMap((r) => r.tags))].sort(sortTr), [recipes]);
  const activeFilters = [category, tag].filter(Boolean);

  // Ada, etikete ve malzemeye göre arar ("tavuk" yazınca tavuklu her şey gelsin).
  const filtered = useMemo(() => {
    const q = normalizeName(query);
    return recipes
      .filter((r) => {
        if (category && r.category !== category) return false;
        if (tag && !r.tags.includes(tag)) return false;
        if (!q) return true;
        // Hangi dilde yazılırsa yazılsın bulsun diye bütün dillerdeki adlara bakılır.
        const words = [r.name, r.name_en, r.name_de, ...r.tags, ...r.tags.map(term), ...r.ingredients.flatMap((i) => [i.name, i.name_en, i.name_de])];
        return words.filter(Boolean).map(normalizeName).join(' ').includes(q);
      })
      .sort((a, b) => pick(a, 'name').localeCompare(pick(b, 'name'), locale));
  }, [recipes, query, category, tag, term, pick, locale]);

  return (
    <section className="panel recipes-panel">
      {picking && (
        <div className="pick-banner" role="status">
          <span>{picking}</span>
          <button onClick={onCancelPick}>{t('cancel')}</button>
        </div>
      )}
      <div className="panel-head">
        <h2>{t('recipes')} <small>{filtered.length}</small></h2>
        <button className="primary" onClick={onNew}>{t('newRecipe')}</button>
      </div>
      <input type="search" placeholder={t('searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />

      {(categories.length > 1 || tags.length > 0) && (
        <div className="filters">
          <button className="filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
            <span>{t('filters')}{activeFilters.length > 0 && <em> · {activeFilters.map(term).join(', ')}</em>}</span>
            <span aria-hidden="true">{filtersOpen ? '▴' : '▾'}</span>
          </button>
          {filtersOpen && (
            <>
              <h3>{t('category')}</h3>
              <div className="chips">
                <button className={!category ? 'active' : ''} onClick={() => setCategory('')}>{t('all')}</button>
                {categories.map((c) => (
                  <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(category === c ? '' : c)}>{term(c)}</button>
                ))}
              </div>
              {tags.length > 0 && (
                <>
                  <h3>{t('tags')}</h3>
                  <div className="chips">
                    {tags.map((x) => (
                      <button key={x} className={tag === x ? 'active' : ''} onClick={() => setTag(tag === x ? '' : x)}>{term(x)}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {!filtersOpen && activeFilters.length > 0 && (
            <button className="link" onClick={() => { setCategory(''); setTag(''); }}>{t('clearFilters')}</button>
          )}
        </div>
      )}

      <ul className="recipe-list">
        {filtered.map((r) => <RecipeCard key={r.id} recipe={r} onOpen={onOpen} />)}
      </ul>
      {recipes.length === 0 && <p className="empty">{t('noRecipes')}</p>}
      {recipes.length > 0 && filtered.length === 0 && <p className="empty">{t('noMatch')}</p>}
    </section>
  );
}
