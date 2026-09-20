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

export type SlotId = 'ogle' | 'aksam';

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

export interface ShoppingItem {
  ingredient_id: number;
  name: string;
  name_en: string | null;
  name_de: string | null;
  category: string;
  is_staple: boolean;
  checked: boolean;
  excluded: boolean;
  amounts: { amount: number; unit: string }[];
  recipe_ids: number[];
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
