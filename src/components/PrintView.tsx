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

// Yalnızca yazdırırken (PDF'e kaydederken) görünür.
export default function PrintView({ profile, week, plan, shopping }: Props) {
  const { t, term, amount, slot, dayName, servings, pick } = useI18n();
  const weekLabel = useWeekLabel();
  const items = shopping.items.filter((i) => !i.excluded && !i.is_staple);

  return (
    <div className="print-only">
      <h1>{t('printTitle')}</h1>
      <p className="print-sub">{weekLabel(week)}{profile ? ` · ${profile.name}` : ''}</p>

      <table>
        <thead>
          <tr><th />{SLOTS.map((s) => <th key={s.id}>{slot(s.id)}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: 7 }, (_, day) => (
            <tr key={day}>
              <th>{dayName(parseIso(addDays(week, day)))}</th>
              {SLOTS.map((s) => (
                <td key={s.id}>
                  {plan.filter((e) => e.day === day && e.slot === s.id).map((e) => (
                    <div key={e.id}>{pick(e, 'recipe_name')} <small>({servings(e.servings)})</small></div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

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
