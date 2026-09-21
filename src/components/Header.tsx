import { useState } from 'react';
import type { Profile, WeekSummary } from '../types';
import { addDays, parseIso, weekStartOf } from '../../shared/format.js';
import { LANGS, useI18n, type Lang } from '../i18n';

interface Props {
  profiles: Profile[];
  profileId: number;
  onProfile: (id: number) => void;
  onManageProfiles: () => void;
  onGuide: () => void;
  onPrint: () => void;
  viewOnly: boolean;
  onViewOnly: (on: boolean) => void;
  week: string;
  onWeek: (week: string) => void;
  weeks: WeekSummary[];
  hasPlan: boolean;
  onCopyWeek: (fromWeek: string) => void;
  onClearWeek: () => void;
}

export function useWeekLabel() {
  const { dayMonth } = useI18n();
  return (week: string) => `${dayMonth(parseIso(week))} – ${dayMonth(parseIso(addDays(week, 6)))}`;
}

export default function Header(p: Props) {
  const { t, lang, setLang } = useI18n();
  const weekLabel = useWeekLabel();
  const thisWeek = weekStartOf(new Date());
  const otherWeeks = p.weeks.filter((w) => w.week_start !== p.week);
  // On phones the secondary actions sit behind the ☰ menu; on wide screens they are always visible (CSS).
  const [menuOpen, setMenuOpen] = useState(false);
  const closing = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="header">
      <h1><span aria-hidden="true">🍲</span> <span className="app-title">{t('appTitle')}</span></h1>

      <div className="week-nav">
        <button aria-label={t('prevWeek')} onClick={() => p.onWeek(addDays(p.week, -7))}>‹</button>
        <div className="week-label">
          <strong>{weekLabel(p.week)}</strong>
          {p.week !== thisWeek && <button className="link" onClick={() => p.onWeek(thisWeek)}>{t('backToThisWeek')}</button>}
        </div>
        <button aria-label={t('nextWeek')} onClick={() => p.onWeek(addDays(p.week, 7))}>›</button>
      </div>

      <div className={`header-actions${menuOpen ? ' open' : ''}`} id="header-menu">
        {otherWeeks.length > 0 && (
          <select value="" onChange={(e) => { if (e.target.value) { setMenuOpen(false); p.onWeek(e.target.value); } }} aria-label={t('savedWeeks')}>
            <option value="">{t('savedWeeks')}</option>
            {otherWeeks.map((w) => (
              <option key={w.week_start} value={w.week_start}>
                {weekLabel(w.week_start)} ({t('meals', { n: w.meals })})
              </option>
            ))}
          </select>
        )}
        {!p.hasPlan && otherWeeks.length > 0 && (
          <select value="" onChange={(e) => { if (e.target.value) { setMenuOpen(false); p.onCopyWeek(e.target.value); } }} aria-label={t('copyFromWeek')}>
            <option value="">{t('copyFromWeek')}</option>
            {otherWeeks.map((w) => (
              <option key={w.week_start} value={w.week_start}>{weekLabel(w.week_start)}</option>
            ))}
          </select>
        )}
        <button className="primary" onClick={closing(p.onPrint)}>{t('print')}</button>
        <button onClick={closing(p.onGuide)}>{t('guide')}</button>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label={t('language')}>
          {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <button onClick={closing(p.onManageProfiles)} className="manage-profiles" title={t('editProfiles')}>
          <span aria-hidden="true">⚙</span> <span className="menu-text">{t('profiles')}</span>
        </button>
        {p.hasPlan && <button className="danger" onClick={closing(() => confirm(t('confirmClearWeek')) && p.onClearWeek())}>{t('clear')}</button>}
      </div>

      <div className="header-quick">
        <button
          className={`view-only${p.viewOnly ? ' active' : ''}`}
          aria-pressed={p.viewOnly}
          title={p.viewOnly ? t('viewOnlyOnHint') : t('viewOnlyOffHint')}
          aria-label={p.viewOnly ? t('viewOnlyOnHint') : t('viewOnlyOffHint')}
          onClick={() => p.onViewOnly(!p.viewOnly)}
        >
          <span aria-hidden="true">{p.viewOnly ? '🔒' : '✏️'}</span>
        </button>
        <select className="profile-select" value={p.profileId} onChange={(e) => p.onProfile(Number(e.target.value))} aria-label={t('profile')}>
          {p.profiles.map((pr) => (
            <option key={pr.id} value={pr.id}>{pr.name}</option>
          ))}
        </select>
        <button className="menu-toggle" aria-label={t('menu')} aria-expanded={menuOpen} aria-controls="header-menu" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '×' : '☰'}
        </button>
      </div>
    </header>
  );
}
