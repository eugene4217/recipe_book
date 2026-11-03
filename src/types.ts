// Справочники предметной области и типы данных.
// Вместо enum используются массивы `as const`: такой код Node.js запускает напрямую, без компиляции.

export const INGREDIENT_CATEGORIES = ['meat', 'fish', 'veg', 'spice', 'herb', 'dairy', 'grain', 'other'] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const CATEGORY_NAMES: Record<IngredientCategory, string> = {
  meat: 'Мясо',
  fish: 'Рыба',
  veg: 'Овощи',
  spice: 'Специи',
  herb: 'Травы',
  dairy: 'Молочное и яйца',
  grain: 'Крупы и мука',
  other: 'Прочее',
};

export const OPERATIONS = [
  'Нарезка', 'Жарка', 'Варка', 'Тушение', 'Запекание',
  'Смешивание', 'Взбивание', 'Маринование', 'Настаивание',
] as const;
export type Operation = (typeof OPERATIONS)[number];

export const DISH_CATEGORIES = ['Супы', 'Горячее', 'Салаты', 'Завтраки', 'Десерты', 'Закуски'] as const;
export type DishCategory = (typeof DISH_CATEGORIES)[number];

export const DIFFICULTIES = ['easy', 'mid', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Ingredient {
  id: number;
  name: string;
  category: IngredientCategory;
}

/** Ингредиент в составе рецепта: ссылка на справочник + количество. */
export interface RecipeIngredient {
  ingredientId: number;
  name: string;
  category: IngredientCategory;
  quantity: string;
}

/** Шаг рецепта: операция над одним или несколькими ингредиентами. */
export interface Step {
  position: number;
  operation: Operation;
  minutes: number;
  note: string;
  ingredientIds: number[];
}

export interface Recipe {
  id: number;
  name: string;
  dish: DishCategory;
  isUser: boolean;
  createdAt: string;
  ingredients: RecipeIngredient[];
  steps: Step[];
}

/** Рецепт с вычисляемыми полями, который отдаёт API. */
export interface RecipeView extends Recipe {
  totalMinutes: number;
  difficulty: Difficulty;
  methods: Operation[];
}

export interface SearchFilters {
  query?: string;
  dish?: DishCategory;
  ingredientCategories?: IngredientCategory[];
  minMinutes?: number;
  maxMinutes?: number;
  operation?: Operation;
  difficulties?: Difficulty[];
}

export interface NewRecipeInput {
  name: string;
  dish: DishCategory;
  ingredients: { ingredientId: number; quantity: string }[];
  steps: { operation: Operation; minutes: number; note?: string; ingredientIds: number[] }[];
}

export interface NewIngredientInput {
  name: string;
  category: IngredientCategory;
}
