import { useMemo } from 'react';
import { marked } from 'marked';
import Modal from './Modal';
import { useI18n } from '../i18n';
// The guides are embedded into the UI at build time; docs/ is their single source.
import tr from '../../docs/guide.tr.md?raw';
import en from '../../docs/guide.en.md?raw';
import de from '../../docs/guide.de.md?raw';

const GUIDES = { tr, en, de };

export default function Guide({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const html = useMemo(() => marked.parse(GUIDES[lang].replace(/^# .*\n/, ''), { async: false }), [lang]);
  return (
    <Modal title={t('guide')} onClose={onClose} wide>
      <div className="guide" dangerouslySetInnerHTML={{ __html: html }} />
    </Modal>
  );
}
