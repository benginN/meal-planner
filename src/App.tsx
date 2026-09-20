import { useCallback, useEffect, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { api } from './api';
import type { PlanEntry, Profile, Recipe, Shopping, SlotId, WeekSummary } from './types';
import { addDays, parseIso, weekStartOf } from '../shared/format.js';
import { store } from './storage';
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
  const { t, dayName, slot: slotName } = useI18n();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<number>(() => Number(store.get('profileId')) || 0);
  const [week, setWeek] = useState<string>(() => weekStartOf(new Date()));
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [shopping, setShopping] = useState<Shopping>(EMPTY_SHOPPING);
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [tab, setTab] = useState<Tab>('plan');
  // Telefonda boş öğündeki + ile başlar: Tarifler sekmesine geçilir, dokunulan tarif o öğüne eklenir.
  const [pickTarget, setPickTarget] = useState<{ day: number; slot: SlotId } | null>(null);
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
    if (profileId) store.set('profileId', String(profileId));
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
  const remaining =
    shopping.items.filter((i) => !i.excluded && !i.is_staple && !i.checked).length + shopping.manual.filter((m) => !m.checked).length;
  const TABS: { id: Tab; icon: string; label: string }[] = [
    { id: 'recipes', icon: '📖', label: t('tabRecipes') },
    { id: 'plan', icon: '🗓️', label: t('tabPlan') },
    { id: 'shopping', icon: '🛒', label: t('tabShopping') },
  ];

  const openOrPick = (recipe: Recipe) => {
    if (!pickTarget) return setViewing(recipe);
    addToPlan(recipe.id, pickTarget.day, pickTarget.slot);
    setPickTarget(null);
    setTab('plan');
  };

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
          <RecipePanel
            recipes={recipes}
            onOpen={openOrPick}
            onNew={() => setEditing('new')}
            picking={pickTarget && t('pickingFor', { day: dayName(parseIso(addDays(week, pickTarget.day))), meal: slotName(pickTarget.slot) })}
            onCancelPick={() => {
              setPickTarget(null);
              setTab('plan');
            }}
          />
          <PlanGrid
            week={week}
            plan={plan}
            recipes={recipes}
            onServings={setServings}
            onRemove={removeEntry}
            onOpen={setViewing}
            onPick={(day, slot) => {
              setPickTarget({ day, slot });
              setTab('recipes');
            }}
          />
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
          {TABS.map((x) => (
            <button
              key={x.id}
              className={tab === x.id ? 'active' : ''}
              aria-current={tab === x.id ? 'page' : undefined}
              onClick={() => {
                if (x.id !== 'recipes') setPickTarget(null);
                setTab(x.id);
              }}
            >
              <span className="tab-icon" aria-hidden="true">{x.icon}</span>
              {x.id === 'shopping' && remaining > 0 && <span className="tab-badge">{remaining}</span>}
              {x.label}
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
