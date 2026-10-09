/* ByLink, "a mordida". JavaScript puro, sem dependências. */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smooth = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const easeOutBack = (t) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rng = (seed) => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const NB = ' ';
  const brl2 = (v) => 'R$' + NB + v.toFixed(2).replace('.', ',');
  const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const brl0 = (v) => 'R$' + NB + intFmt.format(Math.round(v));
  const SVGNS = 'http://www.w3.org/2000/svg';

  // Preço por mês de cada período (pago adiantado). Valores da página; a API atualiza se responder.
  const PLAN_PRICES = {
    pro: { MONTHLY: 99.9, QUARTERLY: 94.9, SEMIANNUAL: 89.9, ANNUAL: 79.9 },
    elite: { MONTHLY: 249, QUARTERLY: 237, SEMIANNUAL: 224, ANNUAL: 199 },
  };
  const CYCLE_MONTHS = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 };
  const CYCLE_SLUG = { MONTHLY: 'mensal', QUARTERLY: 'trimestral', SEMIANNUAL: 'semestral', ANNUAL: 'anual' };
  const money = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const periodTotal = (monthly, cycle) => (Math.round(monthly * 100) * CYCLE_MONTHS[cycle]) / 100;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const MOBILE = matchMedia('(max-width: 899px)');

  /* ---------- Aba escondida pausa as animações ---------- */
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

  /* ---------- Menu do celular ---------- */
  const toggle = $('.nav-toggle');
  const menu = $('#menu');
  const header = $('.nav');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.hidden = !open;
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !header.contains(e.target)) setMenu(false); });
  MOBILE.addEventListener('change', () => { if (!MOBILE.matches) setMenu(false); });

  /* ---------- Divisão de títulos em palavras (uma vez, com semente) ---------- */
  const SQUIG = '<svg class="squig" viewBox="0 0 250 12" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M3 7 C 32 1, 52 11, 84 6 S 146 1, 176 7 S 232 11, 247 3"/></svg>';
  $$('.split').forEach((el) => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    const words = text.split(' ');
    const r = rng(Number(el.dataset.seed) || 1);
    const squig = el.dataset.squig;
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      s.style.setProperty('--th', ((i / words.length) * 0.55 + r() * 0.04).toFixed(3));
      if (squig && w.toLowerCase().startsWith(squig)) {
        s.classList.add('squig-word');
        s.insertAdjacentHTML('beforeend', SQUIG);
      }
      vis.append(s);
      if (i < words.length - 1) vis.append(' ');
    });
    el.append(sr, vis);
  });

  /* =========================================================
     O TOPO: a mordida
     ========================================================= */
  const hero = $('.hero');
  const stage = $('.stage', hero);
  const box = $('.burger-box', hero);
  const mask = $('#hero-bites');
  const crumbsG = $('.crumbs', hero);
  const chips = $$('.bchip', hero);
  const tag = $('.tag', hero);
  const tagLabel = $('.tag-label', tag);
  const tagVal = $('.tag-val', tag);

  const bands = $$('.band', hero).map((el) => ({
    el,
    a: Number(el.dataset.a),
    b: Number(el.dataset.b),
    ramp: Number(el.dataset.ramp) || 0,
    local: el.dataset.mode === 'local',
    first: el.classList.contains('band-1'),
    last: el.classList.contains('band-3'),
    op: -1,
    k: -1,
  }));
  // Palavras do staccato: o instante absoluto da mordida vira limiar local da faixa
  const band2 = bands.find((B) => B.local);
  $$('.pw', band2.el).forEach((w) => {
    const th = (Number(w.dataset.at) - band2.a) / (band2.b - band2.a);
    w.style.setProperty('--th', th.toFixed(3));
  });

  // As quatro mordidas (coordenadas no viewBox 0..1000 da foto)
  const CENTER = { x: 500, y: 470 };
  // 1 comissão (topo direito), 2 pagamento (esquerda alta), 3 mensalidade (base direita), 4 cupom (esquerda baixa)
  const BITES = [
    { cx: 905, cy: 115, R: 270, r: 44, n: 10, spread: 1.2, s: 0.20, e: 0.245, amt: 8.0, pal: ['#D9973F', '#B8722E', '#E7B04E'] },
    { cx: -60, cy: 450, R: 165, r: 32, n: 7, spread: 1.05, s: 0.26, e: 0.30, amt: 1.28, pal: ['#F2B01E', '#8A2E1E', '#B8722E'] },
    { cx: 1030, cy: 900, R: 175, r: 32, n: 7, spread: 1.0, s: 0.31, e: 0.35, amt: 0.72, pal: ['#D9973F', '#C4823A', '#E7B04E'] },
    { cx: -70, cy: 720, R: 160, r: 30, n: 7, spread: 1.0, s: 0.36, e: 0.40, amt: 0.8, pal: ['#5C8F2E', '#7DB042', '#D9973F'] },
  ];
  const RESTORE = [0.62, 0.72];

  function buildBite(m, B) {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('fill', '#000');
    const disk = document.createElementNS(SVGNS, 'circle');
    disk.setAttribute('cx', B.cx); disk.setAttribute('cy', B.cy); disk.setAttribute('r', B.R);
    g.append(disk);
    const dx = B.cx - CENTER.x, dy = B.cy - CENTER.y;
    const len = Math.hypot(dx, dy);
    B.nx = dx / len; B.ny = dy / len;
    const face = Math.atan2(-B.ny, -B.nx);
    for (let i = 0; i < B.n; i++) {
      const a = face - B.spread + (2 * B.spread * i) / (B.n - 1);
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', (B.cx + B.R * Math.cos(a)).toFixed(1));
      c.setAttribute('cy', (B.cy + B.R * Math.sin(a)).toFixed(1));
      c.setAttribute('r', B.r);
      g.append(c);
    }
    B.D = 1.4 * B.R + 170;
    B.g = g;
    B.off = -1;
    m.append(g);
    return B;
  }

  BITES.forEach((B, bi) => {
    buildBite(mask, B);
    // migalhas: saem da borda mordida e caem
    const r = rng(31 + bi * 17);
    B.crumbs = [];
    const contact = { x: B.cx - B.nx * (B.R - 10), y: B.cy - B.ny * (B.R - 10) };
    for (let i = 0; i < 5; i++) {
      const c = document.createElementNS(SVGNS, 'circle');
      const size = 5 + r() * 7;
      c.setAttribute('r', size.toFixed(1));
      c.setAttribute('fill', B.pal[Math.floor(r() * B.pal.length)]);
      c.setAttribute('opacity', '0');
      crumbsG.append(c);
      const ang = Math.atan2(B.ny, B.nx) + (r() - 0.5) * 1.6;
      B.crumbs.push({
        el: c,
        x0: contact.x + (r() - 0.5) * B.R * 0.9 * -B.ny,
        y0: contact.y + (r() - 0.5) * B.R * 0.9 * B.nx,
        vx: Math.cos(ang) * (90 + r() * 120),
        vy: Math.sin(ang) * (90 + r() * 120) - 40,
        g: 220 + r() * 120,
        last: '',
      });
    }
  });

  let heroOn = false;
  let scrubOn = false;
  let target = 0;
  let shown = 0;
  let rafId = null;
  let lastTick = 0;
  let loadK = 0;
  let lastTagAt = 0;
  let lastTag = '';
  let lastBox = '';
  let lastChip = [];
  let settleMin = 0.6;
  const band3El = $('.band-3', hero);
  const copyEl = $('.copy', hero);

  // No celular: quanto o lanche precisa encolher para caber embaixo do texto final (medido, não chutado)
  function measureSettle() {
    if (!MOBILE.matches) return;
    const textBottom = copyEl.offsetTop + band3El.offsetHeight + 14;
    const boxBottom = stage.clientHeight - 20;
    const avail = boxBottom - textBottom;
    settleMin = clamp(avail / box.offsetHeight, 0.4, 1);
  }

  function heroRange() { return Math.max(1, hero.offsetHeight - window.innerHeight); }
  function heroProgress() {
    const r = hero.getBoundingClientRect();
    return clamp(-r.top / heroRange(), 0, 1);
  }

  function biteMix(B, p, restore) {
    const t = clamp((p - B.s) / (B.e - B.s), 0, 1);
    return (t === 0 ? 0 : easeOutBack(t)) * (1 - restore);
  }

  function render(p, now, force) {
    // Faixas de legenda
    for (const B of bands) {
      const f = Math.min(0.02, (B.b - B.a) / 3);
      const op = B.first
        ? 1 - smooth(p, B.b - f, B.b)
        : smooth(p, B.a, B.a + f) * (B.last ? 1 : 1 - smooth(p, B.b - f, B.b));
      let k;
      if (B.first) k = loadK;
      else if (B.local) k = clamp((p - B.a) / (B.b - B.a), 0, 1);
      else k = clamp((p - B.a) / (B.ramp || Math.min(0.025, (B.b - B.a) * 0.35)), 0, 1);
      if (force || Math.abs(op - B.op) > 0.004 || ((op === 0 || op === 1) && op !== B.op)) {
        B.op = op;
        B.el.style.opacity = op.toFixed(3);
        B.el.classList.toggle('inert-band', op < 0.5);
      }
      if (force || Math.abs(k - B.k) > 0.008 || ((k === 0 || k === 1) && k !== B.k)) {
        B.k = k;
        B.el.style.setProperty('--k', k.toFixed(3));
      }
    }

    // Mordidas, migalhas e etiquetas
    const restore = easeInOut(clamp((p - RESTORE[0]) / (RESTORE[1] - RESTORE[0]), 0, 1));
    let lost = 0;
    BITES.forEach((B, i) => {
      const m = biteMix(B, p, restore);
      lost += B.amt * clamp(m, 0, 1);
      const off = Math.round(B.D * (1 - m) * 2) / 2;
      if (force || off !== B.off) {
        B.off = off;
        B.g.setAttribute('transform', `translate(${(B.nx * off).toFixed(1)} ${(B.ny * off).toFixed(1)})`);
      }
      const t = clamp((p - B.s) / (B.e - B.s), 0, 1);
      const ct = restore > 0 ? 0 : clamp((t - 0.55) / 0.45, 0, 1);
      for (const c of B.crumbs) {
        const tt = ct * 0.9;
        const state = ct <= 0 || ct >= 1 ? 'off' : `${(c.x0 + c.vx * tt).toFixed(0)},${(c.y0 + c.vy * tt + c.g * tt * tt).toFixed(0)},${(1 - ct).toFixed(2)}`;
        if (state !== c.last) {
          c.last = state;
          if (state === 'off') c.el.setAttribute('opacity', '0');
          else {
            const [x, y, o] = state.split(',');
            c.el.setAttribute('cx', x); c.el.setAttribute('cy', y); c.el.setAttribute('opacity', o);
          }
        }
      }
      const chipState = (m > 0.85 && restore < 0.45 ? 1 : 0) + (restore > 0.04 && m > 0.05 ? 2 : 0);
      if (force || chipState !== lastChip[i]) {
        lastChip[i] = chipState;
        chips[i].classList.toggle('on', (chipState & 1) === 1);
        chips[i].classList.toggle('struck', (chipState & 2) === 2);
      }
    });

    // Comanda: "você recebe" desce com as mordidas; no assentamento vira "comissão R$ 0,00"
    const zero = restore >= 0.5;
    const tagText = zero ? 'z' : brl2(40 - lost);
    if (force || (tagText !== lastTag && (now - lastTagAt > 100 || zero !== (lastTag === 'z')))) {
      lastTag = tagText;
      lastTagAt = now;
      tag.classList.toggle('zero', zero);
      tagLabel.textContent = zero ? 'COMISSÃO' : 'VOCÊ RECEBE';
      tagVal.textContent = zero ? 'R$' + NB + '0,00' : tagText;
    }

    // O lanche: inclinação que assenta; no celular ele encolhe só o necessário para o texto final caber
    const settle = smooth(p, 0.62, 0.7);
    const tilt = -4 * (1 - smooth(p, 0, 0.72));
    let tf;
    if (MOBILE.matches) tf = `translate3d(0,0,0) scale(${(1 - (1 - settleMin) * settle).toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`;
    else tf = `translate3d(0,0,0) scale(${(1 + 0.03 * settle).toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`;
    if (force || tf !== lastBox) {
      lastBox = tf;
      box.style.transform = tf;
    }
  }

  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    const k = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    if (Math.abs(target - shown) < 0.0004) {
      shown = target;
      rafId = null;
      lastTick = 0;
    } else {
      rafId = requestAnimationFrame(tick);
    }
    render(shown, now, false);
  }

  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOn) rafId = requestAnimationFrame(tick);
  }
  function onResize() {
    measureSettle();
    target = heroProgress();
    shown = target;
    render(shown, performance.now(), true);
  }

  new IntersectionObserver((entries) => {
    heroOn = entries[0].isIntersecting;
    if (heroOn && scrubOn) onScroll();
  }, { rootMargin: '100px 0px' }).observe(hero);

  // Rampa única de carregamento da faixa 1
  function rampLoad() {
    const t0 = performance.now();
    const step = (now) => {
      loadK = clamp((now - t0) / 900, 0, 1);
      if (scrubOn) render(shown, now, false);
      if (loadK < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function pinHeroFinal() {
    for (const B of bands) {
      B.el.style.removeProperty('opacity');
      B.el.style.removeProperty('--k');
      B.el.classList.remove('inert-band');
      B.op = -1; B.k = -1;
    }
    BITES.forEach((B) => {
      B.g.setAttribute('transform', `translate(${(B.nx * B.D).toFixed(1)} ${(B.ny * B.D).toFixed(1)})`);
      B.off = -1;
      B.crumbs.forEach((c) => { c.el.setAttribute('opacity', '0'); c.last = ''; });
    });
    chips.forEach((c) => c.classList.remove('on', 'struck'));
    lastChip = [];
    tag.classList.add('zero');
    tagLabel.textContent = 'COMISSÃO';
    tagVal.textContent = 'R$' + NB + '0,00';
    lastTag = 'z';
    box.style.removeProperty('transform');
    lastBox = '';
  }

  function enableScrub() {
    if (scrubOn) return;
    scrubOn = true;
    doc.classList.remove('static-hero');
    lastTag = ''; lastBox = ''; lastChip = [];
    measureSettle();
    target = shown = heroProgress();
    render(shown, performance.now(), true);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
  }
  function disableScrub() {
    // vale também no carregamento (scrubOn ainda falso): quem chega com movimento reduzido recebe o topo estático
    if (scrubOn) {
      scrubOn = false;
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }
    doc.classList.add('static-hero');
    pinHeroFinal();
  }

  const GATES = [
    '(prefers-reduced-motion: reduce)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(max-height: 480px)',
  ];
  const MQLS = GATES.map((q) => matchMedia(q));
  function applyHeroMode() {
    if (MQLS.some((m) => m.matches)) disableScrub();
    else enableScrub();
  }
  MQLS.forEach((m) => m.addEventListener('change', applyHeroMode));
  MOBILE.addEventListener('change', () => { if (scrubOn) { measureSettle(); render(shown, performance.now(), true); } });
  applyHeroMode();
  // a altura do texto final depende da fonte carregada
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (scrubOn) { measureSettle(); render(shown, performance.now(), true); } });
  if (scrubOn) rampLoad(); else loadK = 1;

  // Quem chega pelo teclado no botão final do topo é levado até o assentamento
  bands.find((B) => B.last).el.addEventListener('focusin', () => {
    if (!scrubOn || heroProgress() > 0.8) return;
    const top = hero.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + heroRange() * 0.88, behavior: RM.matches ? 'auto' : 'smooth' });
  });

  /* =========================================================
     A CONTA: segurar para tomar o lanche de volta
     ========================================================= */
  const conta = $('#conta');
  const fat = $('#fat');
  const fatOut = $('#fat-out');
  const lossEl = $('#loss');
  const keepEl = $('#keep');
  const won = $('#won');
  const hold = $('#hold');
  const holdLabel = $('.hold-label', hold);
  const calcTag = $('#calc-tag-txt');
  const calcMask = $('#calc-bite');
  const CALC = { cx: 1000, cy: 330, r: 34, n: 8, spread: 1.15 };
  let calcBite = null;
  let h = 0;
  let holding = false;
  let done = false;
  let holdRaf = null;
  let holdLast = 0;

  function rate() { return Number($('input[name="taxa"]:checked').value); }

  function drawCalcBite() {
    if (calcBite) calcBite.g.remove();
    const R = 250 * Math.sqrt(rate() / 27);
    calcBite = buildBite(calcMask, { cx: CALC.cx - (250 - R) * 0.35, cy: CALC.cy, R, r: CALC.r * (R / 250 + 0.15), n: CALC.n, spread: CALC.spread });
    applyHold();
  }
  function applyHold() {
    const e = easeInOut(h);
    const off = calcBite.D * e;
    calcBite.g.setAttribute('transform', `translate(${(calcBite.nx * off).toFixed(1)} ${(calcBite.ny * off).toFixed(1)})`);
    hold.style.setProperty('--h', h.toFixed(3));
  }
  function updateNumbers() {
    const v = Number(fat.value);
    const loss = v * (rate() / 100) * 12;
    // custo de um ano de PRO no plano anual (pago adiantado), o menor custo por mês
    const proMonthly = PLAN_PRICES.pro.ANNUAL || PLAN_PRICES.pro.MONTHLY;
    const keep = Math.max(0, loss - periodTotal(proMonthly, 'ANNUAL'));
    const keepPrice = $('#keep-price');
    if (keepPrice) keepPrice.textContent = money(proMonthly);
    fatOut.textContent = brl0(v);
    lossEl.textContent = brl0(loss);
    keepEl.textContent = brl0(keep);
    calcTag.textContent = '−' + rate() + '%';
    fat.style.setProperty('--fill', (((v - Number(fat.min)) / (Number(fat.max) - Number(fat.min))) * 100).toFixed(1) + '%');
  }
  function complete() {
    done = true;
    holding = false;
    h = 1;
    applyHold();
    hold.classList.remove('holding');
    hold.classList.add('done');
    holdLabel.textContent = 'O lanche é seu.';
    conta.classList.add('reclaimed');
    won.classList.add('show');
  }
  function holdTick(now) {
    const dt = Math.min(60, now - (holdLast || now));
    holdLast = now;
    if (holding) h = Math.min(1, h + dt / 1500);
    else h = Math.max(0, h - dt / 2600);
    applyHold();
    if (h >= 1 && holding) { complete(); holdRaf = null; holdLast = 0; return; }
    if ((holding && h < 1) || (!holding && h > 0)) holdRaf = requestAnimationFrame(holdTick);
    else { holdRaf = null; holdLast = 0; }
  }
  function startHold() {
    if (done) return;
    if (RM.matches) { complete(); return; }
    holding = true;
    hold.classList.add('holding');
    if (holdRaf === null) holdRaf = requestAnimationFrame(holdTick);
  }
  function endHold() {
    if (!holding) return;
    holding = false;
    hold.classList.remove('holding');
    if (holdRaf === null && h > 0) holdRaf = requestAnimationFrame(holdTick);
  }
  hold.addEventListener('pointerdown', (e) => { e.preventDefault(); hold.setPointerCapture?.(e.pointerId); startHold(); });
  hold.addEventListener('pointerup', endHold);
  hold.addEventListener('pointercancel', endHold);
  hold.addEventListener('lostpointercapture', endHold);
  hold.addEventListener('contextmenu', (e) => e.preventDefault());
  hold.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); }
  });
  hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endHold(); } });
  hold.addEventListener('click', (e) => { if (RM.matches && !done) { e.preventDefault(); complete(); } });

  fat.addEventListener('input', updateNumbers);
  $$('input[name="taxa"]').forEach((r) => r.addEventListener('change', () => { updateNumbers(); drawCalcBite(); }));
  updateNumbers();
  drawCalcBite();

  /* =========================================================
     PLANOS: período (mensal, 3, 6 ou 12 meses, pago adiantado)
     ========================================================= */
  function currentCycle() {
    const el = $('input[name="ciclo"]:checked');
    return (el && el.value) || 'ANNUAL';
  }
  function renderPlans() {
    const chosen = currentCycle();
    $$('[data-plan]').forEach((card) => {
      const prices = PLAN_PRICES[card.dataset.plan];
      if (!prices) return;
      const cycle = prices[chosen] != null ? chosen : 'MONTHLY'; // plano sem esse período: mostra o mensal
      const monthly = prices[cycle];
      const months = CYCLE_MONTHS[cycle];
      const total = periodTotal(monthly, cycle);
      const save = prices.MONTHLY ? Math.max(0, periodTotal(prices.MONTHLY, cycle) - total) : 0;
      const priceEl = $('[data-price]', card);
      const subEl = $('[data-sub]', card);
      const cta = $('[data-cta]', card);
      if (priceEl) priceEl.textContent = money(monthly);
      if (subEl) {
        subEl.textContent = months === 1
          ? 'cobrado todo mês'
          : `${money(total)} ${months === 12 ? 'por ano' : `a cada ${months} meses`}${save > 0.004 ? ` · economize ${money(save)}` : ''}`;
      }
      if (cta) cta.href = `/comprar/${card.dataset.plan}?ciclo=${CYCLE_SLUG[cycle]}`;
    });
    // desconto de cada período, calculado sobre o PRO
    const pro = PLAN_PRICES.pro;
    $$('[data-off]').forEach((em) => {
      const c = em.dataset.off;
      if (pro && pro[c] && pro.MONTHLY) em.textContent = '−' + Math.round((1 - pro[c] / pro.MONTHLY) * 100) + '%';
    });
  }
  $$('input[name="ciclo"]').forEach((r) => r.addEventListener('change', renderPlans));
  renderPlans();

  // Preços atualizados do superadmin (se a API não responder, ficam os da página)
  // só no domínio de produção: em outro endereço a API recusa a origem (CORS) e o erro sujaria o console
  const apiMeta = $('meta[name="bylink-api"]');
  if (apiMeta && window.fetch && (/(^|\.)bylink\.shop$/.test(location.hostname) || window.__forceApi)) {
    fetch(apiMeta.content.replace(/\/$/, '') + '/plans', { credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json || !Array.isArray(json.data)) return;
        let changed = false;
        for (const plan of json.data) {
          if (!PLAN_PRICES[plan.slug] || !Array.isArray(plan.prices)) continue;
          const next = {};
          for (const p of plan.prices) if (CYCLE_MONTHS[p.cycle] && Number(p.monthlyPrice) > 0) next[p.cycle] = Number(p.monthlyPrice);
          if (next.MONTHLY) { PLAN_PRICES[plan.slug] = next; changed = true; }
        }
        if (changed) { renderPlans(); updateNumbers(); }
      })
      .catch(() => {});
  }

  /* =========================================================
     Entradas das seções e elementos vivos
     ========================================================= */
  const revealIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      el.classList.add('in');
      revealIO.unobserve(el);
      // aposenta o atraso de escalonamento depois da entrada, para o hover responder na hora
      setTimeout(() => el.classList.add('settled'), 1400);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.rv').forEach((el) => revealIO.observe(el));

  // Animações em loop só rodam com a seção na tela
  const liveIO = new IntersectionObserver((entries) => {
    for (const en of entries) en.target.classList.toggle('live', en.isIntersecting);
  });
  $$('.hero, .conta, .recursos, .planos, .final').forEach((s) => liveIO.observe(s));

  /* ---------- Linha dos passos que se traça com o scroll ---------- */
  const steps = $('.steps-wrap');
  const stepLine = $('.steps-line');
  let stepsOn = false;
  let lastDraw = -1;
  let stepsRaf = null;
  function drawSteps() {
    stepsRaf = null;
    const r = steps.getBoundingClientRect();
    const vh = window.innerHeight;
    const d = RM.matches ? 1 : clamp((vh * 0.85 - r.top) / (r.height * 0.55 + vh * 0.2), 0, 1);
    if (Math.abs(d - lastDraw) > 0.004 || ((d === 0 || d === 1) && d !== lastDraw)) {
      lastDraw = d;
      stepLine.style.setProperty('--draw', d.toFixed(3));
    }
  }
  new IntersectionObserver((entries) => {
    stepsOn = entries[0].isIntersecting;
    if (stepsOn) drawSteps();
  }).observe(steps);
  addEventListener('scroll', () => { if (stepsOn && stepsRaf === null) stepsRaf = requestAnimationFrame(drawSteps); }, { passive: true });
  RM.addEventListener('change', () => { lastDraw = -1; drawSteps(); });
})();
