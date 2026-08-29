(() => {
  const page = document.querySelector('.global-search-page');
  if (!page) return;
  const input = document.getElementById('global-search');
  const results = document.getElementById('global-search-results');
  const status = document.getElementById('global-search-status');
  const buttons = [...document.querySelectorAll('[data-search-type]')];
  let data = [];
  let activeType = 'all';

  const normalize = value => String(value || '')
    .toLocaleLowerCase('ru')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll('ё','е')
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .trim();

  function resultCard(item) {
    const article = document.createElement('article');
    article.className = 'person-card global-search-result';
    const main = document.createElement('div');
    main.className = 'person-card-main';
    const type = document.createElement('p');
    type.className = 'eyebrow';
    type.textContent = item.t;
    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.href = item.u;
    link.textContent = item.n;
    heading.append(link);
    main.append(type, heading);
    if (item.d) {
      const meta = document.createElement('p');
      meta.className = 'card-meta';
      meta.textContent = item.d;
      main.append(meta);
    }
    article.append(main);
    return article;
  }

  function render() {
    const query = normalize(input.value);
    const params = new URLSearchParams(location.search);
    if (query) params.set('q', input.value.trim()); else params.delete('q');
    const next = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
    history.replaceState(null,'',next);
    results.replaceChildren();
    if (query.length < 2) {
      status.textContent = page.dataset.hint;
      return;
    }
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = data
      .filter(item => activeType === 'all' || item.t === activeType)
      .filter(item => tokens.every(token => String(item.q || '').includes(token)))
      .map(item => {
        const name = normalize(item.n);
        let score = 0;
        if (name === query) score += 100;
        if (name.startsWith(query)) score += 50;
        if (name.includes(query)) score += 20;
        if (item.t === 'person') score += 5;
        return {item,score};
      })
      .sort((a,b) => b.score - a.score || String(a.item.n).localeCompare(String(b.item.n)))
      .slice(0,100);
    status.textContent = matches.length ? `${page.dataset.found}: ${matches.length}` : page.dataset.empty;
    const frag = document.createDocumentFragment();
    for (const {item} of matches) frag.append(resultCard(item));
    results.append(frag);
  }

  fetch(page.dataset.index, {credentials:'same-origin'})
    .then(response => { if (!response.ok) throw new Error(`SEARCH_INDEX_HTTP_${response.status}`); return response.json(); })
    .then(index => { data = Array.isArray(index) ? index : []; render(); })
    .catch(() => { status.textContent = page.dataset.empty; });

  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render,80); });
  for (const button of buttons) button.addEventListener('click', () => {
    activeType = button.dataset.searchType;
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    render();
  });
  const initial = new URLSearchParams(location.search).get('q');
  if (initial) input.value = initial;
})();
