import { useState } from 'react';
import Modal from './Modal';
import { api } from '../api';
import type { Collection } from '../types';
import { useI18n } from '../i18n';

interface Props {
  collections: Collection[];
  onClose: () => void;
  onChanged: () => void;
}

// Renaming and deleting shelves. Putting a recipe on a shelf happens on the recipe card itself;
// this dialog is only for the housekeeping that does not belong next to a single recipe.
export default function CollectionManager({ collections, onClose, onChanged }: Props) {
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
    <Modal title={t('collections')} onClose={onClose}>
      <p className="hint">{t('collectionsHint')}</p>
      <ul className="profile-list">
        {collections.map((c) => (
          <li key={c.id}>
            <input
              defaultValue={c.name}
              aria-label={t('collectionName')}
              onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && act(() => api.put(`/collections/${c.id}`, { name: e.target.value }))}
            />
            <small className="muted">{t('recipeCount', { n: c.recipe_ids.length })}</small>
            <button className="danger" onClick={() => confirm(t('confirmDeleteCollection', { name: c.name })) && act(() => api.del(`/collections/${c.id}`))}>{t('delete')}</button>
          </li>
        ))}
      </ul>
      {collections.length === 0 && <p className="empty">{t('noCollections')}</p>}
      <form
        className="manual-form"
        onSubmit={(e) => {
          e.preventDefault();
          act(async () => {
            await api.post('/collections', { name });
            setName('');
          });
        }}
      >
        <input required placeholder={t('newCollectionPlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="primary">{t('add')}</button>
      </form>
      {error && <p className="error">{error}</p>}
    </Modal>
  );
}
