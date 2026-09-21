import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Amount, Recipe, Shopping, ShoppingItem } from '../types';
import { CATEGORIES } from '../../shared/format.js';
import { useI18n } from '../i18n';
import { SHOPPING_MODES, useShoppingGroups, type ShopRow, type ShoppingMode } from '../shopping-view';

// A row whose shares are only partly bought shows as a half-filled box, the way a folder tree marks
// a partly selected branch. Clicking it buys the rest.
function Tick({ checked, partial, onChange }: { checked: boolean; partial: boolean; onChange: (on: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = partial;
  }, [partial]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />;
}

interface Props {
  shopping: Shopping;
  recipes: Recipe[];
  profileId: number;
  week: string;
  mode: ShoppingMode;
  onMode: (mode: ShoppingMode) => void;
  onChange: (s: Shopping) => void;
  reload: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}

export default function ShoppingPanel({ shopping, recipes, profileId, week, mode, onMode, onChange, reload, run }: Props) {
  const { t, term, amount, pick } = useI18n();
  const usedIn = (item: ShoppingItem) =>
    recipes.filter((r) => item.recipe_ids.includes(r.id)).map((r) => pick(r, 'name')).join(', ');
  const amountText = (list: Amount[]) => list.map((a) => amount(a.amount, a.unit)).join(' + ');
  const [showStaples, setShowStaples] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');

  const active = shopping.items.filter((i) => !i.excluded && (showStaples || !i.is_staple));
  const excluded = shopping.items.filter((i) => i.excluded);
  const stapleCount = shopping.items.filter((i) => i.is_staple && !i.excluded).length;
  const groups = useShoppingGroups(active, recipes, week, mode);
  const rowCount = groups.reduce((n, g) => n + g.rows.length, 0) + shopping.manual.length;
  const done =
    groups.reduce((n, g) => n + g.rows.filter((r) => r.checked).length, 0) + shopping.manual.filter((m) => m.checked).length;

  const patchItem = (item: ShoppingItem, patch: Partial<ShoppingItem>) => {
    onChange({ ...shopping, items: shopping.items.map((i) => (i.ingredient_id === item.ingredient_id ? { ...i, ...patch } : i)) });
    run(() => api.put('/shopping/state', { profile_id: profileId, week_start: week, ingredient_id: item.ingredient_id, ...patch }));
  };

  // A row stands for the planned meals under it, so ticking it buys exactly those shares. The aisle
  // row covers the whole week, a day row only that day — and every view then shows the same basket.
  const tick = (row: ShopRow, bought: boolean) => {
    const covered = new Set(row.entryIds);
    onChange({
      ...shopping,
      items: shopping.items.map((i) =>
        i.ingredient_id !== row.item.ingredient_id
          ? i
          : {
              ...i,
              sources: i.sources.map((s) => (covered.has(s.entry_id) ? { ...s, bought } : s)),
              checked: i.sources.every((s) => (covered.has(s.entry_id) ? bought : s.bought)),
            }
      ),
    });
    run(() =>
      api.put('/shopping/state', {
        profile_id: profileId,
        week_start: week,
        ingredient_id: row.item.ingredient_id,
        entry_ids: row.entryIds,
        bought,
      })
    );
  };

  const patchIngredient = (item: ShoppingItem, patch: { category?: string; is_staple?: boolean }) =>
    run(async () => {
      await api.put(`/ingredients/${item.ingredient_id}`, patch);
      reload();
    });

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    run(async () => {
      await api.post('/shopping/manual', { profile_id: profileId, week_start: week, text: manualText });
      setManualText('');
      reload();
    });
  };

  return (
    <section className="panel shopping-panel">
      <div className="panel-head">
        <h2>{t('shopping')} <small>{rowCount ? `${done}/${rowCount}` : ''}</small></h2>
      </div>

      {(groups.length > 0 || excluded.length > 0) && (
        <div className="chips shop-modes" role="group" aria-label={t('groupBy')}>
          {SHOPPING_MODES.map((m) => (
            <button key={m} className={mode === m ? 'active' : ''} aria-pressed={mode === m} onClick={() => onMode(m)}>
              {t(m === 'reyon' ? 'groupAisle' : m === 'yemek' ? 'groupMeal' : 'groupDay')}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 && shopping.manual.length === 0 && excluded.length === 0 && <p className="empty">{t('shoppingEmpty')}</p>}

      {groups.map((group) => (
        <div key={group.key} className="shop-group">
          <h3>{group.title}{group.subtitle && <small> {group.subtitle}</small>}</h3>
          <ul>
            {group.rows.map((row) => (
              <li key={row.key} className={`${row.checked ? 'checked' : ''}${row.partial ? ' partial' : ''}`}>
                <label title={row.partial ? t('partlyBought', { total: amountText(row.total), left: amountText(row.remaining) }) : undefined}>
                  <Tick checked={row.checked} partial={row.partial} onChange={(on) => tick(row, on)} />
                  <span className="shop-name">{pick(row.item, 'name')}</span>
                  <span className="shop-amount">
                    {/* Partly bought: the original is struck through and what is still missing stands next to it. */}
                    {row.partial && row.total.length > 0 && <s>{amountText(row.total)}</s>}
                    {amountText(row.partial ? row.remaining : row.total)}
                  </span>
                </label>
                <button className="more" aria-label={t('options')} onClick={() => setOpenRow(openRow === row.key ? null : row.key)}>⋯</button>
                {openRow === row.key && (
                  <div className="item-options">
                    <small>{usedIn(row.item)}</small>
                    <button onClick={() => patchItem(row.item, { excluded: true })}>{t('haveAtHome')}</button>
                    <button onClick={() => patchIngredient(row.item, { is_staple: !row.item.is_staple })}>
                      {row.item.is_staple ? t('unmakeStaple') : t('makeStaple')}
                    </button>
                    <select value={row.item.category} onChange={(e) => patchIngredient(row.item, { category: e.target.value })} aria-label={t('aisle')}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{term(c)}</option>)}
                    </select>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="shop-group">
        <h3>{t('extra')}</h3>
        <ul>
          {shopping.manual.map((m) => (
            <li key={m.id} className={m.checked ? 'checked' : ''}>
              <label>
                <input
                  type="checkbox"
                  checked={m.checked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onChange({ ...shopping, manual: shopping.manual.map((x) => (x.id === m.id ? { ...x, checked } : x)) });
                    run(() => api.patch(`/shopping/manual/${m.id}`, { checked }));
                  }}
                />
                <span className="shop-name">{m.text}</span>
              </label>
              <button className="more" aria-label={t('delete')} onClick={() => run(async () => { await api.del(`/shopping/manual/${m.id}`); reload(); })}>×</button>
            </li>
          ))}
        </ul>
        <form className="manual-form" onSubmit={addManual}>
          <input placeholder={t('addToListPlaceholder')} value={manualText} onChange={(e) => setManualText(e.target.value)} />
          <button type="submit">{t('add')}</button>
        </form>
      </div>

      {stapleCount > 0 && (
        <button className="link" onClick={() => setShowStaples(!showStaples)}>
          {showStaples ? t('hideStaples') : t('showStaples', { n: stapleCount })}
        </button>
      )}

      {excluded.length > 0 && (
        <div className="shop-group excluded">
          <h3>{t('atHome')}</h3>
          <ul>
            {excluded.map((item) => (
              <li key={item.ingredient_id}>
                <span className="shop-name">{pick(item, 'name')}</span>
                <span className="shop-amount">{amountText(item.amounts)}</span>
                <button className="link" onClick={() => patchItem(item, { excluded: false })}>{t('undo')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
