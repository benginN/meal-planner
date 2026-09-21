import { useMemo } from 'react';
import { CATEGORIES, SLOTS, addDays, parseIso } from '../shared/format.js';
import { useI18n } from './i18n';
import type { Amount, Recipe, ShoppingItem, ShoppingSource } from './types';

// How the shopping list is grouped. 'reyon' is the aisle order of the market (the original view);
// the other two answer "what do I need for this dish / for this day". All three are views of one
// shopping trip: a row stands for the shares under it, and ticking it buys exactly those.
export type ShoppingMode = 'reyon' | 'yemek' | 'gun';
export const SHOPPING_MODES: ShoppingMode[] = ['reyon', 'yemek', 'gun'];

export interface ShopRow {
  key: string;
  item: ShoppingItem;
  /** The planned meals this row stands for — what a tick here buys. */
  entryIds: number[];
  total: Amount[];
  /** What is still missing: the total minus the shares already in the basket. */
  remaining: Amount[];
  checked: boolean;
  /** Some of the shares are bought, but not all — the row shows what is left of it. */
  partial: boolean;
}

export interface ShopGroup {
  key: string;
  title: string;
  subtitle: string;
  rows: ShopRow[];
}

const SLOT_ORDER = Object.fromEntries(SLOTS.map((s: { id: string }, i: number) => [s.id, i])) as Record<string, number>;

function mergeAmounts(sources: ShoppingSource[]): Amount[] {
  const totals = new Map<string, number>();
  for (const source of sources) {
    for (const a of source.amounts) totals.set(a.unit, (totals.get(a.unit) ?? 0) + a.amount);
  }
  return [...totals].map(([unit, amount]) => ({ amount, unit }));
}

function makeRow(key: string, item: ShoppingItem, sources: ShoppingSource[]): ShopRow {
  const left = sources.filter((s) => !s.bought);
  return {
    key,
    item,
    entryIds: sources.map((s) => s.entry_id),
    total: mergeAmounts(sources),
    remaining: mergeAmounts(left),
    checked: left.length === 0,
    partial: left.length > 0 && left.length < sources.length,
  };
}

export function useShoppingGroups(
  items: ShoppingItem[],
  recipes: Recipe[],
  week: string,
  mode: ShoppingMode
): ShopGroup[] {
  const i18n = useI18n();
  return useMemo(() => {
    const { term, dayName, dayMonth, slot: slotName, pick, locale } = i18n;
    const byName = (a: ShopRow, b: ShopRow) => pick(a.item, 'name').localeCompare(pick(b.item, 'name'), locale);

    const rowsOf = (scope: string, match: (source: ShoppingSource) => boolean): ShopRow[] =>
      items
        .flatMap((item) => {
          const sources = item.sources.filter(match);
          return sources.length === 0 ? [] : [makeRow(`${scope}:${item.ingredient_id}`, item, sources)];
        })
        .sort(byName);

    if (mode === 'gun') {
      return Array.from({ length: 7 }, (_, day) => day)
        .map((day) => {
          const scope = `gun:${day}`;
          const date = parseIso(addDays(week, day));
          return { key: scope, title: dayName(date), subtitle: dayMonth(date, 'short'), rows: rowsOf(scope, (s) => s.day === day) };
        })
        .filter((group) => group.rows.length > 0);
    }

    if (mode === 'yemek') {
      // Dishes come in the order they are first cooked in the week, like the plan reads.
      const rank = new Map<number, number>();
      // When the dish is cooked, collected per meal so that a dish repeated at the same meal reads
      // "Breakfast · Monday, Thursday" instead of repeating the meal name after every day.
      const when = new Map<number, Map<string, number[]>>();
      for (const item of items) {
        for (const s of item.sources) {
          const score = s.day * 10000 + (SLOT_ORDER[s.slot] ?? 0) * 100 + s.position;
          if (!rank.has(s.recipe_id) || score < rank.get(s.recipe_id)!) rank.set(s.recipe_id, score);
          const slots = when.get(s.recipe_id) ?? new Map<string, number[]>();
          const days = slots.get(s.slot) ?? [];
          if (!days.includes(s.day)) slots.set(s.slot, [...days, s.day].sort((a, b) => a - b));
          when.set(s.recipe_id, slots);
        }
      }
      const whenText = (recipeId: number) =>
        [...(when.get(recipeId) ?? new Map<string, number[]>())]
          .sort(([a], [b]) => (SLOT_ORDER[a] ?? 0) - (SLOT_ORDER[b] ?? 0))
          .map(([slotId, days]) => `${slotName(slotId)} · ${days.map((d) => dayName(parseIso(addDays(week, d)))).join(', ')}`)
          .join(' · ');

      return [...rank.keys()]
        .sort((a, b) => rank.get(a)! - rank.get(b)!)
        .map((recipeId) => {
          const recipe = recipes.find((r) => r.id === recipeId);
          const scope = `yemek:${recipeId}`;
          return {
            key: scope,
            title: recipe ? pick(recipe, 'name') : '',
            subtitle: whenText(recipeId),
            rows: rowsOf(scope, (s) => s.recipe_id === recipeId),
          };
        })
        .filter((group) => group.rows.length > 0);
    }

    // Aisle: one row per ingredient, standing for every share of it in the week.
    const byCategory = new Map<string, ShopRow[]>();
    for (const item of items) {
      const row = makeRow(`reyon:${item.ingredient_id}`, item, item.sources);
      byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), row]);
    }
    return [...byCategory]
      .sort(([a], [b]) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b))
      .map(([category, rows]) => ({ key: `reyon:${category}`, title: term(category), subtitle: '', rows: [...rows].sort(byName) }));
  }, [items, recipes, week, mode, i18n]);
}

export const countUnchecked = (groups: ShopGroup[]) =>
  groups.reduce((total, group) => total + group.rows.filter((r) => !r.checked).length, 0);
