// Клиент «Книги рецептов»: работает с REST API сервера.
(async () => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = (m) => (m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч${m % 60 ? ' ' + (m % 60) + ' мин' : ''}`);
  const DIFF_NAME = { easy: 'Простое', mid: 'Среднее', hard: 'Сложное' };
  const TIMES = [['all', 'Любое'], ['15', 'до 15 мин'], ['30', 'до 30 мин'], ['60', 'до 1 часа'], ['61+', 'больше часа']];
  const DIFFS = [['easy', 'Простое'], ['mid', 'Среднее'], ['hard', 'Сложное']];

  async function api(path, options = {}) {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.errors || ['Ошибка сервера']).join('. '));
    return data;
  }

  // ---------- справочники ----------
  let meta, ingredients;
  try {
    [meta, ingredients] = await Promise.all([api('/api/meta'), api('/api/ingredients')]);
  } catch (e) {
    $('grid').innerHTML = `<div class="empty">Не удалось подключиться к серверу: ${esc(e.message)}. Запустите его командой npm start.</div>`;
    return;
  }
  const CATS = Object.fromEntries(meta.ingredientCategories.map((c) => [c.id, c.name]));
  const OPS = meta.operations;
  const DISH = meta.dishCategories;
  const ingById = (id) => ingredients.find((i) => i.id === id) || { id, name: '?', category: 'other' };

  // ---------- каталог ----------
  const F = { q: '', dish: 'all', ing: new Set(), time: 'all', op: 'all', diff: new Set() };
  let lastResult = { items: [], total: 0, count: 0 };

  function chipRow(el, items, isOn, onClick) {
    el.innerHTML = items.map(([v, l]) => `<button class="chip" data-v="${esc(v)}" aria-pressed="${isOn(v)}">${esc(l)}</button>`).join('');
    el.onclick = (e) => { const b = e.target.closest('.chip'); if (b) { onClick(b.dataset.v); renderFilters(); runSearch(); } };
  }
  function renderFilters() {
    chipRow($('fDish'), [['all', 'Все'], ...DISH.map((d) => [d, d])], (v) => F.dish === v, (v) => (F.dish = v));
    chipRow($('fIng'), Object.entries(CATS), (v) => F.ing.has(v), (v) => (F.ing.has(v) ? F.ing.delete(v) : F.ing.add(v)));
    chipRow($('fTime'), TIMES, (v) => F.time === v, (v) => (F.time = v));
    chipRow($('fDiff'), DIFFS, (v) => F.diff.has(v), (v) => (F.diff.has(v) ? F.diff.delete(v) : F.diff.add(v)));
  }
  $('fOp').innerHTML = '<option value="all">Любой</option>' + OPS.map((o) => `<option>${esc(o)}</option>`).join('');
  $('fOp').onchange = (e) => { F.op = e.target.value; runSearch(); };
  let timer;
  $('q').oninput = (e) => { F.q = e.target.value.trim(); clearTimeout(timer); timer = setTimeout(runSearch, 150); };
  $('reset').onclick = () => {
    Object.assign(F, { q: '', dish: 'all', ing: new Set(), time: 'all', op: 'all', diff: new Set() });
    $('q').value = ''; $('fOp').value = 'all'; renderFilters(); runSearch();
  };

  function queryString() {
    const p = new URLSearchParams();
    if (F.q) p.set('q', F.q);
    if (F.dish !== 'all') p.set('dish', F.dish);
    if (F.ing.size) p.set('ingredientCategories', [...F.ing].join(','));
    if (F.time === '61+') p.set('minMinutes', '61');
    else if (F.time !== 'all') p.set('maxMinutes', F.time);
    if (F.op !== 'all') p.set('operation', F.op);
    if (F.diff.size) p.set('difficulty', [...F.diff].join(','));
    return p.toString();
  }
  let searchSeq = 0;
  async function runSearch() {
    const seq = ++searchSeq;
    $('grid').classList.add('loading');
    try {
      const data = await api('/api/recipes?' + queryString());
      if (seq !== searchSeq) return; // пришёл ответ на устаревший запрос
      lastResult = data;
      renderGrid();
    } catch (e) {
      $('grid').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    } finally {
      if (seq === searchSeq) $('grid').classList.remove('loading');
    }
  }
  function card(r) {
    const names = r.ingredients.map((x) => x.name);
    return `<button class="card" data-id="${r.id}">
      ${r.isUser ? '<span class="mine">Мой рецепт</span>' : ''}
      <h3>${esc(r.name)}</h3>
      <div class="meta"><span>${esc(r.dish)}</span><span class="time">${fmtTime(r.totalMinutes)}</span><span class="pill d-${r.difficulty}">${DIFF_NAME[r.difficulty]} · ${r.steps.length} оп.</span></div>
      <div class="ops">${r.methods.map((o) => `<span class="op">${esc(o)}</span>`).join('')}</div>
      <p class="ingline">${esc(names.slice(0, 6).join(', '))}${names.length > 6 ? ` и ещё ${names.length - 6}` : ''}</p>
    </button>`;
  }
  function renderGrid() {
    const { items, total, count } = lastResult;
    $('count').textContent = `Найдено: ${count} из ${total}`;
    $('grid').innerHTML = items.length ? items.map(card).join('') : '<div class="empty">Ничего не нашлось. Уберите часть фильтров или поищите другой ингредиент.</div>';
    renderFacts();
  }
  $('grid').onclick = (e) => { const c = e.target.closest('.card'); if (c) openRecipe(Number(c.dataset.id)); };

  function renderFacts() {
    $('facts').innerHTML = `<span><b>${lastResult.total}</b> рецептов в базе</span><span><b>${ingredients.length}</b> ингредиентов в ${Object.keys(CATS).length} группах</span><span><b>${OPS.length}</b> операций</span>`;
  }

  // ---------- карточка рецепта ----------
  let lastFocus = null;
  async function openRecipe(id) {
    let r;
    try { r = await api('/api/recipes/' + id); } catch (e) { return alertMsg(e.message); }
    const groups = {};
    r.ingredients.forEach((x) => (groups[x.category] = groups[x.category] || []).push([x.name, x.quantity]));
    const ingHtml = Object.keys(CATS).filter((c) => groups[c]).map((c) => `<span class="label">${esc(CATS[c])}</span><ul class="ilist">${groups[c].map(([n, q]) => `<li><span>${esc(n)}</span><span>${esc(q)}</span></li>`).join('')}</ul>`).join('');
    const nameOf = (iid) => (r.ingredients.find((x) => x.ingredientId === iid) || ingById(iid)).name;
    const stepsHtml = r.steps.map((s) => `<li><div><div class="sh"><b>${esc(s.operation)}</b><span class="time" style="font-size:12.5px;color:var(--muted)">${s.minutes} мин</span></div>${s.ingredientIds.length ? `<p>${esc(s.ingredientIds.map(nameOf).join(', '))}</p>` : ''}${s.note ? `<p>${esc(s.note)}</p>` : ''}</div></li>`).join('');
    const ov = $('overlay');
    ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="dTitle">
      <button class="close" id="dClose" aria-label="Закрыть">×</button>
      <h2 id="dTitle">${esc(r.name)}</h2>
      <div class="meta" style="margin-top:10px"><span>${esc(r.dish)}</span><span class="time">${fmtTime(r.totalMinutes)}</span><span class="pill d-${r.difficulty}">${DIFF_NAME[r.difficulty]}</span><span>${r.steps.length} операций</span></div>
      <div class="detail"><div><span class="label" style="display:block;margin-bottom:8px;color:var(--ink)">Ингредиенты</span>${ingHtml}</div>
      <div><span class="label" style="color:var(--ink)">Шаги</span><ol class="steps">${stepsHtml}</ol></div></div>
      ${r.isUser ? '<div id="delZone"><button class="danger" id="dDel">Удалить рецепт</button></div>' : ''}
    </div>`;
    ov.hidden = false; lastFocus = document.activeElement; $('dClose').focus();
    $('dClose').onclick = closeRecipe;
    if (r.isUser) {
      $('dDel').onclick = () => {
        $('delZone').innerHTML = `<div class="row" style="margin-top:18px;align-items:center"><span style="flex:0 1 auto">Удалить «${esc(r.name)}» без возможности восстановить?</span><button class="danger" id="dYes" style="margin:0;flex:0 0 auto">Да, удалить</button><button class="link" id="dNo" style="flex:0 0 auto">Отмена</button></div>`;
        $('dYes').onclick = async () => {
          try { await api('/api/recipes/' + r.id, { method: 'DELETE' }); closeRecipe(); runSearch(); }
          catch (e) { $('delZone').innerHTML = `<p class="msg err">${esc(e.message)}</p>`; }
        };
        $('dNo').onclick = () => openRecipe(id);
      };
    }
  }
  function closeRecipe() { $('overlay').hidden = true; $('overlay').innerHTML = ''; if (lastFocus) lastFocus.focus(); }
  function alertMsg(text) { $('count').textContent = text; }
  $('overlay').onclick = (e) => { if (e.target.id === 'overlay') closeRecipe(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('overlay').hidden) closeRecipe(); });

  // ---------- вкладки ----------
  function showTab(name) {
    const b = name === 'builder';
    $('view-catalog').hidden = b; $('view-builder').hidden = !b;
    $('tab-catalog').setAttribute('aria-selected', !b); $('tab-builder').setAttribute('aria-selected', b);
  }
  $('tab-catalog').onclick = () => showTab('catalog');
  $('tab-builder').onclick = () => showTab('builder');

  // ---------- добавление рецепта ----------
  const emptyDraft = () => ({ name: '', dish: DISH[1], ingredients: [], steps: [] });
  let draft = emptyDraft();
  const stepSel = new Set();
  $('bDish').innerHTML = DISH.map((d) => `<option>${esc(d)}</option>`).join('');
  $('bDish').value = draft.dish;
  $('nCat').innerHTML = Object.entries(CATS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('sOp').innerHTML = OPS.map((o) => `<option>${esc(o)}</option>`).join('');
  $('bName').oninput = (e) => { draft.name = e.target.value; };
  $('bDish').onchange = (e) => { draft.dish = e.target.value; };
  $('bFind').oninput = renderCatalog;

  const hasIng = (id) => draft.ingredients.some((x) => x.ingredientId === id);
  function renderCatalog() {
    const q = $('bFind').value.trim().toLowerCase();
    const html = Object.entries(CATS).map(([c, label]) => {
      const list = ingredients.filter((i) => i.category === c && (!q || i.name.toLowerCase().includes(q)));
      if (!list.length) return '';
      return `<div class="fgroup"><span class="label">${esc(label)}</span><div class="chips">${list.map((i) => `<button class="chip" data-id="${i.id}" aria-pressed="${hasIng(i.id)}">${esc(i.name)}</button>`).join('')}</div></div>`;
    }).join('');
    $('bCatalog').innerHTML = html || '<p class="hint">Такого ингредиента нет. Добавьте его в справочник ниже.</p>';
  }
  $('bCatalog').onclick = (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const id = Number(b.dataset.id);
    if (hasIng(id)) removeIng(id); else draft.ingredients.push({ ingredientId: id, quantity: '' });
    renderBuilder();
  };
  function removeIng(id) {
    draft.ingredients = draft.ingredients.filter((x) => x.ingredientId !== id);
    stepSel.delete(id);
    draft.steps.forEach((s) => (s.ingredientIds = s.ingredientIds.filter((x) => x !== id)));
  }
  function renderSel() {
    $('bSel').innerHTML = draft.ingredients.length
      ? draft.ingredients.map((x, i) => { const g = ingById(x.ingredientId);
        return `<li><span>${esc(g.name)}<small>${esc(CATS[g.category])}</small></span><input class="input" id="qty-${g.id}" data-i="${i}" value="${esc(x.quantity)}" placeholder="200 г"><button class="x" data-rm="${g.id}" aria-label="Убрать ${esc(g.name)}">×</button></li>`; }).join('')
      : '<li class="hint">Выберите ингредиенты слева.</li>';
  }
  $('bSel').oninput = (e) => { if (e.target.dataset.i != null) draft.ingredients[Number(e.target.dataset.i)].quantity = e.target.value; };
  $('bSel').onclick = (e) => { const id = e.target.dataset.rm; if (id) { removeIng(Number(id)); renderBuilder(); } };

  function renderStepIng() {
    $('sIng').innerHTML = draft.ingredients.length
      ? draft.ingredients.map((x) => `<button class="chip" data-id="${x.ingredientId}" aria-pressed="${stepSel.has(x.ingredientId)}">${esc(ingById(x.ingredientId).name)}</button>`).join('')
      : '<span class="hint">Сначала выберите ингредиенты.</span>';
  }
  $('sIng').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; const id = Number(b.dataset.id); stepSel.has(id) ? stepSel.delete(id) : stepSel.add(id); renderStepIng(); };

  function renderSteps() {
    $('bSteps').innerHTML = draft.steps.length
      ? draft.steps.map((s, i) => `<li><div><div class="sh"><b>${esc(s.operation)}</b><span class="time" style="font-size:12.5px;color:var(--muted)">${s.minutes} мин</span><button class="x" data-del="${i}" aria-label="Удалить шаг">×</button></div>${s.ingredientIds.length ? `<p>${esc(s.ingredientIds.map((id) => ingById(id).name).join(', '))}</p>` : ''}${s.note ? `<p>${esc(s.note)}</p>` : ''}</div></li>`).join('')
      : '<li style="display:block" class="hint">Пока нет операций. Сложные блюда состоят из многих шагов: нарезка, обжарка, тушение…</li>';
  }
  $('bSteps').onclick = (e) => { const i = e.target.dataset.del; if (i != null) { draft.steps.splice(Number(i), 1); renderBuilder(); } };
  $('sAdd').onclick = () => {
    const minutes = Math.round(Number($('sMin').value));
    if (!(minutes > 0)) return msg('Укажите длительность операции в минутах.', 'err');
    draft.steps.push({ operation: $('sOp').value, minutes, note: $('sNote').value.trim(), ingredientIds: draft.ingredients.map((x) => x.ingredientId).filter((id) => stepSel.has(id)) });
    stepSel.clear(); $('sNote').value = ''; msg('', '');
    renderBuilder();
  };
  function renderSummary() {
    const t = draft.steps.reduce((s, x) => s + x.minutes, 0);
    const n = draft.steps.length;
    const d = n <= 3 ? 'easy' : n <= 6 ? 'mid' : 'hard';
    const ops = [...new Set(draft.steps.map((s) => s.operation))];
    $('bSum').innerHTML = `<span class="label" style="color:var(--ink)">Итог</span><span class="time">${fmtTime(t)}</span>${n ? `<span class="pill d-${d}">${DIFF_NAME[d]}</span>` : ''}<span>${draft.ingredients.length} ингр. · ${n} оп.</span>${n ? `<span class="ops">${ops.map((o) => `<span class="op">${esc(o)}</span>`).join('')}</span>` : ''}`;
  }
  function msg(t, cls) { $('bMsg').textContent = t; $('bMsg').className = 'msg ' + cls; }
  function renderBuilder() { renderCatalog(); renderSel(); renderStepIng(); renderSteps(); renderSummary(); }

  $('nAdd').onclick = async () => {
    const name = $('nName').value.trim();
    if (!name) return msg('Введите название нового ингредиента.', 'err');
    try {
      const ing = await api('/api/ingredients', { method: 'POST', body: JSON.stringify({ name, category: $('nCat').value }) });
      ingredients.push(ing);
      ingredients.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      draft.ingredients.push({ ingredientId: ing.id, quantity: '' });
      $('nName').value = ''; msg(`«${ing.name}» добавлен в справочник и в рецепт.`, 'ok');
      renderBuilder(); renderFacts();
    } catch (e) { msg(e.message, 'err'); }
  };
  $('bSave').onclick = async () => {
    const btn = $('bSave');
    btn.disabled = true;
    try {
      const saved = await api('/api/recipes', { method: 'POST', body: JSON.stringify({ ...draft, name: draft.name.trim() }) });
      clearDraft();
      msg(`Рецепт «${saved.name}» сохранён в базу.`, 'ok');
      runSearch();
    } catch (e) { msg(e.message, 'err'); }
    finally { btn.disabled = false; }
  };
  function clearDraft() { draft = emptyDraft(); stepSel.clear(); $('bName').value = ''; $('bDish').value = draft.dish; $('bFind').value = ''; renderBuilder(); }
  $('bClear').onclick = () => { clearDraft(); msg('', ''); };

  renderFilters();
  renderBuilder();
  runSearch();
})();
