# 🍲 Yemek Planlayıcı

> **English:** A small self-hosted weekly meal planner — drag recipes into a lunch/dinner grid, adjust servings, and get an aisle-grouped shopping list that merges ingredients across recipes. Profiles, PDF export, a [Glance](https://github.com/glanceapp/glance) widget endpoint, and a fully trilingual UI and recipe content (Türkçe / English / Deutsch). One container, SQLite, no external services. Run `docker compose up -d --build` and open <http://localhost:3456>. User guide: [English](docs/guide.en.md) · [Deutsch](docs/guide.de.md) · Türkçe below. MIT licensed.

Haftalık yemek planını sürükle-bırak ile kurduğun, alışveriş listesinin plandan kendiliğinden çıktığı, kendi sunucunda çalışan küçük bir uygulama. Bu rehber uygulamanın içinde de başlıktaki **Rehber** butonundan açılır.

## Ekran düzeni

Ekran üç sütundan oluşur. Telefonda bu sütunlar alttaki **Tarifler / Plan / Alışveriş** sekmelerine dönüşür.

| Sütun | Ne işe yarar |
|---|---|
| **Sol – Tarifler** | Bütün tarifler. Arama kutusu tarif adına, etikete ve malzemeye bakar ("tavuk" yazınca tavuklu her şey gelir). **Filtreler** butonu kategori ve etiket seçeneklerini açıp kapatır; kapalıyken seçili filtre butonun üzerinde yazar. |
| **Orta – Haftalık plan** | 7 gün × öğle/akşam. Tarifleri buraya taşırsın. |
| **Sağ – Alışveriş** | Plandaki yemeklerin malzemeleri, porsiyona göre hesaplanmış ve reyonlara ayrılmış halde. |

Başlıktaki dil menüsü her şeyi Türkçe, English ve Deutsch arasında değiştirir: arayüz, rehber, tarif adları, malzemeler, yapılışlar ve alışveriş listesi. Hazır gelen tariflerin üç dilde de çevirisi vardır. Kendi eklediğin bir tarifin çevirisi yoksa diğer dillerde yazdığın haliyle görünür.

## Plan yapmak

- **Yemek eklemek:** Soldaki tarifi tutup istediğin günün öğle ya da akşam kutusuna bırak. Bir kutuya birden fazla yemek konabilir (çorba + ana yemek gibi).
- **Telefonda:** Plandaki bir öğünün **+** işaretine dokun, açılan tarif listesinden seç; tarif doğrudan o öğüne eklenir. Ya da tarife dokun, açılan pencerede gün ve öğünü seçip **Plana ekle**'ye bas. (Basılı tutarak sürüklemek de çalışır.)
- **Taşımak:** Plandaki yemeği tutup başka bir kutuya bırak.
- **Porsiyon:** Yemeğin altındaki **− / +** kaç kişilik pişeceğini belirler. Alışveriş listesi anında güncellenir. 1'in altına inince yarım porsiyona düşer.
- **Çıkarmak:** Yemeğin sağındaki **×**.
- **Tarife bakmak:** Yemeğin adına tıkla; malzemeler, yapılışı ve porsiyon başına besin değerleri açılır. Oradaki − / + sadece o pencerede miktarları ölçekler, planı değiştirmez.
- **Günlük toplam:** Gün adının altındaki `kcal · g P` satırı, o günün her yemeğinden birer porsiyon yiyen bir kişinin alacağı kalori ve proteindir (porsiyon sayısından etkilenmez).

## Haftalar

- Başlıktaki **‹ ›** okları haftalar arasında gezdirir; **Bu haftaya dön** bugüne getirir. Bugünün satırı renkli çizgiyle işaretlidir.
- Her hafta kendiliğinden kayıtlıdır, ayrıca "kaydet" demene gerek yok.
- **Kayıtlı haftalar** menüsü içinde yemek olan eski haftaları listeler.
- Boş bir haftadayken çıkan **Haftadan kopyala…** menüsü eski bir haftanın planını olduğu gibi bu haftaya getirir.
- **Temizle** o haftanın planını siler.

## Alışveriş listesi

- Aynı malzeme farklı tariflerde geçiyorsa tek satırda toplanır. Gram/kilo ve ml/litre birbirine çevrilir; çevrilemeyenler yan yana yazılır (`30 g + 2 yemek kaşığı`).
- Miktarı olmayan ("göz kararı") malzemeler sadece adıyla görünür.
- **Kutucuk:** Aldıkça işaretle. Üstteki sayaç kaç kalemin bittiğini gösterir.
- **⋯ menüsü:**
  - *Evde var, listeden çıkar* – sadece bu hafta için listeden düşer, altta "Evde var" bölümünde durur ve geri alınabilir.
  - *Temel malzeme yap* – tuz, yağ, baharat gibi evde hep bulunanlar. Bunlar her hafta gizlidir; listenin altındaki **Temel malzemeleri göster** ile görünür olur.
  - *Reyon* – malzeme yanlış reyondaysa buradan düzeltilir, kalıcıdır.
- **Ekstra:** Yemekle ilgisi olmayan şeyleri (peçete, deterjan…) alttaki kutudan eklersin.

## Tarif eklemek ve düzenlemek

- **+ Yeni** ile yeni tarif; bir tarifi açıp **Düzenle** ile değişiklik.
- **Kaç kişilik** alanı önemlidir: porsiyon hesabı buna göre yapılır.
- Besin değerleri (kcal, protein, karbonhidrat, yağ) porsiyon başınadır ve opsiyoneldir.
- Malzeme satırında miktarı boş bırakırsan "göz kararı" sayılır ve ölçeklenmez.
- Malzeme adını yazarken çıkan önerilerden seçmeye çalış: "soğan" ve "kuru soğan" ayrı yazılırsa listede de ayrı satır olur.
- **Diller:** Form o an seçili dildeki metni düzenler. Bir tarifin Almancasını yazmak için dili Deutsch yapıp tarifi düzenle; Türkçesi olduğu gibi kalır. Miktarlar, birimler ve besin değerleri bütün dillerde ortaktır. Malzeme hangi dilde yazılırsa yazılsın aynı malzemeye bağlanır.
- Tarifi silmek onu bütün planlardan da kaldırır.

## Profiller

Sağ üstteki menüden profil seçilir, **⚙** ile profil eklenir, adı/rengi değiştirilir ya da silinir.

- **Tarifler herkes için ortaktır.**
- **Plan ve alışveriş listesi profile özeldir.** Birlikte plan yapacaksanız ikiniz de "Ortak" profilini kullanın; kendi planın için ayrı profil aç.
- Şifre yoktur; uygulamanın sadece güvendiğin ağdan (Tailscale gibi) erişilebilir olması beklenir.
- Aynı profile iki kişi aynı anda bakıyorsa değişiklikler en geç 15 saniyede karşı tarafa yansır.

## PDF

**PDF / Yazdır** butonu haftalık plan tablosu + alışveriş listesinden oluşan A4 sayfayı hazırlar; yazdırma penceresinde hedef olarak "PDF olarak kaydet" seç. Temel malzemeler ve "evde var" dediklerin PDF'e girmez.

---

## Kurulum

```bash
docker compose up -d --build
```

Adres: <http://localhost:3456> (port `docker-compose.yml` içinden değişir). Bütün veri `./data/yemek.db` dosyasındadır; yedek almak için `data` klasörünü kopyalamak yeterli.

## Glance

`GET /api/glance?profile=<profil adı ya da id>&lang=<tr|en|de>` bugünün ve yarının öğünlerini, ayrıca kalan alışveriş kalemlerini döner. Glance aynı Docker ağındaysa `url` için container adını, değilse sunucunun IP'sini ve 3456 portunu kullan.

```yaml
- type: custom-api
  title: Yemek Planı
  cache: 5m
  url: http://yemek-planlayici:3000/api/glance?profile=Ortak
  template: |
    <ul class="list list-gap-10">
      <li>
        <p class="size-h6 color-subdue">BUGÜN</p>
        <p>Öğle: <span class="color-highlight">{{ if .JSON.String "today.ogle" }}{{ .JSON.String "today.ogle" }}{{ else }}—{{ end }}</span></p>
        <p>Akşam: <span class="color-highlight">{{ if .JSON.String "today.aksam" }}{{ .JSON.String "today.aksam" }}{{ else }}—{{ end }}</span></p>
      </li>
      <li>
        <p class="size-h6 color-subdue">YARIN</p>
        <p>Öğle: {{ if .JSON.String "tomorrow.ogle" }}{{ .JSON.String "tomorrow.ogle" }}{{ else }}—{{ end }}</p>
        <p>Akşam: {{ if .JSON.String "tomorrow.aksam" }}{{ .JSON.String "tomorrow.aksam" }}{{ else }}—{{ end }}</p>
      </li>
      <li>
        <p class="size-h6 color-subdue">ALIŞVERİŞ · {{ .JSON.Int "shopping.remaining" }} / {{ .JSON.Int "shopping.total" }} kaldı</p>
        <ul class="list collapsible-container" data-collapse-after="5">
          {{ range .JSON.Array "shopping.items" }}<li>{{ .String "" }}</li>{{ end }}
        </ul>
      </li>
    </ul>
```

## Toplu tarif aktarımı

`seed/recipes.json` içindeki tarifler container her başladığında içe aktarılır. Aynı isimde tarif zaten varsa dokunulmaz, yani arayüzden yaptığın düzenlemeler ezilmez. Çalışan sunucuya `POST /api/import` ile de aynı JSON gönderilebilir.

```json
{
  "name": "Mercimek Çorbası",
  "category": "Çorba",
  "base_servings": 4,
  "duration_min": 35,
  "tags": ["pratik"],
  "kcal": 320, "protein_g": 18, "carbs_g": 45, "fat_g": 6,
  "instructions": "1. ...\n2. ...",
  "ingredients": [
    { "name": "kırmızı mercimek", "amount": 1, "unit": "su bardağı", "category": "Bakliyat, Tahıl & Makarna" },
    { "name": "tuz", "staple": true }
  ]
}
```

Çeviriler opsiyoneldir: tarifte `name_en`, `name_de`, `instructions_en`, `instructions_de`, `notes_en`, `notes_de`; malzemede `name_en`, `name_de`, `note_en`, `note_de`. Var olan bir tarifte yalnızca boş kalan çeviriler tamamlanır.

`category` (reyon) ve `staple` (temel malzeme) yalnızca malzeme ilk kez oluşturulurken dikkate alınır; sonrası alışveriş listesindeki ⋯ menüsünden yönetilir.

## Geliştirme

```bash
npm install
npm run dev:server   # API, :3000 (veri ./data altında)
npm run dev:web      # Vite, :5173 — /api isteklerini :3000'e yönlendirir
```

| Klasör | İçerik |
|---|---|
| `server/` | Hono API + SQLite (`node:sqlite`); alışveriş listesi hesabı `shopping.js` içinde |
| `shared/` | Sunucu ve arayüzün ortak kullandığı birim/miktar/tarih yardımcıları |
| `src/` | React arayüzü (sürükle-bırak için dnd-kit) |
| `seed/` | Başlangıçta içe aktarılan tarifler (`recipes.json`); `recipes.example.json` biçimi gösteren üç dilli örnektir |
| `docs/` | Rehberin İngilizce ve Almanca sürümleri (Türkçesi bu dosyadır); arayüz metinleri `src/i18n.tsx` içinde |
| `tarifler/` | Tariflerin kaynak ekran görüntüleri ve ham çıkarım (`ham/build-seed.mjs` bunlardan `seed/recipes.json` üretir); depoya ve imaja girmez |
