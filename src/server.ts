// HTTP-сервер: REST API + раздача интерфейса из папки public. Только встроенные модули Node.js.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { openDatabase } from './db.ts';
import { RecipeRepository } from './repository.ts';
import { ValidationError, parseFilters, search, toView, validateIngredient, validateRecipe } from './service.ts';
import { CATEGORY_NAMES, DISH_CATEGORIES, INGREDIENT_CATEGORIES, OPERATIONS } from './types.ts';

const ROOT = resolve(import.meta.dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const PORT = Number(process.env.PORT ?? 3000);
const DB_PATH = process.env.DB_PATH ?? join(ROOT, 'data', 'recipes.db');

const db = openDatabase(DB_PATH);
const repo = new RecipeRepository(db);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 100_000) throw new ValidationError(['Слишком большой запрос']);
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new ValidationError(['Тело запроса не является корректным JSON']);
  }
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const method = req.method ?? 'GET';
  const path = url.pathname;
  const recipeId = path.match(/^\/api\/recipes\/(\d+)$/);

  // Справочники для интерфейса
  if (method === 'GET' && path === '/api/meta') {
    return sendJson(res, 200, {
      ingredientCategories: INGREDIENT_CATEGORIES.map((id) => ({ id, name: CATEGORY_NAMES[id] })),
      operations: OPERATIONS,
      dishCategories: DISH_CATEGORIES,
    });
  }

  if (path === '/api/ingredients') {
    if (method === 'GET') return sendJson(res, 200, repo.listIngredients());
    if (method === 'POST') {
      const input = validateIngredient(await readJson(req), repo.listIngredients());
      return sendJson(res, 201, repo.addIngredient(input));
    }
  }

  if (path === '/api/recipes') {
    if (method === 'GET') {
      const all = repo.getAll();
      const items = search(all, parseFilters(url.searchParams));
      return sendJson(res, 200, { total: all.length, count: items.length, items });
    }
    if (method === 'POST') {
      const known = new Set(repo.listIngredients().map((i) => i.id));
      const input = validateRecipe(await readJson(req), known);
      return sendJson(res, 201, toView(repo.create(input)));
    }
  }

  if (recipeId) {
    const id = Number(recipeId[1]);
    const recipe = repo.getById(id);
    if (!recipe) return sendJson(res, 404, { errors: ['Рецепт не найден'] });
    if (method === 'GET') return sendJson(res, 200, toView(recipe));
    if (method === 'DELETE') {
      if (!recipe.isUser) return sendJson(res, 403, { errors: ['Встроенные рецепты удалять нельзя'] });
      repo.delete(id);
      res.writeHead(204).end();
      return;
    }
  }

  sendJson(res, 404, { errors: ['Маршрут не найден'] });
}

async function serveStatic(res: ServerResponse, url: URL): Promise<void> {
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = normalize(join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return void sendJson(res, 403, { errors: ['Доступ запрещён'] });
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Не найдено');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else await serveStatic(res, url);
  } catch (e) {
    if (e instanceof ValidationError) return sendJson(res, 400, { errors: e.errors });
    console.error(e);
    sendJson(res, 500, { errors: ['Внутренняя ошибка сервера'] });
  }
});

server.listen(PORT, () => {
  console.log(`Книга рецептов: http://localhost:${PORT}`);
  console.log(`База данных: ${DB_PATH}`);
});

const shutdown = () => { server.close(); db.close(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
