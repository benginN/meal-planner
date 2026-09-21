import { useEffect, useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { api } from '../api';
import type { Collection, Recipe } from '../types';
import { normalizeName } from '../../shared/format.js';
import { useI18n } from '../i18n';
import { store } from '../storage';

interface Props {
  recipes: Recipe[];
  onOpen: (recipe: Recipe) => void;
  onNew: () => void;
  /** Set when coming from an empty plan slot: tapping a card adds it to that slot instead of opening it. */
  picking: string | null;
  onCancelPick: () => void;
  collections: Collection[];
  onCollectionsChanged: () => void;
  onManageCollections: () => void;
  /** Read-only plan: a recipe can still be opened and filed, only dragging into the plan is off. */
  viewOnly: boolean;
}

interface CardProps {
  recipe: Recipe;
  viewOnly: boolean;
  onOpen: (r: Recipe) => void;
  collections: Collection[];
  open: boolean;
  onMenu: (open: boolean) => void;
  onToggle: (collection: Collection, recipe: Recipe, on: boolean) => void;
  onCreate: (name: string, recipe: Recipe) => void;
}

function RecipeCard({ recipe, viewOnly, onOpen, collections, open, onMenu, onToggle, onCreate }: CardProps) {
  const { t, term, servings, pick } = useI18n();
  const [newName, setNewName] = useState('');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { type: 'recipe', recipeId: recipe.id, label: pick(recipe, 'name') },
    disabled: viewOnly,
  });
  const meta = [
    term(recipe.category),
    recipe.duration_min && t('minutes', { n: recipe.duration_min }),
    servings(recipe.base_servings),
  ];
  const memberOf = collections.filter((c) => c.recipe_ids.includes(recipe.id));
  // The card itself is draggable and opens the recipe; the menu must not do either.
  const swallow = (e: React.SyntheticEvent) => e.stopPropagation();

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
      {memberOf.length > 0 && (
        <span className="coll-badge" title={memberOf.map((c) => c.name).join(', ')} aria-label={memberOf.map((c) => c.name).join(', ')}>♥</span>
      )}
      <button
        className="more"
        aria-label={t('collections')}
        aria-expanded={open}
        onPointerDown={swallow}
        onClick={(e) => {
          swallow(e);
          onMenu(!open);
        }}
      >
        ⋯
      </button>
      {open && (
        <div className="item-options card-options" onPointerDown={swallow} onClick={swallow}>
          <small>{t('addToCollection')}</small>
          {collections.map((c) => (
            <label key={c.id} className="coll-check">
              <input
                type="checkbox"
                checked={c.recipe_ids.includes(recipe.id)}
                onChange={(e) => onToggle(c, recipe, e.target.checked)}
              />
              {c.name}
            </label>
          ))}
          <form
            className="manual-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              onCreate(newName.trim(), recipe);
              setNewName('');
            }}
          >
            <input placeholder={t('newCollectionPlaceholder')} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button type="submit">{t('add')}</button>
          </form>
        </div>
      )}
    </li>
  );
}

export default function RecipePanel({ recipes, onOpen, onNew, picking, onCancelPick, collections, onCollectionsChanged, onManageCollections, viewOnly }: Props) {
  const { t, term, pick, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(() => {
    // On phones the filters fill the whole screen; with no saved preference they start collapsed there.
    const saved = store.get('filtersOpen');
    if (saved != null) return saved !== '0';
    return !(window.matchMedia && window.matchMedia('(max-width: 960px)').matches);
  });

  useEffect(() => store.set('filtersOpen', filtersOpen ? '1' : '0'), [filtersOpen]);

  const toggleMember = async (collection: Collection, recipe: Recipe, on: boolean) => {
    const path = `/collections/${collection.id}/recipes/${recipe.id}`;
    await (on ? api.put(path, {}) : api.del(path));
    onCollectionsChanged();
  };

  // Creating a shelf from a recipe card puts that recipe on it right away — that is why it is
  // being created.
  const createWith = async (name: string, recipe: Recipe) => {
    const { id } = await api.post<{ id: number }>('/collections', { name });
    await api.put(`/collections/${id}/recipes/${recipe.id}`, {});
    onCollectionsChanged();
  };

  const sortTr = (a: string, b: string) => a.localeCompare(b, 'tr');
  const categories = useMemo(() => [...new Set(recipes.map((r) => r.category))].sort(sortTr), [recipes]);
  const tags = useMemo(() => [...new Set(recipes.flatMap((r) => r.tags))].sort(sortTr), [recipes]);
  const activeFilters = [category, tag].filter(Boolean);

  // Searches name, tags and ingredients (typing "chicken" finds everything with chicken).
  const filtered = useMemo(() => {
    const q = normalizeName(query);
    return recipes
      .filter((r) => {
        if (collectionId && !collections.find((c) => c.id === collectionId)?.recipe_ids.includes(r.id)) return false;
        if (category && r.category !== category) return false;
        if (tag && !r.tags.includes(tag)) return false;
        if (!q) return true;
        // Names in every language are searched so the query language does not matter.
        const words = [r.name, r.name_en, r.name_de, ...r.tags, ...r.tags.map(term), ...r.ingredients.flatMap((i) => [i.name, i.name_en, i.name_de])];
        return words.filter(Boolean).map(normalizeName).join(' ').includes(q);
      })
      .sort((a, b) => pick(a, 'name').localeCompare(pick(b, 'name'), locale));
  }, [recipes, query, category, tag, collectionId, collections, term, pick, locale]);

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

      <div className="chips collections-row">
        {collections.map((c) => (
          <button
            key={c.id}
            className={collectionId === c.id ? 'active' : ''}
            onClick={() => setCollectionId(collectionId === c.id ? null : c.id)}
          >
            ♥ {c.name} <small>{c.recipe_ids.length}</small>
          </button>
        ))}
        <button className="ghost" onClick={onManageCollections}>
          {collections.length === 0 ? `+ ${t('newCollection')}` : t('editCollections')}
        </button>
      </div>

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
        {filtered.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            viewOnly={viewOnly}
            onOpen={onOpen}
            collections={collections}
            open={openMenu === r.id}
            onMenu={(on) => setOpenMenu(on ? r.id : null)}
            onToggle={toggleMember}
            onCreate={createWith}
          />
        ))}
      </ul>
      {recipes.length === 0 && <p className="empty">{t('noRecipes')}</p>}
      {recipes.length > 0 && filtered.length === 0 && (
        <p className="empty">{collectionId ? t('emptyCollection') : t('noMatch')}</p>
      )}
    </section>
  );
}
