// JP Bound Clinic Finder price page: filter, sort and recalculate the static rows.
// Every row is already in the HTML (for Naver); this script only hides, reorders and rewrites numbers.
(() => {
  const form = document.querySelector('.controls');
  const list = document.getElementById('rows');
  if (!form || !list) return;
  const rows = [...list.children];
  const countEl = document.getElementById('count');
  const basisEl = document.getElementById('list-basis');
  const emptyEl = document.getElementById('empty');
  const sortEl = document.getElementById('sort');
  const rateEl = document.getElementById('rate');
  const shareBtn = document.getElementById('share');
  const citySel = form.elements.city;
  const defaultRate = Number(rateEl.value);
  const DEFAULT_DOSE = form.querySelector('[name="dose"][checked]')?.value || '5';
  const yen = (n) => '¥' + n.toLocaleString('ko-KR');
  const won = (n, rate) => '약 ' + (Math.round(n * rate / 1000) / 10).toString().replace(/\.0$/, '') + '만원';
  const nameCollator = new Intl.Collator('ko');

  // Parse each row once.
  const items = rows.map((li) => {
    const d = li.dataset;
    const arr = (s) => (s ? s.split(',').map(Number) : null);
    return {
      li, city: d.city, name: d.name, fee: d.fee === '' ? null : Number(d.fee),
      flags: { ko: d.ko === '1', tour: d.tour === '1', hotel: d.hotel === '1', online: d.online === '1', tsu: d.tsu === '1' },
      p: { '2.5': arr(d.p25), '5': arr(d.p5) }, c: { '2.5': arr(d.c25), '5': arr(d.c5) },
      label: li.querySelector('.r-name strong').textContent,
      yenEl: li.querySelector('.r-yen'), wonEl: li.querySelector('.r-won'), calcEl: li.querySelector('.r-calc'),
    };
  });
  const cityOptions = [...citySel.options].map((o) => ({ o, base: o.textContent.replace(/\s\d+$/, '') }));

  function state() {
    const f = new FormData(form);
    return {
      q: (f.get('q') || '').trim().toLowerCase(), city: f.get('city') || '', dose: f.get('dose') || DEFAULT_DOSE,
      m: Number(f.get('m') || 1), f: f.getAll('f'), sort: sortEl.value,
      rate: Number(rateEl.value) > 0 ? Number(rateEl.value) / 100 : defaultRate / 100,
    };
  }

  function apply({ push = true } = {}) {
    const s = state();
    const perCity = {};
    let shown = 0;
    for (const it of items) {
      const prices = it.p[s.dose];
      it.total = prices ? prices[s.m - 1] + (it.fee || 0) : null;
      const matchesFilters = prices && s.f.every((k) => it.flags[k]) && (!s.q || it.name.includes(s.q));
      if (matchesFilters) perCity[it.city] = (perCity[it.city] || 0) + 1;
      const visible = matchesFilters && (!s.city || it.city === s.city);
      it.li.hidden = !visible;
      if (!prices) continue;
      it.yenEl.textContent = yen(it.total);
      it.wonEl.textContent = won(it.total, s.rate);
      it.calcEl.hidden = !(it.c[s.dose] && it.c[s.dose][s.m - 1]);
      if (visible) shown++;
    }
    const sorted = [...items].sort((a, b) =>
      s.sort === 'name' ? nameCollator.compare(a.label, b.label)
        : (a.total ?? 1e12) - (b.total ?? 1e12) || nameCollator.compare(a.label, b.label));
    list.append(...sorted.map((it) => it.li));
    const all = Object.values(perCity).reduce((a, b) => a + b, 0);
    for (const { o, base } of cityOptions) o.textContent = `${base} ${o.value ? perCity[o.value] || 0 : all}`;
    countEl.value = `${shown}곳`;
    countEl.textContent = `${shown}곳`;
    emptyEl.hidden = shown > 0;
    basisEl.textContent = `${s.dose}mg · ${s.m}개월(${s.m * 4}펜) · 약값+진찰료 총액`;
    if (push) history.replaceState(null, '', urlFor(s));
  }

  function urlFor(s) {
    const p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    if (s.city) p.set('city', s.city);
    if (s.dose !== DEFAULT_DOSE) p.set('dose', s.dose);
    if (s.m !== 1) p.set('m', String(s.m));
    if (s.f.length) p.set('f', s.f.join(','));
    if (s.sort !== 'price') p.set('sort', s.sort);
    const qs = p.toString();
    return location.pathname + (qs ? '?' + qs : '');
  }

  function restore() {
    const p = new URLSearchParams(location.search);
    if (p.get('q')) form.elements.q.value = p.get('q');
    if (p.get('city') && [...citySel.options].some((o) => o.value === p.get('city'))) citySel.value = p.get('city');
    const dose = form.querySelector(`[name="dose"][value="${CSS.escape(p.get('dose') || DEFAULT_DOSE)}"]`);
    if (dose) dose.checked = true;
    const m = form.querySelector(`[name="m"][value="${CSS.escape(p.get('m') || '1')}"]`);
    if (m) m.checked = true;
    for (const k of (p.get('f') || '').split(',')) {
      const box = form.querySelector(`[name="f"][value="${CSS.escape(k)}"]`);
      if (box) box.checked = true;
    }
    if (p.get('sort') === 'name') sortEl.value = 'name';
    const saved = Number(localStorage.getItem('jpb-rate'));
    if (saved > 0) rateEl.value = String(saved);
  }

  let qTimer;
  form.addEventListener('input', (e) => {
    if (e.target.name === 'q') { clearTimeout(qTimer); qTimer = setTimeout(apply, 120); return; }
    apply();
  });
  sortEl.addEventListener('change', () => apply());
  rateEl.addEventListener('input', () => {
    if (Number(rateEl.value) > 0) localStorage.setItem('jpb-rate', rateEl.value);
    apply({ push: false });
  });
  form.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' || e.target.type === 'radio') {
      if ('vibrate' in navigator && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(8);
    }
  });

  shareBtn.addEventListener('click', async () => {
    const url = new URL(urlFor(state()), location.href).href;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = '복사했어요';
      setTimeout(() => { shareBtn.textContent = '링크 복사'; }, 1800);
    } catch { /* share sheet closed */ }
  });

  restore();
  apply({ push: false });
})();
