import { useMemo } from 'react';
import { marked } from 'marked';
import Modal from './Modal';
import { useI18n } from '../i18n';
// Rehber derleme sırasında arayüze gömülür; Türkçesinin tek kaynağı depodaki README'dir
// (başlığı ve GitHub ziyaretçileri için olan İngilizce özet satırı atılır).
import tr from '../../README.md?raw';
import en from '../../docs/guide.en.md?raw';
import de from '../../docs/guide.de.md?raw';

const GUIDES = { tr, en, de };

export default function Guide({ onClose }: { onClose: () => void }) {
  const { t, lang } = useI18n();
  const html = useMemo(() => marked.parse(GUIDES[lang].replace(/^# .*\n/, '').replace(/^> \*\*English:\*\*.*\n/m, ''), { async: false }), [lang]);
  return (
    <Modal title={t('guide')} onClose={onClose} wide>
      <div className="guide" dangerouslySetInnerHTML={{ __html: html }} />
    </Modal>
  );
}
