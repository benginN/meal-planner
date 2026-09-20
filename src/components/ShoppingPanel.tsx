import { useState } from 'react';
import { api } from '../api';
import type { Recipe, Shopping, ShoppingItem } from '../types';
import { CATEGORIES } from '../../shared/format.js';
import { useI18n } from '../i18n';

interface Props {
  shopping: Shopping;
  recipes: Recipe[];
  profileId: number;
  week: string;
  onChange: (s: Shopping) => void;
  reload: () => void;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}

export function groupByCategory(items: ShoppingItem[]) {
  const groups = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category)!.push(item);
  }
  return [...groups];
}

export default function ShoppingPanel({ shopping, recipes, profileId, week, onChange, reload, run }: Props) {
  const { t, term, amount, pick, locale } = useI18n();
  const usedIn = (item: ShoppingItem) =>
    recipes.filter((r) => item.recipe_ids.includes(r.id)).map((r) => pick(r, 'name')).join(', ');
  const byName = (a: ShoppingItem, b: ShoppingItem) => pick(a, 'name').localeCompare(pick(b, 'name'), locale);
  const amountText = (item: ShoppingItem) => item.amounts.map((a) => amount(a.amount, a.unit)).join(' + ');
  const [showStaples, setShowStaples] = useState(false);
  const [openItem, setOpenItem] = useState<number | null>(null);
  const [manualText, setManualText] = useState('');

  const active = shopping.items.filter((i) => !i.excluded && (showStaples || !i.is_staple));
  const excluded = shopping.items.filter((i) => i.excluded);
  const stapleCount = shopping.items.filter((i) => i.is_staple && !i.excluded).length;
  const all = [...active, ...shopping.manual];
  const done = all.filter((i) => i.checked).length;

  const patchItem = (item: ShoppingItem, patch: Partial<ShoppingItem>) => {
    onChange({ ...shopping, items: shopping.items.map((i) => (i.ingredient_id === item.ingredient_id ? { ...i, ...patch } : i)) });
    run(() => api.put('/shopping/state', { profile_id: profileId, week_start: week, ingredient_id: item.ingredient_id, ...patch }));
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
        <h2>{t('shopping')} <small>{all.length ? `${done}/${all.length}` : ''}</small></h2>
      </div>

      {all.length === 0 && excluded.length === 0 && <p className="empty">{t('shoppingEmpty')}</p>}

      {groupByCategory(active).map(([category, items]) => (
        <div key={category} className="shop-group">
          <h3>{term(category)}</h3>
          <ul>
            {[...items].sort(byName).map((item) => (
              <li key={item.ingredient_id} className={item.checked ? 'checked' : ''}>
                <label>
                  <input type="checkbox" checked={item.checked} onChange={(e) => patchItem(item, { checked: e.target.checked })} />
                  <span className="shop-name">{pick(item, 'name')}</span>
                  <span className="shop-amount">{amountText(item)}</span>
                </label>
                <button className="more" aria-label={t('options')} onClick={() => setOpenItem(openItem === item.ingredient_id ? null : item.ingredient_id)}>⋯</button>
                {openItem === item.ingredient_id && (
                  <div className="item-options">
                    <small>{usedIn(item)}</small>
                    <button onClick={() => patchItem(item, { excluded: true })}>{t('haveAtHome')}</button>
                    <button onClick={() => patchIngredient(item, { is_staple: !item.is_staple })}>
                      {item.is_staple ? t('unmakeStaple') : t('makeStaple')}
                    </button>
                    <select value={item.category} onChange={(e) => patchIngredient(item, { category: e.target.value })} aria-label={t('aisle')}>
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
                <span className="shop-amount">{amountText(item)}</span>
                <button className="link" onClick={() => patchItem(item, { excluded: false })}>{t('undo')}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
