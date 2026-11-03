// Начальные данные: справочник ингредиентов и 9 рецептов разной сложности.
import type { DishCategory, IngredientCategory, Operation } from './types.ts';

export const SEED_INGREDIENTS: [key: string, name: string, category: IngredientCategory][] = [
  ['chicken', 'Куриное филе', 'meat'], ['beef', 'Говядина', 'meat'], ['bacon', 'Бекон', 'meat'],
  ['salmon', 'Лосось', 'fish'], ['shrimp', 'Креветки', 'fish'],
  ['onion', 'Лук репчатый', 'veg'], ['carrot', 'Морковь', 'veg'], ['potato', 'Картофель', 'veg'],
  ['garlic', 'Чеснок', 'veg'], ['tomato', 'Помидоры', 'veg'], ['beet', 'Свёкла', 'veg'],
  ['cabbage', 'Капуста', 'veg'], ['pepper', 'Болгарский перец', 'veg'], ['cucumber', 'Огурец', 'veg'],
  ['salt', 'Соль', 'spice'], ['bpepper', 'Чёрный перец', 'spice'], ['paprika', 'Паприка', 'spice'],
  ['turmeric', 'Куркума', 'spice'], ['cumin', 'Зира', 'spice'], ['bay', 'Лавровый лист', 'spice'],
  ['dill', 'Укроп', 'herb'], ['parsley', 'Петрушка', 'herb'], ['basil', 'Базилик', 'herb'],
  ['thyme', 'Тимьян', 'herb'], ['cilantro', 'Кинза', 'herb'],
  ['cream', 'Сливки 20%', 'dairy'], ['sourcream', 'Сметана', 'dairy'], ['butter', 'Сливочное масло', 'dairy'],
  ['parmesan', 'Пармезан', 'dairy'], ['eggs', 'Яйца', 'dairy'], ['milk', 'Молоко', 'dairy'],
  ['rice', 'Рис', 'grain'], ['pasta', 'Спагетти', 'grain'], ['flour', 'Мука пшеничная', 'grain'],
  ['oliveoil', 'Оливковое масло', 'other'], ['oil', 'Растительное масло', 'other'], ['sugar', 'Сахар', 'other'],
  ['lemon', 'Лимон', 'other'], ['tpaste', 'Томатная паста', 'other'],
];

interface SeedRecipe {
  name: string;
  dish: DishCategory;
  ingredients: [key: string, quantity: string][];
  steps: [op: Operation, keys: string[], minutes: number, note?: string][];
}

