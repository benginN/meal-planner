import { useState } from 'react';
import Modal from './Modal';
import { api } from '../api';
import type { Profile } from '../types';
import { useI18n } from '../i18n';

interface Props {
  profiles: Profile[];
  onClose: () => void;
  onChanged: () => void;
}

const COLORS = ['#c2410c', '#0f766e', '#7c3aed', '#be185d', '#1d4ed8', '#4d7c0f'];

export default function ProfileManager({ profiles, onClose, onChanged }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError(null);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal title={t('profiles')} onClose={onClose}>
      <p className="hint">{t('profilesHint')}</p>
      <ul className="profile-list">
        {profiles.map((p) => (
          <li key={p.id}>
            <input
              defaultValue={p.name}
              aria-label={t('profileName')}
              onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && act(() => api.put(`/profiles/${p.id}`, { name: e.target.value, color: p.color }))}
            />
            <span className="swatches">
              {COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={c}
                  className={c === p.color ? 'active' : ''}
                  style={{ background: c }}
                  onClick={() => act(() => api.put(`/profiles/${p.id}`, { name: p.name, color: c }))}
                />
              ))}
            </span>
            {profiles.length > 1 && (
              <button className="danger" onClick={() => confirm(t('confirmDeleteProfile', { name: p.name })) && act(() => api.del(`/profiles/${p.id}`))}>{t('delete')}</button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="manual-form"
        onSubmit={(e) => {
          e.preventDefault();
          act(async () => {
            await api.post('/profiles', { name, color: COLORS[profiles.length % COLORS.length] });
            setName('');
          });
        }}
      >
        <input required placeholder={t('newProfilePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="primary">{t('add')}</button>
      </form>
      {error && <p className="error">{error}</p>}
    </Modal>
  );
}
