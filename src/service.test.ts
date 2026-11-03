import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficulty, matches, parseFilters, totalMinutes, validateRecipe, ValidationError } from './service.ts';
import type { Recipe } from './types.ts';

const recipe = (steps: number, minutes = 5): Recipe => ({
  id: 1, name: 'Тест', dish: 'Горячее', isUser: false, createdAt: '',
  ingredients: [{ ingredientId: 1, name: 'Курица', category: 'meat', quantity: '1 шт' }],
  steps: Array.from({ length: steps }, (_, i) => ({ position: i + 1, operation: i === 0 ? 'Жарка' : 'Варка', minutes, note: '', ingredientIds: [1] })),
});

test('время — сумма шагов', () => {
  assert.equal(totalMinutes(recipe(3, 10)), 30);
});

test('сложность по числу операций', () => {
  assert.equal(difficulty(recipe(3)), 'easy');
  assert.equal(difficulty(recipe(4)), 'mid');
  assert.equal(difficulty(recipe(6)), 'mid');
  assert.equal(difficulty(recipe(7)), 'hard');
});

test('поиск по ингредиенту, времени и способу', () => {
  const r = recipe(2, 10);
  assert.ok(matches(r, { query: 'кур' }));
  assert.ok(!matches(r, { query: 'рыба' }));
  assert.ok(matches(r, { maxMinutes: 20, operation: 'Жарка', ingredientCategories: ['meat'] }));
  assert.ok(!matches(r, { maxMinutes: 15 }));
  assert.ok(!matches(r, { operation: 'Запекание' }));
  assert.ok(!matches(r, { ingredientCategories: ['meat', 'fish'] }));
});

test('разбор строки запроса', () => {
  const f = parseFilters(new URLSearchParams('q=борщ&dish=Супы&maxMinutes=60&difficulty=hard,xxx&operation=Варка'));
  assert.deepEqual(f, { query: 'борщ', dish: 'Супы', maxMinutes: 60, minMinutes: undefined, difficulties: ['hard'], operation: 'Варка' });
});

test('валидация отклоняет пустой рецепт', () => {
  assert.throws(() => validateRecipe({ name: '', dish: 'Супы', ingredients: [], steps: [] }, new Set([1])), (e: unknown) => {
    assert.ok(e instanceof ValidationError);
    assert.equal(e.errors.length, 3);
    return true;
  });
});

test('шаг не может использовать ингредиент вне состава', () => {
  assert.throws(() => validateRecipe({
    name: 'Суп', dish: 'Супы',
    ingredients: [{ ingredientId: 1, quantity: '1' }],
    steps: [{ operation: 'Варка', minutes: 10, ingredientIds: [2] }],
  }, new Set([1, 2])), ValidationError);
});