export const SEED_RECIPES: SeedRecipe[] = [
  {
    name: 'Борщ', dish: 'Супы',
    ingredients: [['beef', '500 г'], ['beet', '2 шт'], ['carrot', '1 шт'], ['onion', '1 шт'], ['cabbage', '300 г'], ['potato', '3 шт'], ['tpaste', '2 ст. л.'], ['oil', '2 ст. л.'], ['bay', '2 листа'], ['garlic', '2 зубчика'], ['salt', 'по вкусу'], ['bpepper', 'по вкусу'], ['dill', 'пучок'], ['sourcream', 'для подачи']],
    steps: [
      ['Варка', ['beef', 'bay'], 90, 'Сварить бульон, снимая пену'],
      ['Нарезка', ['beet', 'carrot', 'onion', 'cabbage', 'potato'], 15, 'Свёклу и морковь соломкой, картофель кубиком'],
      ['Жарка', ['onion', 'carrot', 'oil'], 7, 'До мягкости'],
      ['Тушение', ['beet', 'tpaste'], 15, 'С половником бульона'],
      ['Варка', ['potato', 'cabbage'], 15, 'Добавить в бульон'],
      ['Смешивание', ['beet', 'carrot', 'onion'], 3, 'Переложить зажарку в кастрюлю'],
      ['Варка', ['salt', 'bpepper', 'garlic'], 5, 'Довести до кипения, посолить'],
      ['Настаивание', ['dill'], 20, 'Под крышкой, подавать со сметаной'],
    ],
  },
  {
    name: 'Омлет на сливочном масле', dish: 'Завтраки',
    ingredients: [['eggs', '3 шт'], ['milk', '50 мл'], ['salt', 'щепотка'], ['butter', '10 г'], ['dill', 'по желанию']],
    steps: [['Взбивание', ['eggs', 'milk', 'salt'], 2, 'Вилкой, до однородности'], ['Жарка', ['butter', 'eggs'], 6, 'Под крышкой на слабом огне']],
  },
  {
    name: 'Салат с помидорами и базиликом', dish: 'Салаты',
    ingredients: [['tomato', '3 шт'], ['cucumber', '2 шт'], ['pepper', '1 шт'], ['onion', '½ шт'], ['basil', '5–6 листьев'], ['oliveoil', '2 ст. л.'], ['salt', 'по вкусу']],
    steps: [['Нарезка', ['tomato', 'cucumber', 'pepper', 'onion'], 10, 'Крупными дольками'], ['Смешивание', ['basil', 'oliveoil', 'salt'], 2, 'Заправить перед подачей']],
  },
  {
    name: 'Паста карбонара', dish: 'Горячее',
    ingredients: [['pasta', '200 г'], ['bacon', '120 г'], ['eggs', '2 шт'], ['parmesan', '50 г'], ['bpepper', 'по вкусу'], ['salt', 'для воды']],
    steps: [['Варка', ['pasta', 'salt'], 10, 'До аль денте'], ['Жарка', ['bacon'], 6, 'Без масла, до хруста'], ['Взбивание', ['eggs', 'parmesan', 'bpepper'], 2], ['Смешивание', ['pasta', 'bacon', 'eggs'], 2, 'Вне огня, чтобы яйца не свернулись']],
  },
  {
    name: 'Лосось с лимоном и тимьяном', dish: 'Горячее',
    ingredients: [['salmon', '2 стейка'], ['lemon', '½ шт'], ['thyme', '3 веточки'], ['oliveoil', '1 ст. л.'], ['salt', 'по вкусу'], ['bpepper', 'по вкусу']],
    steps: [['Маринование', ['salmon', 'lemon', 'thyme', 'salt', 'bpepper'], 15], ['Запекание', ['salmon', 'oliveoil'], 18, '200 °C']],
  },
  {
    name: 'Плов с говядиной', dish: 'Горячее',
    ingredients: [['beef', '500 г'], ['rice', '400 г'], ['carrot', '3 шт'], ['onion', '2 шт'], ['garlic', '1 головка'], ['cumin', '1 ч. л.'], ['oil', '100 мл'], ['salt', '1,5 ч. л.']],
    steps: [['Нарезка', ['beef', 'carrot', 'onion'], 15, 'Морковь толстой соломкой'], ['Жарка', ['oil', 'beef'], 10, 'В казане на сильном огне'], ['Жарка', ['onion', 'carrot'], 8], ['Тушение', ['cumin', 'salt'], 20, 'Зирвак на слабом огне'], ['Варка', ['rice', 'garlic'], 30, 'Вода на 1,5 см выше риса'], ['Настаивание', [], 15, 'Под крышкой, огонь выключен']],
  },
  {
    name: 'Куриное карри', dish: 'Горячее',
    ingredients: [['chicken', '500 г'], ['onion', '1 шт'], ['garlic', '3 зубчика'], ['turmeric', '1 ч. л.'], ['paprika', '1 ч. л.'], ['cumin', '½ ч. л.'], ['cream', '200 мл'], ['tpaste', '1 ст. л.'], ['rice', '200 г'], ['oil', '2 ст. л.'], ['salt', 'по вкусу'], ['cilantro', 'для подачи']],
    steps: [['Нарезка', ['chicken', 'onion', 'garlic'], 10], ['Варка', ['rice', 'salt'], 18], ['Жарка', ['chicken', 'oil'], 7], ['Жарка', ['onion', 'garlic', 'turmeric', 'paprika', 'cumin'], 3, 'Прогреть специи'], ['Тушение', ['cream', 'tpaste', 'chicken'], 15], ['Смешивание', ['cilantro'], 1, 'Посыпать перед подачей']],
  },
  {
    name: 'Блины на молоке', dish: 'Десерты',
    ingredients: [['flour', '200 г'], ['milk', '500 мл'], ['eggs', '2 шт'], ['sugar', '2 ст. л.'], ['salt', 'щепотка'], ['oil', 'для сковороды'], ['butter', 'для смазки']],
    steps: [['Смешивание', ['eggs', 'sugar', 'salt', 'milk', 'flour'], 5, 'Без комочков'], ['Настаивание', [], 20, 'Тесто отдыхает'], ['Жарка', ['oil'], 25, 'По 1 минуте с каждой стороны'], ['Смешивание', ['butter'], 1, 'Смазать стопку']],
  },
  {
    name: 'Креветки в чесночном масле', dish: 'Закуски',
    ingredients: [['shrimp', '300 г'], ['garlic', '4 зубчика'], ['butter', '40 г'], ['parsley', 'пучок'], ['lemon', '½ шт'], ['salt', 'по вкусу']],
    steps: [['Нарезка', ['garlic', 'parsley'], 3], ['Жарка', ['butter', 'garlic'], 2, 'Не давать чесноку потемнеть'], ['Жарка', ['shrimp'], 4], ['Смешивание', ['parsley', 'lemon', 'salt'], 1]],
  },
];
