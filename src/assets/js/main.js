(() => {
  const body = document.body;
  const openBtn = document.getElementById('menu-open');
  const closeBtn = document.getElementById('menu-close');
  const menu = document.getElementById('side-menu');
  const overlay = document.getElementById('side-overlay');
  let lastFocus = null;

  const focusable = () => menu ? [...menu.querySelectorAll('a[href],button:not([disabled])')] : [];
  function openMenu() {
    if (!menu || !overlay || !openBtn) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => { menu.classList.add('open'); overlay.classList.add('open'); });
    menu.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    body.classList.add('no-scroll');
    focusable()[0]?.focus();
  }
  function closeMenu() {
    if (!menu || !overlay || !openBtn) return;
    menu.classList.remove('open'); overlay.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    body.classList.remove('no-scroll');
    setTimeout(() => { overlay.hidden = true; }, 180);
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
  openBtn?.addEventListener('click', openMenu);
  closeBtn?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu?.classList.contains('open')) closeMenu();
    if (e.key === 'Tab' && menu?.classList.contains('open')) {
      const items = focusable(); if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  const nav = document.getElementById('top-nav');
  document.querySelector('[data-nav="left"]')?.addEventListener('click', () => nav?.scrollBy({left:-240,behavior:'smooth'}));
  document.querySelector('[data-nav="right"]')?.addEventListener('click', () => nav?.scrollBy({left:240,behavior:'smooth'}));

  const search = document.getElementById('catalog-search');
  const grid = document.getElementById('people-grid');
  const status = document.getElementById('search-status');
  if (search && grid) {
    const cards = [...grid.querySelectorAll('.person-card')];
    search.addEventListener('input', () => {
      const q = search.value.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('ё','е').trim();
      let visible = 0;
      for (const card of cards) {
        const text = card.textContent.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replaceAll('ё','е');
        const show = !q || text.includes(q); card.hidden = !show; if (show) visible++;
      }
      if (status) status.textContent = q ? `${visible}` : '';
    });
    const params = new URLSearchParams(location.search); const q = params.get('q');
    if (q) { search.value = q; search.dispatchEvent(new Event('input')); }
  }
})();
