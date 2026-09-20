import { useEffect, useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { PlanEntry, Recipe, SlotId } from '../types';
import { SLOTS, addDays, isoDate, parseIso } from '../../shared/format.js';
import { useI18n } from '../i18n';

interface Props {
  week: string;
  plan: PlanEntry[];
  recipes: Recipe[];
  onServings: (entry: PlanEntry, servings: number) => void;
  onRemove: (entry: PlanEntry) => void;
  onOpen: (recipe: Recipe) => void;
  onPick: (day: number, slot: SlotId) => void;
}

type EntryProps = Pick<Props, 'onServings' | 'onRemove'> & { entry: PlanEntry; onOpen: () => void };

function Entry({ entry, onServings, onRemove, onOpen }: EntryProps) {
  const { t, servings, pick } = useI18n();
  const name = pick(entry, 'recipe_name');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `entry-${entry.id}`,
    data: { type: 'entry', entry, label: name },
  });
  // Butonlara basmak sürüklemeyi başlatmasın.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  // 1'in altında yarımşar, üstünde birer birer.
  const less = entry.servings <= 1 ? 0.5 : entry.servings - 1;
  const more = entry.servings < 1 ? 1 : entry.servings + 1;

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`entry${isDragging ? ' dragging' : ''}`}>
      <button className="entry-name" onClick={onOpen}>{name}</button>
      <div className="entry-controls" onPointerDown={stop} onTouchStart={stop}>
        <button aria-label={t('decServings')} disabled={entry.servings <= 0.5} onClick={() => onServings(entry, less)}>−</button>
        <span>{servings(entry.servings)}</span>
        <button aria-label={t('incServings')} onClick={() => onServings(entry, more)}>+</button>
        {entry.kcal != null && <span className="kcal-chip" title={t('perServing')}>{Math.round(entry.kcal)} kcal</span>}
        <button className="remove" aria-label={t('removeFromPlan')} onClick={() => onRemove(entry)}>×</button>
      </div>
    </div>
  );
}

function Cell({ day, slot, children }: { day: number; slot: SlotId; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${day}-${slot}`, data: { day, slot } });
  return (
    <div ref={setNodeRef} className={`cell${isOver ? ' over' : ''}`}>
      {children}
    </div>
  );
}

const sum = (list: PlanEntry[], field: 'kcal' | 'protein_g') => list.reduce((total, e) => total + (e[field] ?? 0), 0);

export default function PlanGrid({ week, plan, recipes, onServings, onRemove, onOpen, onPick }: Props) {
  const { t, slot, dayName, dayMonth } = useI18n();
  const today = isoDate(new Date());
  const todayRow = useRef<HTMLDivElement>(null);

  // Telefonda liste uzun: bu haftaya bakılıyorsa bugünün kartı görünür gelsin.
  // Plan yüklenince kartların boyu değişir; o yüzden hafta başına bir kez ve veri geldikten sonra kaydırılır.
  const scrolledFor = useRef('');
  const loaded = plan.length > 0;
  useEffect(() => {
    const key = `${week}:${loaded}`;
    if (scrolledFor.current === key) return;
    scrolledFor.current = key;
    if (window.matchMedia && window.matchMedia('(max-width: 960px)').matches) {
      todayRow.current?.scrollIntoView({ block: 'start' });
    }
  }, [week, loaded]);

  // Haftalık özet: yalnız yemeği olan günlerin ortalaması (boş günler ortalamayı düşürmesin).
  const days = Array.from({ length: 7 }, (_, day) => plan.filter((e) => e.day === day));
  const counted = days.filter((d) => sum(d, 'kcal') > 0);
  const avgKcal = counted.length ? sum(plan, 'kcal') / counted.length : 0;
  const avgProtein = counted.length ? sum(plan, 'protein_g') / counted.length : 0;

  return (
    <section className="panel plan-panel">
      {counted.length > 0 && (
        <div className="week-summary" title={t('dayMacrosHint')}>
          <span className="week-summary-label">{t('weekAverage')} <small>· {t('daysCounted', { n: counted.length })}</small></span>
          <span className="week-summary-values">
            <span className="kcal-badge"><strong>{Math.round(avgKcal)}</strong> kcal</span>
            <span className="protein-badge"><strong>{Math.round(avgProtein)} g</strong> {t('protein')}</span>
          </span>
        </div>
      )}
      <div className="plan-grid">
        <div className="plan-row plan-head">
          <span />
          {SLOTS.map((s) => <span key={s.id}>{slot(s.id)}</span>)}
        </div>
        {days.map((dayEntries, day) => {
          const date = addDays(week, day);
          const kcal = sum(dayEntries, 'kcal');
          const protein = sum(dayEntries, 'protein_g');
          return (
            <div key={day} ref={date === today ? todayRow : undefined} className={`plan-row${date === today ? ' today' : ''}`}>
              <div className="day-label">
                <span className="day-name">
                  <strong>{dayName(parseIso(date))}</strong>
                  <small>{dayMonth(parseIso(date), 'short')}</small>
                </span>
                {kcal > 0 && (
                  <span className="day-macros" title={t('dayMacrosHint')}>
                    <span className="kcal-badge"><strong>{Math.round(kcal)}</strong> kcal</span>
                    <span className="protein-badge"><strong>{Math.round(protein)} g</strong> P</span>
                  </span>
                )}
              </div>
              {SLOTS.map((s) => (
                <Cell key={s.id} day={day} slot={s.id as SlotId}>
                  <span className="slot-label">{slot(s.id)}</span>
                  <div className="cell-body">
                  {dayEntries.filter((e) => e.slot === s.id).map((e) => (
                    <Entry
                      key={e.id}
                      entry={e}
                      onServings={onServings}
                      onRemove={onRemove}
                      onOpen={() => {
                        const r = recipes.find((x) => x.id === e.recipe_id);
                        if (r) onOpen(r);
                      }}
                    />
                  ))}
                  <button className="cell-add" aria-label={`${t('addHere')}: ${dayName(parseIso(date))} · ${slot(s.id)}`} onClick={() => onPick(day, s.id as SlotId)}>+</button>
                  </div>
                </Cell>
              ))}
            </div>
          );
        })}
      </div>
      {plan.length === 0 && <p className="empty"><span className="wide-only">{t('dropHint')}</span><span className="narrow-only">{t('tapHint')}</span></p>}
    </section>
  );
}
