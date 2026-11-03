// Бизнес-логика: вычисление времени и сложности, поиск, проверка входных данных.
import {
  DIFFICULTIES, DISH_CATEGORIES, INGREDIENT_CATEGORIES, OPERATIONS,
  type Difficulty, type Ingredient, type NewIngredientInput, type NewRecipeInput,
  type Operation, type Recipe, type RecipeView, type SearchFilters,
} from './types.ts';

/** Общее время приготовления — сумма длительностей всех шагов (FR-6). */
export function totalMinutes(recipe: Pick<Recipe, 'steps'>): number {
  return recipe.steps.reduce((sum, s) => sum + s.minutes, 0);
}

/** Сложность по числу операций: до 3 — простое, 4–6 — среднее, 7+ — сложное (FR-7). */
export function difficulty(recipe: Pick<Recipe, 'steps'>): Difficulty {
  const n = recipe.steps.length;
  if (n <= 3) return 'easy';
  if (n <= 6) return 'mid';
  return 'hard';
}

/** Способы готовки рецепта — уникальные операции в порядке появления. */
export function methods(recipe: Pick<Recipe, 'steps'>): Operation[] {
  return [...new Set(recipe.steps.map((s) => s.operation))];
}

export function toView(recipe: Recipe): RecipeView {
  return { ...recipe, totalMinutes: totalMinutes(recipe), difficulty: difficulty(recipe), methods: methods(recipe) };
}

/** Проверяет, подходит ли рецепт под все заданные фильтры (FR-4, FR-5). */
export function matches(recipe: Recipe, f: SearchFilters): boolean {
  if (f.query) {
    const haystack = [recipe.name, recipe.dish, ...recipe.ingredients.map((i) => i.name)].join(' ').toLowerCase();
    const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.every((w) => haystack.includes(w))) return false;
  }
  if (f.dish && recipe.dish !== f.dish) return false;
  if (f.ingredientCategories?.length) {
    const cats = new Set(recipe.ingredients.map((i) => i.category));
    if (!f.ingredientCategories.every((c) => cats.has(c))) return false;
  }
  const t = totalMinutes(recipe);
  if (f.minMinutes !== undefined && t < f.minMinutes) return false;
  if (f.maxMinutes !== undefined && t > f.maxMinutes) return false;
  if (f.operation && !recipe.steps.some((s) => s.operation === f.operation)) return false;
  if (f.difficulties?.length && !f.difficulties.includes(difficulty(recipe))) return false;
  return true;
}

export function search(recipes: Recipe[], filters: SearchFilters): RecipeView[] {
  return recipes.filter((r) => matches(r, filters)).map(toView);
}

/** Разбирает параметры строки запроса GET /api/recipes в фильтры. */
export function parseFilters(params: URLSearchParams): SearchFilters {
  const list = (key: string) => (params.get(key) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const num = (key: string) => {
    const v = params.get(key);
    if (v === null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const f: SearchFilters = {};
  const q = params.get('q')?.trim();
  if (q) f.query = q;
  const dish = params.get('dish');
  if (dish && (DISH_CATEGORIES as readonly string[]).includes(dish)) f.dish = dish as SearchFilters['dish'];
  const cats = list('ingredientCategories').filter((c) => (INGREDIENT_CATEGORIES as readonly string[]).includes(c));
  if (cats.length) f.ingredientCategories = cats as SearchFilters['ingredientCategories'];
  f.minMinutes = num('minMinutes');
  f.maxMinutes = num('maxMinutes');
  const op = params.get('operation');
  if (op && (OPERATIONS as readonly string[]).includes(op)) f.operation = op as Operation;
  const diffs = list('difficulty').filter((d) => (DIFFICULTIES as readonly string[]).includes(d));
  if (diffs.length) f.difficulties = diffs as Difficulty[];
  return f;
}

export class ValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join('; '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Проверяет новый рецепт (NFR-4). Возвращает нормализованные данные или бросает ValidationError. */
export function validateRecipe(body: unknown, knownIngredientIds: Set<number>): NewRecipeInput {
  const errors: string[] = [];
  if (!isObj(body)) throw new ValidationError(['Тело запроса должно быть JSON-объектом']);

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) errors.push('Укажите название блюда');
  if (name.length > 120) errors.push('Название длиннее 120 символов');

  const dish = body.dish;
  if (!(DISH_CATEGORIES as readonly unknown[]).includes(dish)) errors.push('Выберите категорию блюда из списка');

  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
  if (!ingredients.length) errors.push('Добавьте хотя бы один ингредиент');
  const seen = new Set<number>();
  const normIng: NewRecipeInput['ingredients'] = [];
  for (const raw of ingredients) {
    if (!isObj(raw)) { errors.push('Неверный формат ингредиента'); continue; }
    const id = Number(raw.ingredientId);
    if (!knownIngredientIds.has(id)) { errors.push(`Ингредиента с id ${raw.ingredientId} нет в справочнике`); continue; }
    if (seen.has(id)) { errors.push('Ингредиент указан дважды'); continue; }
    seen.add(id);
    const quantity = typeof raw.quantity === 'string' && raw.quantity.trim() ? raw.quantity.trim() : 'по вкусу';
    normIng.push({ ingredientId: id, quantity });
  }

  const steps = Array.isArray(body.steps) ? body.steps : [];
  if (!steps.length) errors.push('Добавьте хотя бы одну операцию');
  const normSteps: NewRecipeInput['steps'] = [];
  steps.forEach((raw, i) => {
    const n = i + 1;
    if (!isObj(raw)) { errors.push(`Шаг ${n}: неверный формат`); return; }
    if (!(OPERATIONS as readonly unknown[]).includes(raw.operation)) errors.push(`Шаг ${n}: неизвестная операция`);
    const minutes = Number(raw.minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) errors.push(`Шаг ${n}: длительность от 1 до 1440 минут`);
    const ids = Array.isArray(raw.ingredientIds) ? raw.ingredientIds.map(Number) : [];
    if (ids.some((id) => !seen.has(id))) errors.push(`Шаг ${n}: использует ингредиент, которого нет в составе рецепта`);
    normSteps.push({
      operation: raw.operation as Operation,
      minutes,
      note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 300) : '',
      ingredientIds: [...new Set(ids)],
    });
  });

  if (errors.length) throw new ValidationError(errors);
  return { name, dish: dish as NewRecipeInput['dish'], ingredients: normIng, steps: normSteps };
}

export function validateIngredient(body: unknown, existing: Ingredient[]): NewIngredientInput {
  const errors: string[] = [];
  if (!isObj(body)) throw new ValidationError(['Тело запроса должно быть JSON-объектом']);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) errors.push('Укажите название ингредиента');
  if (name.length > 60) errors.push('Название длиннее 60 символов');
  if (existing.some((i) => i.name.toLowerCase() === name.toLowerCase())) errors.push('Такой ингредиент уже есть в справочнике');
  if (!(INGREDIENT_CATEGORIES as readonly unknown[]).includes(body.category)) errors.push('Выберите категорию ингредиента');
  if (errors.length) throw new ValidationError(errors);
  return { name, category: body.category as NewIngredientInput['category'] };
}
