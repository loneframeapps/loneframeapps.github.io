// JP Bound Clinic Finder price page (ko / en / ja): filter, sort and recalculate the static rows.
// Every row is already in the HTML (for search engines); this script only hides, reorders and rewrites numbers.
(() => {
  const form = document.querySelector('.controls');
  const list = document.getElementById('rows');
  if (!form || !list) return;
  const lang = document.documentElement.lang || 'ko';
  const T = {
    ko: { count: (n) => `${n}곳`, months: (d, m) => `${d}mg · ${m}개월(${m * 4}펜) · 약값+진찰료 총액`,
      copied: '복사했어요', copy: '링크 복사', money2: (n, r) => '약 ' + (Math.round(n * r / 1000) / 10).toString().replace(/\.0$/, '') + '만원' },
    en: { count: (n) => `${n} ${n === 1 ? 'clinic' : 'clinics'}`, months: (d, m) => `${d} mg · ${m} month${m > 1 ? 's' : ''} (${m * 4} pens) · medicine + consultation`,
      copied: 'Link copied', copy: 'Copy link', money2: (n, r) => '≈ US$' + Math.round(n * r).toLocaleString('en-US') },
    ja: { count: (n) => `${n}件`, months: (d, m) => `${d}mg・${m}か月（${m * 4}本）・薬代＋診察料の合計`,
      copied: 'コピーしました', copy: 'リンクをコピー', money2: () => '' },
  }[lang] || null;
  const rows = [...list.children];
  const countEl = document.getElementById('count');
  const basisEl = document.getElementById('list-basis');
  const emptyEl = document.getElementById('empty');
  const sortEl = document.getElementById('sort');
  const rateEl = document.getElementById('rate');          // ko: won per ¥100, en: dollars per ¥100, ja: none
  const shareBtn = document.getElementById('share');
  const mapBox = document.getElementById('map-box');
  const pins = [...document.querySelectorAll('.pin[data-value]')];
  const resetBtn = document.getElementById('map-reset');
  const citySel = form.elements.city;
  const rateKey = lang === 'ko' ? 'jpb-rate' : 'jpb-rate-' + lang;
  const defaultRate = rateEl ? Number(rateEl.value) : 0;
  const DEFAULT_DOSE = form.querySelector('[name="dose"][checked]')?.value || '5';
  const yen = (n) => '¥' + n.toLocaleString('en-US');
  const nameCollator = new Intl.Collator(lang);

  // Parse each row once.
  const items = rows.map((li) => {
    const d = li.dataset;
    const arr = (s) => (s ? s.split(',').map(Number) : null);
    return {
      li, city: d.city, region: d.region, name: d.name, fee: d.fee === '' ? null : Number(d.fee),
      flags: { ko: d.ko === '1', tour: d.tour === '1', hotel: d.hotel === '1', online: d.online === '1', tsu: d.tsu === '1' },
      p: { '2.5': arr(d.p25), '5': arr(d.p5) }, c: { '2.5': arr(d.c25), '5': arr(d.c5) },
      label: li.querySelector('.r-name strong').textContent,
      yenEl: li.querySelector('.r-yen'), wonEl: li.querySelector('.r-won'), calcEl: li.querySelector('.r-calc'),
    };
  });
  const cityOptions = [...citySel.options].map((o) => ({ o, base: o.textContent.replace(/\s\d+$/, '') }));
  // An area value is a city ("Tokyo") or a whole region ("r:kanto").
  const inArea = (it, v) => !v || (v.startsWith('r:') ? it.region === v.slice(2) : it.city === v);

  function state() {
    const f = new FormData(form);
    const r = rateEl && Number(rateEl.value) > 0 ? Number(rateEl.value) : defaultRate;
    return {
      q: (f.get('q') || '').trim().toLowerCase(), city: f.get('city') || '', dose: f.get('dose') || DEFAULT_DOSE,
      m: Number(f.get('m') || 1), f: f.getAll('f'), sort: sortEl.value, rate: r / 100,
    };
  }

  function apply({ push = true } = {}) {
    const s = state();
    const matched = [];
    let shown = 0;
    for (const it of items) {
      const prices = it.p[s.dose];
      it.total = prices ? prices[s.m - 1] + (it.fee || 0) : null;
      const ok = prices && s.f.every((k) => it.flags[k]) && (!s.q || it.name.includes(s.q));
      if (ok) matched.push(it);
      const visible = ok && inArea(it, s.city);
      it.li.hidden = !visible;
      if (!prices) continue;
      it.yenEl.textContent = yen(it.total);
      if (it.wonEl) it.wonEl.textContent = T.money2(it.total, s.rate);
      it.calcEl.hidden = !(it.c[s.dose] && it.c[s.dose][s.m - 1]);
      if (visible) shown++;
    }
    const sorted = [...items].sort((a, b) =>
      s.sort === 'name' ? nameCollator.compare(a.label, b.label)
        : (a.total ?? 1e12) - (b.total ?? 1e12) || nameCollator.compare(a.label, b.label));
    list.append(...sorted.map((it) => it.li));
    const n = (v) => matched.filter((it) => inArea(it, v)).length;
    for (const { o, base } of cityOptions) o.textContent = `${base} ${n(o.value)}`;
    for (const pin of pins) {
      const k = n(pin.dataset.value);
      pin.querySelector('b').textContent = k;
      pin.disabled = k === 0 && pin.dataset.value !== s.city;
      pin.setAttribute('aria-pressed', String(pin.dataset.value === s.city));
    }
    if (resetBtn) resetBtn.hidden = !s.city;
    countEl.value = countEl.textContent = T.count(shown);
    emptyEl.hidden = shown > 0;
    basisEl.textContent = T.months(s.dose, s.m);
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
    const saved = Number(localStorage.getItem(rateKey));
    if (rateEl && saved > 0) rateEl.value = String(saved);
  }

  let qTimer;
  form.addEventListener('input', (e) => {
    if (e.target.name === 'q') { clearTimeout(qTimer); qTimer = setTimeout(apply, 120); return; }
    apply();
  });
  sortEl.addEventListener('change', () => apply());
  if (rateEl) rateEl.addEventListener('input', () => {
    if (Number(rateEl.value) > 0) localStorage.setItem(rateKey, rateEl.value);
    apply({ push: false });
  });
  form.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' || e.target.type === 'radio') tick();
  });
  function tick() {
    if ('vibrate' in navigator && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate(8);
  }

  // Map: a pin picks its region in the area picker; tapping the active pin (or "show all") clears it.
  for (const pin of pins) pin.addEventListener('click', () => {
    citySel.value = citySel.value === pin.dataset.value ? '' : pin.dataset.value;
    tick();
    apply();
    if (!matchMedia('(min-width: 1000px)').matches) document.querySelector('.result-bar')?.scrollIntoView({ block: 'start' });
  });
  if (resetBtn) resetBtn.addEventListener('click', () => { citySel.value = ''; apply(); });
  // Desktop shows the map open in the side column; phones keep it folded under "map".
  const wide = matchMedia('(min-width: 1000px)');
  const syncMap = () => { if (mapBox && wide.matches) mapBox.open = true; };
  wide.addEventListener('change', syncMap);
  syncMap();

  shareBtn.addEventListener('click', async () => {
    const url = new URL(urlFor(state()), location.href).href;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      shareBtn.textContent = T.copied;
      setTimeout(() => { shareBtn.textContent = T.copy; }, 1800);
    } catch { /* share sheet closed */ }
  });

  restore();
  apply({ push: false });
})();
