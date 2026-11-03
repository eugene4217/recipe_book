// Слой доступа к данным: чтение и запись рецептов и ингредиентов в SQLite.
import type { DatabaseSync } from 'node:sqlite';
import { transaction } from './db.ts';
import type {
  DishCategory, Ingredient, IngredientCategory, NewIngredientInput, NewRecipeInput, Operation, Recipe,
} from './types.ts';

interface RecipeRow { id: number; name: string; dish: string; is_user: number; created_at: string }
interface RIRow { recipe_id: number; ingredient_id: number; name: string; category: string; quantity: string }
interface StepRow { id: number; recipe_id: number; position: number; operation: string; minutes: number; note: string }
interface SIRow { step_id: number; ingredient_id: number }

export class RecipeRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  listIngredients(): Ingredient[] {
    return this.db.prepare('SELECT id, name, category FROM ingredients ORDER BY name').all() as unknown as Ingredient[];
  }

  addIngredient(input: NewIngredientInput): Ingredient {
    const res = this.db.prepare('INSERT INTO ingredients (name, category) VALUES (?, ?)').run(input.name, input.category);
    return { id: Number(res.lastInsertRowid), name: input.name, category: input.category };
  }

  /** Загружает все рецепты четырьмя запросами и собирает их в объекты. */
  getAll(): Recipe[] {
    return this.load('', []);
  }

  getById(id: number): Recipe | undefined {
    return this.load('WHERE r.id = ?', [id])[0];
  }

  create(input: NewRecipeInput): Recipe {
    const id = transaction(this.db, () => {
      const rid = Number(this.db.prepare('INSERT INTO recipes (name, dish, is_user) VALUES (?, ?, 1)').run(input.name, input.dish).lastInsertRowid);
      const insRI = this.db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)');
      for (const i of input.ingredients) insRI.run(rid, i.ingredientId, i.quantity);
      const insStep = this.db.prepare('INSERT INTO steps (recipe_id, position, operation, minutes, note) VALUES (?, ?, ?, ?, ?)');
      const insSI = this.db.prepare('INSERT INTO step_ingredients (step_id, ingredient_id) VALUES (?, ?)');
      input.steps.forEach((s, idx) => {
        const sid = Number(insStep.run(rid, idx + 1, s.operation, s.minutes, s.note ?? '').lastInsertRowid);
        for (const ingId of s.ingredientIds) insSI.run(sid, ingId);
      });
      return rid;
    });
    return this.getById(id)!;
  }

  /** Удаляет рецепт. Связанные ингредиенты и шаги удаляются каскадно. */
  delete(id: number): boolean {
    return Number(this.db.prepare('DELETE FROM recipes WHERE id = ?').run(id).changes) > 0;
  }

  private load(where: string, params: number[]): Recipe[] {
    const recipes = this.db.prepare(
      `SELECT r.id, r.name, r.dish, r.is_user, r.created_at FROM recipes r ${where} ORDER BY r.is_user DESC, r.created_at DESC, r.id`,
    ).all(...params) as unknown as RecipeRow[];
    if (!recipes.length) return [];

    const scope = where ? 'WHERE ri.recipe_id = ?' : '';
    const ris = this.db.prepare(
      `SELECT ri.recipe_id, ri.ingredient_id, i.name, i.category, ri.quantity
       FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id ${scope} ORDER BY ri.rowid`,
    ).all(...params) as unknown as RIRow[];
    const steps = this.db.prepare(
      `SELECT id, recipe_id, position, operation, minutes, note FROM steps ${where ? 'WHERE recipe_id = ?' : ''} ORDER BY recipe_id, position`,
    ).all(...params) as unknown as StepRow[];
    const sis = this.db.prepare(
      `SELECT si.step_id, si.ingredient_id FROM step_ingredients si JOIN steps s ON s.id = si.step_id ${where ? 'WHERE s.recipe_id = ?' : ''} ORDER BY si.rowid`,
    ).all(...params) as unknown as SIRow[];

    const stepIngs = new Map<number, number[]>();
    for (const si of sis) {
      const arr = stepIngs.get(si.step_id) ?? [];
      arr.push(si.ingredient_id);
      stepIngs.set(si.step_id, arr);
    }
    return recipes.map((r) => ({
      id: r.id,
      name: r.name,
      dish: r.dish as DishCategory,
      isUser: r.is_user === 1,
      createdAt: r.created_at,
      ingredients: ris.filter((x) => x.recipe_id === r.id).map((x) => ({
        ingredientId: x.ingredient_id, name: x.name, category: x.category as IngredientCategory, quantity: x.quantity,
      })),
      steps: steps.filter((s) => s.recipe_id === r.id).map((s) => ({
        position: s.position, operation: s.operation as Operation, minutes: s.minutes, note: s.note,
        ingredientIds: stepIngs.get(s.id) ?? [],
      })),
    }));
  }
}
