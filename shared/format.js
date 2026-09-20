// Unit/amount helpers shared by the server and the UI.
// Units, categories and slot ids are stored in Turkish (the app's original language); the UI translates them.

export const UNITS = [
  'g', 'kg', 'ml', 'l', 'adet', 'diş', 'demet', 'dal', 'yaprak', 'dilim',
  'yemek kaşığı', 'tatlı kaşığı', 'çay kaşığı', 'su bardağı', 'çay bardağı',
  'kahve fincanı', 'paket', 'kutu', 'tutam', 'avuç',
];

// Display labels for the stored (Turkish) units in the other languages.
export const UNIT_LABELS = {
  adet: { en: 'pc', de: 'Stk.' }, diş: { en: 'clove', de: 'Zehe' }, demet: { en: 'bunch', de: 'Bund' }, dal: { en: 'stalk', de: 'Stange' },
  yaprak: { en: 'leaf', de: 'Blatt' }, dilim: { en: 'slice', de: 'Scheibe' }, 'yemek kaşığı': { en: 'tbsp', de: 'EL' },
  'tatlı kaşığı': { en: 'dessert spoon', de: 'Dessertlöffel' }, 'çay kaşığı': { en: 'tsp', de: 'TL' }, 'su bardağı': { en: 'cup', de: 'Tasse' },
  'çay bardağı': { en: 'tea glass', de: 'Teeglas' }, 'kahve fincanı': { en: 'coffee cup', de: 'Kaffeetasse' }, paket: { en: 'pack', de: 'Packung' },
  kutu: { en: 'can', de: 'Dose' }, tutam: { en: 'pinch', de: 'Prise' }, avuç: { en: 'handful', de: 'Handvoll' },
};

export const CATEGORIES = [
  'Sebze & Meyve',
  'Et, Tavuk & Balık',
  'Süt Ürünleri & Yumurta',
  'Bakliyat, Tahıl & Makarna',
  'Fırın & Unlu Mamul',
  'Konserve, Salça & Sos',
  'Baharat',
  'Yağ & Temel Malzeme',
  'Kuruyemiş & Kuru Meyve',
  'Dondurulmuş',
  'İçecek',
  'Diğer',
];

export const SLOTS = [
  { id: 'kahvalti', label: 'Kahvaltı' },
  { id: 'ogle', label: 'Öğle' },
  { id: 'aksam', label: 'Akşam' },
];

export const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// kg→g, l→ml: toplanabilsinler diye taban birime indirilir.
const METRIC = { kg: ['g', 1000], g: ['g', 1], l: ['ml', 1000], ml: ['ml', 1] };

export function toBaseUnit(amount, unit) {
  const m = METRIC[unit];
  return m ? { amount: amount * m[1], unit: m[0] } : { amount, unit: unit || 'adet' };
}

const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

// unitLabel and decimal follow the UI language; the default is Turkish (e.g. for the Glance output).
export function formatAmount(amount, unit, { unitLabel = (u) => u, decimal = ',' } = {}) {
  if (unit === 'g' || unit === 'ml') {
    if (amount >= 1000) {
      const big = String(Math.round(amount / 10) / 100).replace('.', decimal);
      return `${big} ${unit === 'g' ? 'kg' : 'l'}`;
    }
    const rounded = amount > 50 ? Math.round(amount / 5) * 5 : Math.max(1, Math.round(amount));
    return `${rounded} ${unit}`;
  }
  const q = Math.max(0.25, Math.round(amount * 4) / 4);
  const whole = Math.floor(q);
  const frac = FRACTIONS[q - whole] || '';
  const num = whole === 0 ? frac : `${whole}${frac}`;
  return `${num} ${unitLabel(unit)}`;
}

export function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');
}

// Monday of the week, YYYY-MM-DD (local time).
export function weekStartOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDate(d);
}

export function isoDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseIso(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
