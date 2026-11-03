import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from './db.ts';
import { RecipeRepository } from './repository.ts';
import { search, toView } from './service.ts';

test('база заполняется начальными данными', () => {
  const repo = new RecipeRepository(openDatabase(':memory:'));
  assert.equal(repo.getAll().length, 9);
  assert.ok(repo.listIngredients().length >= 39);
});

test('создание, поиск и удаление рецепта', () => {
  const repo = new RecipeRepository(openDatabase(':memory:'));
  const egg = repo.listIngredients().find((i) => i.name === 'Яйца')!;
  const created = repo.create({
    name: 'Яйцо вкрутую', dish: 'Завтраки',
    ingredients: [{ ingredientId: egg.id, quantity: '2 шт' }],
    steps: [{ operation: 'Варка', minutes: 9, note: '', ingredientIds: [egg.id] }],
  });
  assert.equal(created.isUser, true);
  assert.equal(toView(created).totalMinutes, 9);
  assert.deepEqual(created.steps[0].ingredientIds, [egg.id]);
  assert.equal(search(repo.getAll(), { query: 'вкрутую' }).length, 1);
  assert.ok(repo.delete(created.id));
  assert.equal(repo.getById(created.id), undefined);
});

test('борщ — сложное блюдо из 8 операций', () => {
  const repo = new RecipeRepository(openDatabase(':memory:'));
  const [borsch] = search(repo.getAll(), { query: 'борщ' });
  assert.equal(borsch.steps.length, 8);
  assert.equal(borsch.difficulty, 'hard');
  assert.equal(borsch.totalMinutes, 170);
});

test('новый ингредиент попадает в справочник', () => {
  const repo = new RecipeRepository(openDatabase(':memory:'));
  const ing = repo.addIngredient({ name: 'Творог', category: 'dairy' });
  assert.ok(repo.listIngredients().some((i) => i.id === ing.id));
});
