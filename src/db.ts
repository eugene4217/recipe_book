// Подключение к SQLite (встроенный модуль node:sqlite), схема таблиц и начальное заполнение.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { INGREDIENT_CATEGORIES } from './types.ts';
import { SEED_INGREDIENTS, SEED_RECIPES } from './seed.ts';

const categoryList = INGREDIENT_CATEGORIES.map((c) => `'${c}'`).join(',');

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ingredients (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE,
  category  TEXT NOT NULL CHECK (category IN (${categoryList}))
);

CREATE TABLE IF NOT EXISTS recipes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  dish        TEXT NOT NULL,
  is_user     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id      INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id),
  quantity       TEXT NOT NULL,
  PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS steps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  operation  TEXT NOT NULL,
  minutes    INTEGER NOT NULL CHECK (minutes > 0),
  note       TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS step_ingredients (
  step_id        INTEGER NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  ingredient_id  INTEGER NOT NULL REFERENCES ingredients(id),
  PRIMARY KEY (step_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_steps_recipe ON steps(recipe_id, position);
`;

/** Выполняет fn в транзакции: при ошибке все изменения откатываются. */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM ingredients').get() as { n: number };
  if (n === 0) seed(db);
  return db;
}

function seed(db: DatabaseSync): void {
  transaction(db, () => {
    const insIng = db.prepare('INSERT INTO ingredients (name, category) VALUES (?, ?)');
    const ids = new Map<string, number>();
    for (const [key, name, cat] of SEED_INGREDIENTS) {
      ids.set(key, Number(insIng.run(name, cat).lastInsertRowid));
    }
    const insRec = db.prepare('INSERT INTO recipes (name, dish, is_user) VALUES (?, ?, 0)');
    const insRI = db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)');
    const insStep = db.prepare('INSERT INTO steps (recipe_id, position, operation, minutes, note) VALUES (?, ?, ?, ?, ?)');
    const insSI = db.prepare('INSERT INTO step_ingredients (step_id, ingredient_id) VALUES (?, ?)');
    for (const r of SEED_RECIPES) {
      const rid = Number(insRec.run(r.name, r.dish).lastInsertRowid);
      for (const [key, qty] of r.ingredients) insRI.run(rid, ids.get(key)!, qty);
      r.steps.forEach(([op, keys, min, note], i) => {
        const sid = Number(insStep.run(rid, i + 1, op, min, note ?? '').lastInsertRowid);
        for (const key of keys) insSI.run(sid, ids.get(key)!);
      });
    }
  });
}
