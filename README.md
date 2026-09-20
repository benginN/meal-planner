# 🍲 Meal Planner

A small self-hosted weekly meal planner. Drag recipes into a breakfast/lunch/dinner grid, adjust servings, and the shopping list writes itself — grouped by aisle, with ingredients merged across recipes.

- **Weekly plan** — 7 days × breakfast/lunch/dinner, drag and drop on desktop, tap-to-add on phones; every week is saved automatically and can be copied forward
- **Shopping list** — scaled by servings, unit-aware merging (g/kg, ml/l), staples hidden, "have it at home", manual extras
- **Nutrition** — kcal and macros per serving, daily totals and a weekly daily average
- **Profiles** — shared recipes, separate plans and lists per person or household
- **PDF / print** — plan table with calories plus the shopping list on A4
- **Trilingual** — UI, guide and recipe content in English, Deutsch and Türkçe
- **Glance widget** — a JSON endpoint for a [Glance](https://github.com/glanceapp/glance) `custom-api` widget
- One container, SQLite, no external services, works on a Raspberry Pi

User guide: [English](docs/guide.en.md) · [Deutsch](docs/guide.de.md) · [Türkçe](docs/guide.tr.md) — also available inside the app via the **Guide** button.

## Install

```bash
git clone https://github.com/benginN/meal-planner.git
cd meal-planner
docker compose up -d --build
```

Open <http://localhost:3456> (change the port in `docker-compose.yml`). All data lives in `./data/yemek.db` (SQLite); backing up the `data` folder is enough. Update with `git pull && docker compose up -d --build`.

There is no login: run it on a trusted network or behind your own reverse proxy / VPN.

## Glance

`GET /api/glance?profile=<profile name or id>&lang=<tr|en|de>` returns today's and tomorrow's meals plus the remaining shopping items. If Glance runs on the same Docker network use the container name in `url`, otherwise the server's IP and port 3456.

```yaml
- type: custom-api
  title: Meal Plan
  cache: 5m
  url: http://meal-planner:3000/api/glance?profile=Shared&lang=en
  template: |
    <ul class="list list-gap-10">
      <li>
        <p class="size-h6 color-subdue">TODAY</p>
        <p>Breakfast: <span class="color-highlight">{{ if .JSON.String "today.kahvalti" }}{{ .JSON.String "today.kahvalti" }}{{ else }}—{{ end }}</span></p>
        <p>Lunch: <span class="color-highlight">{{ if .JSON.String "today.ogle" }}{{ .JSON.String "today.ogle" }}{{ else }}—{{ end }}</span></p>
        <p>Dinner: <span class="color-highlight">{{ if .JSON.String "today.aksam" }}{{ .JSON.String "today.aksam" }}{{ else }}—{{ end }}</span></p>
      </li>
      <li>
        <p class="size-h6 color-subdue">TOMORROW</p>
        <p>Breakfast: {{ if .JSON.String "tomorrow.kahvalti" }}{{ .JSON.String "tomorrow.kahvalti" }}{{ else }}—{{ end }}</p>
        <p>Lunch: {{ if .JSON.String "tomorrow.ogle" }}{{ .JSON.String "tomorrow.ogle" }}{{ else }}—{{ end }}</p>
        <p>Dinner: {{ if .JSON.String "tomorrow.aksam" }}{{ .JSON.String "tomorrow.aksam" }}{{ else }}—{{ end }}</p>
      </li>
      <li>
        <p class="size-h6 color-subdue">SHOPPING · {{ .JSON.Int "shopping.remaining" }} / {{ .JSON.Int "shopping.total" }} left</p>
        <ul class="list collapsible-container" data-collapse-after="5">
          {{ range .JSON.Array "shopping.items" }}<li>{{ .String "" }}</li>{{ end }}
        </ul>
      </li>
    </ul>
```

## Bulk recipe import

Recipes in `seed/recipes.json` are imported every time the container starts. A recipe whose name already exists is left untouched, so edits made in the UI are never overwritten. The same JSON can also be sent to a running server with `POST /api/import`.

```json
{
  "name": "Mercimek Çorbası",
  "name_en": "Red Lentil Soup",
  "category": "Çorba",
  "base_servings": 4,
  "duration_min": 35,
  "tags": ["pratik"],
  "kcal": 320, "protein_g": 18, "carbs_g": 45, "fat_g": 6,
  "instructions": "1. ...\n2. ...",
  "ingredients": [
    { "name": "kırmızı mercimek", "name_en": "red lentils", "amount": 1, "unit": "su bardağı", "category": "Bakliyat, Tahıl & Makarna" },
    { "name": "tuz", "name_en": "salt", "staple": true }
  ]
}
```

The app started out Turkish, so the **stored** values for units, aisles (`category`) and the base `name`/`instructions` columns are Turkish; the UI translates units and aisles, and shows `*_en` / `*_de` text when present (see `shared/format.js` for the unit and aisle lists, `seed/recipes.example.json` for a complete trilingual example). Translations are optional: `name_en`, `name_de`, `instructions_en`, `instructions_de`, `notes_en`, `notes_de` on a recipe; `name_en`, `name_de`, `note_en`, `note_de` on an ingredient. For an existing recipe only missing translations are filled in.

`category` (aisle) and `staple` are only honoured when an ingredient is first created; afterwards they are managed from the ⋯ menu in the shopping list.

## Development

```bash
npm install
npm run dev:server   # API on :3000 (data under ./data)
npm run dev:web      # Vite on :5173 — proxies /api to :3000
```

| Folder | Contents |
|---|---|
| `server/` | Hono API + SQLite (`node:sqlite`); the shopping list maths lives in `shopping.js` |
| `shared/` | Unit/amount/date helpers shared by server and UI |
| `src/` | React UI (dnd-kit for drag and drop); all UI strings in `src/i18n.tsx` |
| `seed/` | Recipes imported at start-up (`recipes.json`); `recipes.example.json` documents the format |
| `docs/` | User guide in English, German and Turkish (embedded into the app at build time) |

## License

[MIT](LICENSE)
