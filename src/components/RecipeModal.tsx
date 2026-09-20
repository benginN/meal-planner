import { useState } from 'react';
import Modal from './Modal';
import type { Recipe, SlotId } from '../types';
import { SLOTS, addDays, isoDate, parseIso } from '../../shared/format.js';
import { useI18n } from '../i18n';

interface Props {
  recipe: Recipe;
  week: string;
  onClose: () => void;
  onEdit: () => void;
  onAdd: (day: number, slot: SlotId) => void;
}

export default function RecipeModal({ recipe, week, onClose, onEdit, onAdd }: Props) {
  const { t, term, amount, pick, slot: slotName, dayName, servings: servingsLabel } = useI18n();
  const instructions = pick(recipe, 'instructions');
  const notes = pick(recipe, 'notes');
  const [servings, setServings] = useState(recipe.base_servings);
  const todayIndex = Array.from({ length: 7 }, (_, i) => addDays(week, i)).indexOf(isoDate(new Date()));
  const [day, setDay] = useState(Math.max(0, todayIndex));
  const [slot, setSlot] = useState<SlotId>('aksam');
  const [added, setAdded] = useState(false);
  const factor = servings / recipe.base_servings;

  return (
    <Modal title={pick(recipe, 'name')} onClose={onClose} wide>
      <p className="recipe-meta">
        {term(recipe.category)}
        {recipe.duration_min ? ` · ${t('minutes', { n: recipe.duration_min })}` : ''}
        {recipe.tags.map((x) => <span key={x} className="tag">{term(x)}</span>)}
      </p>

      {recipe.kcal != null && (
        <div className="macros">
          <span><strong>{Math.round(recipe.kcal)}</strong> kcal</span>
          {recipe.protein_g != null && <span><strong>{recipe.protein_g} g</strong> {t('protein')}</span>}
          {recipe.carbs_g != null && <span><strong>{recipe.carbs_g} g</strong> {t('carbs')}</span>}
          {recipe.fat_g != null && <span><strong>{recipe.fat_g} g</strong> {t('fat')}</span>}
          <small>{t('perServing')}</small>
        </div>
      )}

      <div className="add-to-plan">
        <select value={day} onChange={(e) => setDay(Number(e.target.value))} aria-label={t('day')}>
          {Array.from({ length: 7 }, (_, i) => <option key={i} value={i}>{dayName(parseIso(addDays(week, i)))}</option>)}
        </select>
        <select value={slot} onChange={(e) => setSlot(e.target.value as SlotId)} aria-label={t('meal')}>
          {SLOTS.map((s) => <option key={s.id} value={s.id}>{slotName(s.id)}</option>)}
        </select>
        <button className="primary" onClick={() => { onAdd(day, slot); setAdded(true); }}>{t('addToPlan')}</button>
        {added && <span className="ok">{t('added')}</span>}
      </div>

      <div className="recipe-cols">
        <div>
          <div className="servings-row">
            <h3>{t('ingredients')}</h3>
            <div className="entry-controls">
              <button aria-label={t('decrease')} disabled={servings <= 1} onClick={() => setServings(servings - 1)}>−</button>
              <span>{servingsLabel(servings)}</span>
              <button aria-label={t('increase')} onClick={() => setServings(servings + 1)}>+</button>
            </div>
          </div>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                <strong>{ing.amount == null ? '' : amount(ing.amount * factor, ing.unit)}</strong> {pick(ing, 'name')}
                {pick(ing, 'note') && <em> ({pick(ing, 'note')})</em>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>{t('instructions')}</h3>
          <div className="instructions">{instructions || t('noInstructions')}</div>
          {notes && <p className="notes">{notes}</p>}
        </div>
      </div>

      <div className="modal-foot">
        <button onClick={onEdit}>{t('edit')}</button>
      </div>
    </Modal>
  );
}
