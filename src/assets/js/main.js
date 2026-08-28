(() => {
  const body = document.body;
  const openBtn = document.getElementById('menu-open');
  const closeBtn = document.getElementById('menu-close');
  const menu = document.getElementById('side-menu');
  const overlay = document.getElementById('side-overlay');
  let lastFocus = null;

  const menuFocusable = () => menu ? [...menu.querySelectorAll('a[href],button:not([disabled])')] : [];
  function openMenu() {
    if (!menu || !overlay || !openBtn) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => { menu.classList.add('open'); overlay.classList.add('open'); });
    menu.setAttribute('aria-hidden','false');
    openBtn.setAttribute('aria-expanded','true');
    body.classList.add('no-scroll');
    menuFocusable()[0]?.focus();
  }
  function closeMenu() {
    if (!menu || !overlay || !openBtn) return;
    menu.classList.remove('open'); overlay.classList.remove('open');
    menu.setAttribute('aria-hidden','true');
    openBtn.setAttribute('aria-expanded','false');
    body.classList.remove('no-scroll');
    setTimeout(() => { overlay.hidden = true; },180);
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
  openBtn?.addEventListener('click',openMenu);
  closeBtn?.addEventListener('click',closeMenu);
  overlay?.addEventListener('click',closeMenu);
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && menu?.classList.contains('open')) closeMenu();
    if (event.key === 'Tab' && menu?.classList.contains('open')) {
      const items = menuFocusable(); if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  const nav = document.getElementById('top-nav');
  document.querySelector('[data-nav="left"]')?.addEventListener('click',() => nav?.scrollBy({left:-240,behavior:'smooth'}));
  document.querySelector('[data-nav="right"]')?.addEventListener('click',() => nav?.scrollBy({left:240,behavior:'smooth'}));

  const catalog = document.querySelector('[data-catalog-kind]');
  if (!catalog) return;

  const lang = catalog.dataset.lang || document.documentElement.lang || 'ru';
  const kind = catalog.dataset.catalogKind;
  const resultsLabel = catalog.dataset.resultsLabel || 'Results';
  const showingLabel = catalog.dataset.showingLabel || 'Showing';
  const search = document.getElementById('catalog-search');
  const status = document.getElementById('search-status');
  const staticWrap = document.getElementById('catalog-static');
  const dynamicWrap = document.getElementById('catalog-dynamic');
  const staticCards = document.getElementById('people-grid');
  const staticTable = document.getElementById('people-table');
  const dynamicCards = document.getElementById('dynamic-cards');
  const dynamicTable = document.getElementById('dynamic-table');
  const dynamicTableBody = document.getElementById('dynamic-table-body');
  const loadMore = document.getElementById('load-more');
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  const filterBtn = document.getElementById('filters-btn');
  const filterClose = document.getElementById('filters-close');
  const filterSheet = document.getElementById('catalog-filters');
  const filterOverlay = document.getElementById('filter-overlay');
  const gender = document.getElementById('filter-gender');
  const prison = document.getElementById('filter-prison');
  const region = document.getElementById('filter-region');
  const article = document.getElementById('filter-article');
  const sort = document.getElementById('catalog-sort');
  const desktop = matchMedia('(min-width:1100px)');

  let currentView = 'cards';
  let indexPromise = null;
  let filtered = [];
  let shown = 50;
  let filtersLastFocus = null;

  function normalize(value) {
    return String(value || '').toLocaleLowerCase('ru').normalize('NFD').replace(/\p{Diacritic}/gu,'').replaceAll('ё','е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  }

  function setView(view) {
    currentView = view;
    for (const button of viewButtons) button.setAttribute('aria-pressed',String(button.dataset.view === view));
    const dynamicActive = dynamicWrap && !dynamicWrap.hidden;
    if (dynamicActive) {
      if (dynamicCards) dynamicCards.hidden = view !== 'cards';
      if (dynamicTable) dynamicTable.hidden = view !== 'table';
    } else {
      if (staticCards) staticCards.hidden = view !== 'cards';
      if (staticTable) staticTable.hidden = view !== 'table';
    }
  }
  for (const button of viewButtons) button.addEventListener('click',() => setView(button.dataset.view));

  const filterFocusable = () => filterSheet ? [...filterSheet.querySelectorAll('button,select,input,a[href]')].filter(el => !el.disabled) : [];
  function syncFilterAccessibility() {
    if (!filterSheet) return;
    if (desktop.matches) {
      filterSheet.classList.add('open');
      filterSheet.removeAttribute('aria-hidden');
      if (filterOverlay) filterOverlay.hidden = true;
      filterBtn?.setAttribute('aria-expanded','true');
      body.classList.remove('no-scroll');
    } else if (!filterSheet.classList.contains('mobile-open')) {
      filterSheet.classList.remove('open');
      filterSheet.setAttribute('aria-hidden','true');
      filterBtn?.setAttribute('aria-expanded','false');
    }
  }
  function openFilters() {
    if (!filterSheet || desktop.matches) return;
    filtersLastFocus = document.activeElement;
    filterSheet.classList.add('open','mobile-open');
    filterSheet.setAttribute('aria-hidden','false');
    filterBtn?.setAttribute('aria-expanded','true');
    if (filterOverlay) { filterOverlay.hidden = false; requestAnimationFrame(() => filterOverlay.classList.add('open')); }
    body.classList.add('no-scroll');
    filterFocusable()[0]?.focus();
  }
  function closeFilters() {
    if (!filterSheet || desktop.matches) return;
    filterSheet.classList.remove('open','mobile-open');
    filterSheet.setAttribute('aria-hidden','true');
    filterBtn?.setAttribute('aria-expanded','false');
    filterOverlay?.classList.remove('open');
    setTimeout(() => { if (filterOverlay) filterOverlay.hidden = true; },180);
    body.classList.remove('no-scroll');
    if (filtersLastFocus instanceof HTMLElement) filtersLastFocus.focus();
  }
  filterBtn?.addEventListener('click',openFilters);
  filterClose?.addEventListener('click',closeFilters);
  filterOverlay?.addEventListener('click',closeFilters);
  desktop.addEventListener?.('change',syncFilterAccessibility);
  syncFilterAccessibility();

  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && filterSheet?.classList.contains('mobile-open')) closeFilters();
    if (event.key === 'Tab' && filterSheet?.classList.contains('mobile-open')) {
      const items = filterFocusable(); if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  function loadIndex() {
    indexPromise ||= fetch(`/search-index/${encodeURIComponent(lang)}.json`, {credentials:'same-origin'})
      .then(response => { if (!response.ok) throw new Error('SEARCH_INDEX_UNAVAILABLE'); return response.json(); })
      .then(data => Array.isArray(data) ? data : []);
    return indexPromise;
  }

  function activeDynamicQuery() {
    return Boolean(search?.value.trim() || gender?.value || prison?.value || region?.value || article?.value || (sort?.value && sort.value !== 'name'));
  }

  function safePortrait(record) {
    return typeof record.portrait === 'string' && record.portrait.startsWith('/assets/') ? record.portrait : null;
  }

  function createCard(record) {
    const card = document.createElement('article'); card.className = 'person-card';
    const portrait = safePortrait(record);
    if (portrait) {
      const img = document.createElement('img'); img.className = 'avatar portrait'; img.src = portrait; img.alt = record.name || ''; img.loading = 'lazy'; img.decoding = 'async'; card.append(img);
    } else {
      const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.setAttribute('aria-hidden','true'); avatar.textContent = record.initials || ''; card.append(avatar);
    }
    const main = document.createElement('div'); main.className = 'person-card-main';
    const pill = document.createElement('p'); pill.className = 'status-pill'; pill.textContent = record.status_label || '';
    const h2 = document.createElement('h2'); const link = document.createElement('a'); link.href = record.profile_url; link.textContent = record.name || record.id; h2.append(link);
    main.append(pill,h2);
    if (record.prison_name) { const meta = document.createElement('p'); meta.className = 'card-meta'; meta.textContent = record.prison_name; main.append(meta); }
    if (record.attribution) { const src = document.createElement('span'); src.className = 'source-mini'; src.textContent = record.attribution; main.append(src); }
    const id = document.createElement('p'); id.className = 'record-id'; id.textContent = record.id; main.append(id);
    card.append(main); return card;
  }

  function createRow(record) {
    const tr = document.createElement('tr');
    const cells = [record.name || record.id, record.status_label || '', record.prison_name || '', (record.articles || []).join(', '), record.updated_at || ''];
    cells.forEach((value,index) => { const td = document.createElement('td'); if (index === 0) { const a = document.createElement('a'); a.href = record.profile_url; a.textContent = value; td.append(a); } else td.textContent = value; tr.append(td); });
    return tr;
  }

  function renderDynamic() {
    if (!dynamicCards || !dynamicTableBody || !dynamicWrap || !staticWrap) return;
    const subset = filtered.slice(0,shown);
    dynamicCards.replaceChildren(...subset.map(createCard));
    dynamicTableBody.replaceChildren(...subset.map(createRow));
    staticWrap.hidden = true; dynamicWrap.hidden = false;
    if (loadMore) loadMore.hidden = shown >= filtered.length;
    if (status) status.textContent = `${resultsLabel}: ${filtered.length} · ${showingLabel}: ${Math.min(shown,filtered.length)}`;
    setView(currentView);
  }

  function restoreStatic() {
    if (!dynamicWrap || !staticWrap) return;
    dynamicWrap.hidden = true; staticWrap.hidden = false;
    if (status) status.textContent = '';
    setView(currentView);
  }

  async function applySearch() {
    if (!activeDynamicQuery()) { restoreStatic(); return; }
    try {
      const data = await loadIndex();
      const q = normalize(search?.value);
      filtered = data.filter(record => {
        if (!(record.categories || []).includes(kind)) return false;
        if (q && !normalize(record.search_text).includes(q)) return false;
        if (gender?.value && record.gender !== gender.value) return false;
        if (prison?.value && record.prison_name !== prison.value) return false;
        if (region?.value && record.region !== region.value) return false;
        if (article?.value && !(record.articles || []).includes(article.value)) return false;
        return true;
      });
      if (sort?.value === 'updated') filtered.sort((a,b)=>(b.updated_at || '').localeCompare(a.updated_at || '') || (a.name || '').localeCompare(b.name || ''));
      else filtered.sort((a,b)=>(a.name || '').localeCompare(b.name || '',lang));
      shown = 50; renderDynamic();
    } catch {
      if (status) status.textContent = 'Search unavailable';
    }
  }

  search?.addEventListener('input',applySearch);
  for (const control of [gender,prison,region,article,sort]) control?.addEventListener('change',applySearch);
  loadMore?.addEventListener('click',() => { shown += 50; renderDynamic(); });

  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q && search) { search.value = q; applySearch(); }
  setView('cards');
})();
