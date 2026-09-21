import { useCallback, useEffect, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { api } from './api';
import type { Collection, PlanEntry, Profile, Recipe, Shopping, SlotId, WeekSummary } from './types';
import { addDays, parseIso, weekStartOf } from '../shared/format.js';
import { store } from './storage';
import { SHOPPING_MODES, countUnchecked, useShoppingGroups, type ShoppingMode } from './shopping-view';
import Header from './components/Header';
import RecipePanel from './components/RecipePanel';
import PlanGrid from './components/PlanGrid';
import ShoppingPanel from './components/ShoppingPanel';
import RecipeModal from './components/RecipeModal';
import RecipeForm from './components/RecipeForm';
import ProfileManager from './components/ProfileManager';
import CollectionManager from './components/CollectionManager';
import PrintView from './components/PrintView';
import PrintStyles from './components/PrintStyles';
import Guide from './components/Guide';
import { useI18n } from './i18n';

type Tab = 'recipes' | 'plan' | 'shopping';
const EMPTY_SHOPPING: Shopping = { items: [], manual: [] };

// ?yazdir=1 renders the printable sheet on its own, with a small toolbar. The phone's print button
// opens it in a new tab: a web app added to the iOS home screen gets no print dialog at all, so
// window.print() there does nothing — from a real Safari tab the share sheet's Print works.
const params = new URLSearchParams(window.location.search);
const printMode = params.has('yazdir');
// True only for a page running as a web app added to the iOS home screen.
const standalone =
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  (!!window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
const initialMode = () => {
  const asked = [params.get('gruplama'), store.get('shoppingMode')].find(
    (m): m is ShoppingMode => !!m && SHOPPING_MODES.includes(m as ShoppingMode)
  );
  return asked ?? 'reyon';
};

export default function App() {
  const { t, dayName, slot: slotName } = useI18n();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<number>(() => Number(params.get('profil')) || Number(store.get('profileId')) || 0);
  const [week, setWeek] = useState<string>(() => params.get('hafta') || weekStartOf(new Date()));
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [shopping, setShopping] = useState<Shopping>(EMPTY_SHOPPING);
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [tab, setTab] = useState<Tab>('plan');
  // How the shopping list is grouped; lives here because the printed list follows the same choice.
  const [shoppingMode, setShoppingMode] = useState<ShoppingMode>(initialMode);
  // Read-only mode: nothing in the plan can be dragged or changed, so scrolling the week on a phone
  // cannot nudge a meal out of its slot by accident.
  const [viewOnly, setViewOnly] = useState<boolean>(() => store.get('viewOnly') === '1');
  // Phone flow, started by the + in an empty slot: switch to Recipes, the tapped recipe goes into that slot.
  const [pickTarget, setPickTarget] = useState<{ day: number; slot: SlotId } | null>(null);
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);
  const [managingProfiles, setManagingProfiles] = useState(false);
  const [managingCollections, setManagingCollections] = useState(false);
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

  const loadCollections = useCallback(async () => setCollections(await api.get<Collection[]>('/collections')), []);

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
    run(() => Promise.all([loadProfiles(), loadRecipes(), loadCollections()]));
  }, [run, loadProfiles, loadRecipes, loadCollections]);

  useEffect(() => {
    if (profileId) store.set('profileId', String(profileId));
  }, [profileId]);

  // Refresh periodically and on tab focus so the other person's changes show up.
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
  // The printed list and the tab badge both use the shopping list without staples and without
  // anything already at home — the same rows the shopper still has to tick off.
  const printItems = shopping.items.filter((i) => !i.excluded && !i.is_staple);
  const printGroups = useShoppingGroups(printItems, recipes, week, shoppingMode);
  const remaining = countUnchecked(printGroups) + shopping.manual.filter((m) => !m.checked).length;
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

  // On a phone-sized screen the print button opens the preview page instead of calling print().
  const onPrint = () => {
    if (!window.matchMedia || !window.matchMedia('(max-width: 960px)').matches) return window.print();
    const q = new URLSearchParams({ yazdir: '1', hafta: week, profil: String(profileId), gruplama: shoppingMode });
    window.open(`${window.location.pathname}?${q}`, '_blank');
  };

  if (printMode) {
    return (
      <>
        <PrintStyles onScreen />
        <div className="print-toolbar">
          <button className="primary" onClick={() => window.print()}>{t('print')}</button>
          {window.opener && <button onClick={() => window.close()}>{t('close')}</button>}
          {/* iOS gives a web app opened from the home screen no print dialog at all, and it may keep
              this page inside that same window — then the only way out is the address in Safari. */}
          {standalone ? (
            <span>{t('printHintStandalone')} <code>{window.location.href}</code></span>
          ) : (
            <span>{t('printHint')}</span>
          )}
        </div>
        <div className="print-page">
          <PrintView profile={profile} week={week} plan={plan} shopping={shopping} groups={printGroups} />
        </div>
      </>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragLabel(null)}>
      <div className="app screen-only" style={{ '--accent': profile?.color } as React.CSSProperties}>
        <Header
          profiles={profiles}
          profileId={profileId}
          onProfile={setProfileId}
          onManageProfiles={() => setManagingProfiles(true)}
          onGuide={() => setShowGuide(true)}
          onPrint={onPrint}
          viewOnly={viewOnly}
          onViewOnly={(on) => {
            setViewOnly(on);
            store.set('viewOnly', on ? '1' : '0');
          }}
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
            collections={collections}
            onCollectionsChanged={() => run(loadCollections)}
            onManageCollections={() => setManagingCollections(true)}
            viewOnly={viewOnly}
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
            viewOnly={viewOnly}
          />
          <ShoppingPanel
            shopping={shopping}
            recipes={recipes}
            profileId={profileId}
            week={week}
            mode={shoppingMode}
            onMode={(m) => {
              setShoppingMode(m);
              store.set('shoppingMode', m);
            }}
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

      {managingCollections && (
        <CollectionManager
          collections={collections}
          onClose={() => setManagingCollections(false)}
          onChanged={() => run(loadCollections)}
        />
      )}

      {showGuide && <Guide onClose={() => setShowGuide(false)} />}

      <PrintStyles />
      <PrintView profile={profile} week={week} plan={plan} shopping={shopping} groups={printGroups} />
    </DndContext>
  );
}
