# 🍲 Meal Planner

A small self-hosted app where you build your weekly meal plan by drag and drop and the shopping list writes itself. Setup, Glance and developer notes live in the repository's `README.md`.

## Screen layout

The screen has three columns. On a phone they become the **Recipes / Plan / Shopping** tabs at the bottom.

| Column | What it does |
|---|---|
| **Left – Recipes** | Every recipe. The search box looks at recipe names, tags and ingredients (type "chicken" and everything with chicken shows up). **Filters** opens and closes the category and tag chips; while closed, the active filter is shown on the button. |
| **Middle – Weekly plan** | 7 days × breakfast/lunch/dinner. This is where recipes go. |
| **Right – Shopping** | The ingredients of everything in the plan, scaled to your servings and grouped by aisle. |

The language menu in the header switches everything between Türkçe, English and Deutsch: the interface, this guide, recipe names, ingredients, methods and the shopping list. The bundled recipes are translated into all three languages. A recipe you add yourself appears as you typed it in any language it has no translation for.

## Planning

- **Add a dish:** Drag a recipe from the left and drop it on the breakfast, lunch or dinner box of a day. A box can hold several dishes (soup + main, for example).
- **On a phone:** Tap the **+** in a meal slot and pick from the recipe list; it is added straight to that slot. Or tap a recipe, pick the day and meal, then tap **Add to plan**. (Press-and-hold dragging also works.)
- **Move:** Drag a planned dish to another box.
- **Servings:** The **− / +** under a dish sets how many people you cook for. The shopping list updates immediately. Below 1 it drops to half a serving.
- **Remove:** The **×** on the right of the dish.
- **🔒 View only:** The lock button in the header locks the plan: dragging is off and the − / + / × / + buttons are hidden. That is how you stop meals from being nudged out of place while scrolling on a phone; one tap toggles it and the choice is remembered. Opening a recipe and ticking the shopping list still work while locked.
- **Open a recipe:** Click the dish name to see ingredients, method and nutrition per serving. The − / + in that window only scales the amounts shown there; it does not change the plan.
- **Daily total:** The `kcal · g P` line under the day name is what one person gets from one serving of every dish that day (it does not depend on the servings you set).

## Weeks

- The **‹ ›** arrows move between weeks; **Back to this week** jumps to today. Today's row is marked with a coloured line.
- Every week is saved automatically — there is no save button.
- **Saved weeks** lists past weeks that contain meals.
- On an empty week, **Copy from week…** brings over the whole plan of an earlier week.
- **Clear** deletes that week's plan.

## Shopping list

- **Aisle / Dish / Day** group the list three ways:
  - *Aisle* – the order you walk the shop: fruit & veg, dairy, spices… Every ingredient once, with its weekly total.
  - *Dish* – each dish under its own heading with what it needs; the subheading says when it is cooked.
  - *Day* – Monday through Sunday in order, with what that day needs.
  - In the Dish and Day views the amount is that group's share: 500 g of blueberries for the week reads 250 g on Monday and 250 g on Thursday.
  - **All three are the same basket, and ticks subtract by amount.** Ticking a row puts the share of the meals it covers into the basket. Tick it in the Aisle view and the ingredient is ticked on every day and in every dish. The other way round too: tick Tuesday's 260 g of the week's 1 kg of tomatoes and the aisle row shows what is left — ~~1 kg~~ **740 g** — with a half-filled box. Tap it again and the rest counts as bought.
  - Your choice of grouping is remembered, and the PDF follows it.
- An ingredient used by several recipes is merged into one row (in the Aisle view). Grams/kilos and ml/litres are converted; units that cannot be converted are shown side by side (`30 g + 2 tbsp`).
- Ingredients without an amount ("to taste") appear by name only.
- **Checkbox:** Tick things off as you buy them. The counter at the top shows progress.
- **⋯ menu:**
  - *Have it at home* – removes the item for this week only; it moves to the "At home" section and can be restored.
  - *Mark as staple* – for things you always have (salt, oil, spices). Staples are hidden every week; **Show staples** at the bottom reveals them.
  - *Aisle* – move an ingredient to the right aisle; this is permanent.
- **Extras:** Add non-food items (napkins, detergent…) with the box at the bottom.

## Adding and editing recipes

- **+ New** creates a recipe; open a recipe and press **Edit** to change it.
- **Serves** matters: all scaling is based on it.
- Nutrition values (kcal, protein, carbs, fat) are per serving and optional.
- Leave an ingredient's amount empty for "to taste"; it will not be scaled.
- Pick ingredient names from the suggestions where possible: two different spellings become two rows in the shopping list.
- **Languages:** The form edits the text of the language currently selected. To write a recipe's German version, switch to Deutsch and edit it; the other languages stay untouched. Amounts, units and nutrition values are shared by all languages. An ingredient is matched to the same entry no matter which language you type it in.
- Deleting a recipe also removes it from every plan.

## Profiles

Choose a profile in the top-right menu; **⚙** adds, renames, recolours or deletes profiles.

- **Recipes are shared by everyone.**
- **The plan and shopping list belong to a profile.** To plan together, both use the same shared profile; create your own profile for a personal plan.
- There are no passwords; the app is meant to be reachable only from a network you trust (such as Tailscale).
- If two people look at the same profile, changes reach the other side within 15 seconds.

## PDF

**PDF / Print** prepares an A4 page with the weekly plan table and the shopping list; choose "Save as PDF" in the print dialog. Staples and "at home" items are left out. The shopping list is printed in whichever grouping is on screen (aisle / dish / day).

On a phone the button does not print directly: it **opens a preview page in a new tab**, and you save from the **PDF / Print** button at the top of it. The reason is iOS: a web app added to the home screen never gets a print dialog. If you open the app from its home-screen icon, the preview page shows you its address — open that in **Safari**, where **Share ⬆︎ → Print** works.
