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

export default function PlanGrid({ week, plan, recipes, onServings, onRemove, onOpen }: Props) {
  const { t, slot, dayName, dayMonth } = useI18n();
  const today = isoDate(new Date());

  return (
    <section className="panel plan-panel">
      <div className="plan-grid">
        <div className="plan-row plan-head">
          <span />
          {SLOTS.map((s) => <span key={s.id}>{slot(s.id)}</span>)}
        </div>
        {Array.from({ length: 7 }, (_, day) => {
          const date = addDays(week, day);
          const dayEntries = plan.filter((e) => e.day === day);
          const kcal = dayEntries.reduce((sum, e) => sum + (e.kcal ?? 0), 0);
          const protein = dayEntries.reduce((sum, e) => sum + (e.protein_g ?? 0), 0);
          return (
            <div key={day} className={`plan-row${date === today ? ' today' : ''}`}>
              <div className="day-label">
                <strong>{dayName(parseIso(date))}</strong>
                <small>{dayMonth(parseIso(date), 'short')}</small>
                {kcal > 0 && <small className="day-macros" title={t('dayMacrosHint')}>{Math.round(kcal)} kcal · {Math.round(protein)} g P</small>}
              </div>
              {SLOTS.map((s) => (
                <Cell key={s.id} day={day} slot={s.id as SlotId}>
                  <span className="slot-label">{slot(s.id)}</span>
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
                </Cell>
              ))}
            </div>
          );
        })}
      </div>
      {plan.length === 0 && <p className="empty">{t('dropHint')}</p>}
    </section>
  );
}
