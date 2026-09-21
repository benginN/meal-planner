#!/usr/bin/env node
// Tariflerin porsiyon başına kalori/makro değerlerini MALZEMELERDEN hesaplar.
//
// Neden var: değerler bir kez elle girilirse zamanla gerçekten sapar (20 Eyl 2026'da
// bütün tarifler ~540 kcal civarına toplanmıştı). Bu betik tek kaynaktan
// (tools/besin-tablosu.json) yeniden hesaplar, böylece sayı tartışılabilir olur.
//
// Kullanım:
//   node tools/kalori-hesapla.mjs seed/recipes.json            → döküm + farklar (yazmaz)
//   node tools/kalori-hesapla.mjs seed/recipes.json --yaz      → seed dosyasına yazar
//   node tools/kalori-hesapla.mjs <(curl -s .../api/recipes)   → canlı veriyi denetler
//   node tools/kalori-hesapla.mjs seed/recipes.json --sql      → canlı DB için UPDATE satırları
//
// Kural: kcal/protein/karbonhidrat/yağ PORSİYON BAŞINADIR (toplam / base_servings).
// Miktarı veya birimi olmayan malzeme ("göz kararı") 0 sayılır ve uyarı basılır.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const tablo = JSON.parse(readFileSync(join(here, 'besin-tablosu.json'), 'utf8'));
const BAHARAT = new Set(Object.entries(tablo.malzemeler).filter(([, v]) => v.gram && v.gram['çay kaşığı'] === 2).map(([k]) => k));

const dosya = process.argv[2];
const yaz = process.argv.includes('--yaz');
const sql = process.argv.includes('--sql');
if (!dosya) { console.error('Kullanım: node tools/kalori-hesapla.mjs <tarif.json> [--yaz|--sql]'); process.exit(1); }

// Malzeme adları veritabanında küçük harfe indirgenir; tablo da öyle tutulur.
const bul = (ad) => tablo.malzemeler[ad] ?? tablo.malzemeler[ad.toLowerCase()];

function gram(ad, birim, miktar) {
  if (miktar == null || !birim) return 0;
  const m = bul(ad);
  const ozel = m.gram?.[birim];
  if (ozel != null) return miktar * ozel;
  const genel = (BAHARAT.has(ad) ? tablo.baharat_gram[birim] : null) ?? tablo.varsayilan_gram[birim];
  if (genel == null) throw new Error(`${ad}: bilinmeyen birim "${birim}"`);
  return miktar * genel;
}

const tarifler = JSON.parse(readFileSync(dosya, 'utf8'));
const uyari = [];
const sonuc = tarifler.map((r) => {
  const t = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const i of r.ingredients) {
    const m = bul(i.name);
    if (!m) { uyari.push(`TABLODA YOK: ${i.name} (${r.name})`); continue; }
    if (i.amount == null || !i.unit) { uyari.push(`ÖLÇÜSÜZ (0 sayıldı): ${i.name} (${r.name})`); continue; }
    const oran = gram(i.name, i.unit, i.amount) / 100;
    for (const k of Object.keys(t)) t[k] += m[k] * oran;
  }
  const yeni = Object.fromEntries(Object.keys(t).map((k) => [k, Math.round(t[k] / r.base_servings)]));
  return { r, yeni };
});

if (sql) {
  console.log('BEGIN;');
  for (const { r, yeni } of sonuc) {
    if (r.id == null) throw new Error('--sql için id gerekir (canlı API çıktısı kullanın)');
    console.log(`UPDATE recipes SET kcal=${yeni.kcal}, protein_g=${yeni.protein_g}, carbs_g=${yeni.carbs_g}, fat_g=${yeni.fat_g} WHERE id=${r.id};`);
  }
  console.log('COMMIT;');
} else {
  for (const { r, yeni } of sonuc) {
    const fark = yeni.kcal - (r.kcal ?? 0);
    const isaret = Math.abs(fark) >= 50 ? ' ⚠' : '';
    console.log(`${String(r.kcal ?? '-').padStart(4)} → ${String(yeni.kcal).padStart(4)} kcal  (${fark >= 0 ? '+' : ''}${fark})${isaret}  ${r.name}`);
  }
}
if (uyari.length) console.error('\n' + [...new Set(uyari)].join('\n'));
if (yaz) {
  for (const { r, yeni } of sonuc) Object.assign(r, yeni);
  writeFileSync(dosya, JSON.stringify(tarifler, null, 2) + '\n');
  console.log(`\n${dosya} güncellendi.`);
}
