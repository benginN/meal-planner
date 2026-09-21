export interface Profile {
  id: number;
  name: string;
  color: string;
}

export interface RecipeIngredient {
  ingredient_id?: number;
  name: string;
  name_en?: string | null;
  name_de?: string | null;
  note_en?: string | null;
  note_de?: string | null;
  amount: number | null;
  unit: string | null;
  note: string;
  category?: string;
  is_staple?: number;
}

export interface Recipe {
  id: number;
  name: string;
  category: string;
  base_servings: number;
  duration_min: number | null;
  tags: string[];
  instructions: string;
  notes: string;
  name_en: string | null;
  name_de: string | null;
  instructions_en: string | null;
  instructions_de: string | null;
  notes_en: string | null;
  notes_de: string | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  ingredients: RecipeIngredient[];
}

export interface Collection {
  id: number;
  name: string;
  position: number;
  recipe_ids: number[];
}

export type SlotId = 'kahvalti' | 'ogle' | 'ara' | 'aksam';

export interface PlanEntry {
  id: number;
  day: number;
  slot: SlotId;
  recipe_id: number;
  recipe_name: string;
  recipe_name_en: string | null;
  recipe_name_de: string | null;
  servings: number;
  base_servings: number;
  kcal: number | null;
  protein_g: number | null;
}

export interface Amount {
  amount: number;
  unit: string;
}

// One planned meal's share of an ingredient. The list is regrouped from these, and `bought` is where
// a tick actually lives — the aisle, dish and day views are three roll-ups of the same shares.
export interface ShoppingSource {
  entry_id: number;
  day: number;
  slot: SlotId;
  position: number;
  recipe_id: number;
  bought: boolean;
  amounts: Amount[];
}

export interface ShoppingItem {
  ingredient_id: number;
  name: string;
  name_en: string | null;
  name_de: string | null;
  category: string;
  is_staple: boolean;
  excluded: boolean;
  amounts: Amount[];
  recipe_ids: number[];
  /** True only when every share below is bought. */
  checked: boolean;
  sources: ShoppingSource[];
}

export interface ManualItem {
  id: number;
  text: string;
  checked: boolean;
}

export interface Shopping {
  items: ShoppingItem[];
  manual: ManualItem[];
}

export interface WeekSummary {
  week_start: string;
  meals: number;
}
