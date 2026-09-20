import { useCallback, useEffect, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { api } from './api';
import type { PlanEntry, Profile, Recipe, Shopping, SlotId, WeekSummary } from './types';
import { weekStartOf } from '../shared/format.js';
import Header from './components/Header';
import RecipePanel from './components/RecipePanel';
import PlanGrid from './components/PlanGrid';
import ShoppingPanel from './components/ShoppingPanel';
import RecipeModal from './components/RecipeModal';
import RecipeForm from './components/RecipeForm';
import ProfileManager from './components/ProfileManager';
import PrintView from './components/PrintView';
import Guide from './components/Guide';
import { useI18n } from './i18n';

type Tab = 'recipes' | 'plan' | 'shopping';
const EMPTY_SHOPPING: Shopping = { items: [], manual: [] };

export default function App() {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<number>(() => Number(localStorage.getItem('profileId')) || 0);
  const [week, setWeek] = useState<string>(() => weekStartOf(new Date()));
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [shopping, setShopping] = useState<Shopping>(EMPTY_SHOPPING);
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [tab, setTab] = useState<Tab>('plan');
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);
  const [managingProfiles, setManagingProfiles] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const loadProfiles = useCallback(async () => {
    const list = await api.get<Profile[]>('/profiles');
    setProfiles(list);
    setProfileId((current) => (list.some((p) => p.id === current) ? current : list[0].id));
  }, []);

  const loadRecipes = useCallback(async () => setRecipes(await api.get<Recipe[]>('/recipes')), []);

  const loadWeek = useCallback(async () => {
    if (!profileId) return;
    const q = `profile=${profileId}&week=${week}`;
    const [p, s, w] = await Promise.all([
      api.get<PlanEntry[]>(`/plan?${q}`),
      api.get<Shopping>(`/shopping?${q}`),
      api.get<WeekSummary[]>(`/weeks?profile=${profileId}`),
    ]);
    setPlan(p);
    setShopping(s);
    setWeeks(w);
  }, [profileId, week]);

  useEffect(() => {
    run(() => Promise.all([loadProfiles(), loadRecipes()]));
  }, [run, loadProfiles, loadRecipes]);

  useEffect(() => {
    if (profileId) localStorage.setItem('profileId', String(profileId));
  }, [profileId]);

  // Diğer kişinin değişiklikleri de görünsün diye düzenli aralıkla ve sekmeye dönünce tazele.
  useEffect(() => {
    run(loadWeek);
    const refresh = () => document.visibilityState === 'visible' && run(loadWeek);
    const timer = setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [run, loadWeek]);

  const addToPlan = (recipeId: number, day: number, slot: SlotId) =>
    run(async () => {
      await api.post('/plan', { profile_id: profileId, week_start: week, recipe_id: recipeId, day, slot });
      await loadWeek();
    });

  const setServings = (entry: PlanEntry, servings: number) => {
    if (servings <= 0) return;
    setPlan((list) => list.map((e) => (e.id === entry.id ? { ...e, servings } : e)));
    run(async () => {
      await api.patch(`/plan/${entry.id}`, { servings });
      await loadWeek();
    });
  };

  const removeEntry = (entry: PlanEntry) => {
    setPlan((list) => list.filter((e) => e.id !== entry.id));
    run(async () => {
      await api.del(`/plan/${entry.id}`);
      await loadWeek();
    });
  };

  const onDragStart = (e: DragStartEvent) => setDragLabel(e.active.data.current?.label ?? null);

  const onDragEnd = (e: DragEndEvent) => {
    setDragLabel(null);
    const target = e.over?.data.current as { day: number; slot: SlotId } | undefined;
    const source = e.active.data.current;
    if (!target || !source) return;
    if (source.type === 'recipe') {
      addToPlan(source.recipeId, target.day, target.slot);
    } else if (source.type === 'entry') {
      const entry = source.entry as PlanEntry;
      if (entry.day === target.day && entry.slot === target.slot) return;
      setPlan((list) => list.map((x) => (x.id === entry.id ? { ...x, ...target } : x)));
      run(async () => {
        await api.patch(`/plan/${entry.id}`, target);
        await loadWeek();
      });
    }
  };

  const profile = profiles.find((p) => p.id === profileId);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragLabel(null)}>
      <div className="app screen-only" style={{ '--accent': profile?.color } as React.CSSProperties}>
        <Header
          profiles={profiles}
          profileId={profileId}
          onProfile={setProfileId}
          onManageProfiles={() => setManagingProfiles(true)}
          onGuide={() => setShowGuide(true)}
          week={week}
          onWeek={setWeek}
          weeks={weeks}
          hasPlan={plan.length > 0}
          onCopyWeek={(fromWeek) =>
            run(async () => {
              await api.post('/plan/copy', { profile_id: profileId, week_start: week, from_week: fromWeek });
              await loadWeek();
            })
          }
          onClearWeek={() =>
            run(async () => {
              await api.del(`/plan?profile=${profileId}&week=${week}`);
              await loadWeek();
            })
          }
        />

        {error && (
          <div className="error" role="alert">
            {error} <button onClick={() => setError(null)}>{t('close')}</button>
          </div>
        )}

        <main className="columns" data-tab={tab}>
          <RecipePanel recipes={recipes} onOpen={setViewing} onNew={() => setEditing('new')} />
          <PlanGrid week={week} plan={plan} recipes={recipes} onServings={setServings} onRemove={removeEntry} onOpen={setViewing} />
          <ShoppingPanel
            shopping={shopping}
            recipes={recipes}
            profileId={profileId}
            week={week}
            onChange={setShopping}
            reload={() => run(loadWeek)}
            run={run}
          />
        </main>

        <nav className="tabs">
          {(['recipes', 'plan', 'shopping'] as Tab[]).map((x) => (
            <button key={x} className={tab === x ? 'active' : ''} onClick={() => setTab(x)}>
              {t(x === 'recipes' ? 'tabRecipes' : x === 'plan' ? 'tabPlan' : 'tabShopping')}
            </button>
          ))}
        </nav>
      </div>

      <DragOverlay dropAnimation={null}>{dragLabel && <div className="drag-ghost">{dragLabel}</div>}</DragOverlay>

      {viewing && (
        <RecipeModal
          recipe={recipes.find((r) => r.id === viewing.id) ?? viewing}
          week={week}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
          onAdd={(day, slot) => addToPlan(viewing.id, day, slot)}
        />
      )}

      {editing && (
        <RecipeForm
          recipe={editing === 'new' ? null : editing}
          recipes={recipes}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            run(() => Promise.all([loadRecipes(), loadWeek()]));
          }}
        />
      )}

      {managingProfiles && (
        <ProfileManager
          profiles={profiles}
          onClose={() => setManagingProfiles(false)}
          onChanged={() => run(loadProfiles)}
        />
      )}

      {showGuide && <Guide onClose={() => setShowGuide(false)} />}

      <PrintView profile={profile} week={week} plan={plan} shopping={shopping} />
    </DndContext>
  );
}
