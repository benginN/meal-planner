import type { PlanEntry, Profile, Shopping } from '../types';
import { SLOTS, addDays, parseIso } from '../../shared/format.js';
import { useWeekLabel } from './Header';
import { useI18n } from '../i18n';
import { groupByCategory } from './ShoppingPanel';

interface Props {
  profile?: Profile;
  week: string;
  plan: PlanEntry[];
  shopping: Shopping;
}

const sum = (list: PlanEntry[], field: 'kcal' | 'protein_g') => list.reduce((total, e) => total + (e[field] ?? 0), 0);

// Yalnızca yazdırırken (PDF'e kaydederken) görünür.
export default function PrintView({ profile, week, plan, shopping }: Props) {
  const { t, term, amount, slot, dayName, dayMonth, servings, pick } = useI18n();
  const weekLabel = useWeekLabel();
  const items = shopping.items.filter((i) => !i.excluded && !i.is_staple);
  const days = Array.from({ length: 7 }, (_, day) => plan.filter((e) => e.day === day));
  const counted = days.filter((d) => sum(d, 'kcal') > 0);
  const hasKcal = counted.length > 0;

  return (
    <div className="print-only">
      <header className="print-header">
        <h1>🍲 {t('printTitle')}</h1>
        <p className="print-sub">{weekLabel(week)}{profile ? ` · ${profile.name}` : ''}</p>
      </header>

      <table className="print-plan">
        <thead>
          <tr>
            <th />
            {SLOTS.map((s) => <th key={s.id}>{slot(s.id)}</th>)}
            {hasKcal && <th className="print-total">{t('dailyTotal')}</th>}
          </tr>
        </thead>
        <tbody>
          {days.map((dayEntries, day) => {
            const date = parseIso(addDays(week, day));
            const kcal = sum(dayEntries, 'kcal');
            return (
              <tr key={day}>
                <th>{dayName(date)}<small>{dayMonth(date, 'short')}</small></th>
                {SLOTS.map((s) => (
                  <td key={s.id}>
                    {dayEntries.filter((e) => e.slot === s.id).map((e) => (
                      <div key={e.id} className="print-entry">
                        {pick(e, 'recipe_name')}
                        <small>{servings(e.servings)}{e.kcal != null && ` · ${Math.round(e.kcal)} kcal`}{e.protein_g != null && ` · ${Math.round(e.protein_g)} g P`}</small>
                      </div>
                    ))}
                  </td>
                ))}
                {hasKcal && (
                  <td className="print-total">
                    {kcal > 0 && <><strong>{Math.round(kcal)} kcal</strong><small>{Math.round(sum(dayEntries, 'protein_g'))} g {t('protein')}</small></>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        {hasKcal && (
          <tfoot>
            <tr>
              <th colSpan={SLOTS.length + 1}>{t('weekAverage')} <small className="inline">({t('daysCounted', { n: counted.length })})</small></th>
              <td className="print-total">
                <strong>{Math.round(sum(plan, 'kcal') / counted.length)} kcal</strong>
                <small>{Math.round(sum(plan, 'protein_g') / counted.length)} g {t('protein')}</small>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {hasKcal && <p className="print-note">{t('dayMacrosHint')} · kcal / P = {t('perServing')}</p>}

      <h2>{t('printShopping')}</h2>
      <div className="print-shopping">
        {groupByCategory(items).map(([category, list]) => (
          <div key={category} className="print-group">
            <h3>{term(category)}</h3>
            <ul>{list.map((i) => <li key={i.ingredient_id}>☐ {pick(i, 'name')}{i.amounts.length > 0 && ` — ${i.amounts.map((a) => amount(a.amount, a.unit)).join(' + ')}`}</li>)}</ul>
          </div>
        ))}
        {shopping.manual.length > 0 && (
          <div className="print-group">
            <h3>{t('extra')}</h3>
            <ul>{shopping.manual.map((m) => <li key={m.id}>☐ {m.text}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
