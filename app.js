(() => {
  'use strict';
  const CFG = window.SCOOT_CONFIG || {};
  const hasSupabase = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  const DEMO = CFG.DEMO_MODE !== false || !hasSupabase;
  const sb = hasSupabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const app = $('#app');
  const modeBadge = $('#modeBadge');
  modeBadge.textContent = DEMO ? 'DEMO • data zůstávají v tomto prohlížeči' : 'ONLINE • Supabase';

  const yearNow = new Date().getFullYear();
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = (prefix = 'id') => prefix + Math.random().toString(36).slice(2, 9);
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  }[char]));
  const parseYear = value => {
    const match = String(value ?? '').match(/(?:19|20)\d{2}/);
    const year = match ? Number(match[0]) : Number(value);
    return Number.isInteger(year) && year >= 1900 && year <= yearNow + 1 ? year : null;
  };
  const dateLabel = value => {
    if (!value) return 'Datum není nastavený';
    const date = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return date ? `${Number(date[3])}. ${Number(date[2])}. ${date[1]}` : String(value);
  };
  const statusLabel = value => ({draft:'Koncept', registration:'Registrace', live:'LIVE', finished:'Dokončeno'}[value] || value || 'Koncept');
  const statusClass = value => value === 'live' ? 'live' : value === 'finished' ? '' : 'warn';

  const scoringDefault = [
    {key:'difficulty', label:'Difficulty', max:25, weight:1, desc:'Obtížnost triků a kombinací'},
    {key:'diversity', label:'Diversity', max:25, weight:1, desc:'Rozmanitost triků'},
    {key:'style', label:'Style', max:25, weight:1, desc:'Styl, flow a originalita'},
    {key:'consistency', label:'Consistency', max:25, weight:1, desc:'Čistota a jistota provedení'}
  ];

  const defaultCategories = () => [
    {id:'cat-plus14', name:'+14 let', minBirthYear:null, maxBirthYear:yearNow - 14, heatSize:4, order:1},
    {id:'cat-minus14', name:'-14 let', minBirthYear:yearNow - 13, maxBirthYear:null, heatSize:4, order:2}
  ];
  const demoJudges = () => [
    {id:'admin', name:'Demo administrátor', email:'admin@example.invalid', role:'admin'},
    ...Array.from({length:5}, (_, index) => ({id:`judge-${index + 1}`, name:`Demo porotce ${index + 1}`, email:`judge${index + 1}@example.invalid`, role:'judge'}))
  ];
  const newEvent = (overrides = {}) => ({
    id:overrides.id || uid('event'), slug:overrides.slug || uid('event'),
    name:overrides.name || 'Nový závod', date:overrides.date || '',
    location:overrides.location || '', info:overrides.info || '',
    status:overrides.status || 'draft', judgeCount:[3,5].includes(overrides.judgeCount) ? overrides.judgeCount : 5,
    runCount:Math.min(3, Math.max(1, Number(overrides.runCount) || 2)),
    scoring:clone(overrides.scoring || scoringDefault),
    categories:clone(overrides.categories || defaultCategories()),
    riders:clone(overrides.riders || []), scores:clone(overrides.scores || []),
    judges:clone(overrides.judges || demoJudges()), panelIds:clone(overrides.panelIds || []),
    createdAt:overrides.createdAt || new Date().toISOString()
  });

  function rangeMatch(category, birthYear) {
    return Number.isInteger(birthYear) &&
      (category.minBirthYear == null || birthYear >= Number(category.minBirthYear)) &&
      (category.maxBirthYear == null || birthYear <= Number(category.maxBirthYear));
  }
  function categoryForYear(event, birthYear) {
    return event.categories.slice().sort((a,b)=>(a.order || 0) - (b.order || 0)).find(category => rangeMatch(category, birthYear));
  }
  function assignCategory(event, rider) {
    const category = categoryForYear(event, parseYear(rider.birthYear));
    const next = category?.id || '';
    if (rider.categoryId !== next) rider.heat = null;
    rider.categoryId = next;
    return next;
  }
  function ensureEvent(event) {
    Object.assign(event, newEvent(event));
    event.categories = Array.isArray(event.categories) ? event.categories : defaultCategories();
    event.riders = Array.isArray(event.riders) ? event.riders : [];
    event.scores = Array.isArray(event.scores) ? event.scores : [];
    event.judges = Array.isArray(event.judges) && event.judges.length ? event.judges : demoJudges();
    event.panelIds = Array.isArray(event.panelIds) ? event.panelIds : [];
    event.scoring = Array.isArray(event.scoring) && event.scoring.length ? event.scoring : clone(scoringDefault);
    event.judgeCount = [3,5].includes(Number(event.judgeCount)) ? Number(event.judgeCount) : 5;
    event.runCount = Math.min(3, Math.max(1, Number(event.runCount) || 2));
    event.categories.forEach((category, index) => {
      category.id = category.id || uid('cat'); category.order = Number(category.order) || index + 1;
      category.heatSize = Math.max(1, Number(category.heatSize) || 4);
      category.minBirthYear = parseYear(category.minBirthYear);
      category.maxBirthYear = parseYear(category.maxBirthYear);
    });
    event.riders.forEach((rider, index) => {
      rider.id = rider.id || uid('rider'); rider.registrationOrder = Number(rider.registrationOrder) || index + 1;
      rider.birthYear = parseYear(rider.birthYear || rider.birth);
      rider.bib = Number(rider.bib) || index + 1; rider.status = rider.status || 'registered';
      if (event.categories.some(category => category.minBirthYear != null || category.maxBirthYear != null)) assignCategory(event, rider);
    });
    event.scores.forEach(score => {
      if (!score.judgeId) score.judgeId = event.judges.find(judge => judge.name === score.judge)?.id || `legacy:${score.judge || 'unknown'}`;
      score.run = Number(score.run) || 1; score.total = Number(score.total);
    });
    const available = event.judges.filter(judge => ['judge','head_judge'].includes(judge.role));
    event.panelIds = event.panelIds.filter(id => available.some(judge => judge.id === id));
    while (event.panelIds.length < event.judgeCount && available[event.panelIds.length]) event.panelIds.push(available[event.panelIds.length].id);
    return event;
  }

  function normalize(raw) {
    if (raw && Array.isArray(raw.events)) {
      const result = {...raw, events:raw.events.map(ensureEvent)};
      result.activeEventId = result.activeEventId || result.events[0]?.id;
      result.judgeState = result.judgeState || {categoryId:'', heat:1, riderIndex:0, run:1, values:{}};
      result.judgeState.heat = Math.max(1, Number(result.judgeState.heat) || 1);
      result.speakerState = result.speakerState || {categoryId:'', heat:0, riderIndex:0};
      return result;
    }
    const oldEvent = raw?.event || {};
    const migrated = newEvent({
      ...oldEvent, id:oldEvent.id || 'event-demo', name:oldEvent.name || 'Scootshop Contest 2026',
      date:oldEvent.date || '',
      judgeCount:oldEvent.judgeCount || 5, runCount:oldEvent.runCount || 2,
      categories:raw?.categories || defaultCategories(), scoring:raw?.scoring || scoringDefault,
      riders:(raw?.riders || []).map((rider, index) => ({...rider, birthYear:parseYear(rider.birthYear || rider.birth), registrationOrder:index + 1})),
      scores:raw?.scores || [], judges:raw?.judges || demoJudges(), panelIds:oldEvent.panelIds || []
    });
    return {events:[ensureEvent(migrated)], activeEventId:migrated.id, currentUser:raw?.currentUser || null,
      judgeState:raw?.judgeState || {categoryId:'', heat:1, riderIndex:0, run:1, values:{}},
      speakerState:raw?.speakerState || {categoryId:'', heat:0, riderIndex:0}};
  }
  const store = {
    load(){
      if (!DEMO) return normalize({events:[newEvent({id:'event-online', name:'Scoot Scoring'})], activeEventId:'event-online'});
      const raw = localStorage.getItem('scootScoringData');
      if (!raw) return normalize({events:[seedEvent], activeEventId:seedEvent.id});
      try { return normalize(JSON.parse(raw)); } catch { return normalize({events:[seedEvent], activeEventId:seedEvent.id}); }
    },
    save(){ if (DEMO) localStorage.setItem('scootScoringData', JSON.stringify(state)); }
  };
  const seedEvent = newEvent({
    id:'event-demo', slug:'scootshop-contest-2026', name:'Scootshop Contest 2026', date:'2026-08-29', location:'Ústí nad Orlicí',
    info:'Ukázkový závod pro nastavení kategorií, heatů a poroty.', status:'live', judgeCount:5, runCount:2,
    riders:[
      {id:'r1', registrationOrder:1, bib:21, name:'Demo jezdec 1', birthYear:2012, city:'', sponsors:'', instagram:'', bio:'', status:'checked-in'},
      {id:'r2', registrationOrder:2, bib:34, name:'Demo jezdec 2', birthYear:2011, city:'', sponsors:'', instagram:'', bio:'', status:'checked-in'},
      {id:'r3', registrationOrder:3, bib:18, name:'Demo jezdec 3', birthYear:2014, city:'', sponsors:'', instagram:'', bio:'', status:'checked-in'},
      {id:'r4', registrationOrder:4, bib:7, name:'Demo jezdec 4', birthYear:2015, city:'', sponsors:'', instagram:'', bio:'', status:'checked-in'}
    ]
  });
  let state = store.load();
  if (!state.events.length) state.events.push(ensureEvent(seedEvent));
  const activeEvent = () => state.events.find(event => event.id === state.activeEventId) || state.events[0];
  const setActiveEvent = (id, routeName = 'live') => {
    if (!state.events.some(event => event.id === id)) return;
    state.activeEventId = id; state.judgeState = {categoryId:'', heat:1, riderIndex:0, run:1, values:{}}; state.speakerState = {categoryId:'', heat:0, riderIndex:0}; store.save(); location.hash = routeName;
  };
  const eventCategories = event => event.categories.slice().sort((a,b)=>(a.order || 0) - (b.order || 0));
  const categoryName = (event, id) => event.categories.find(category => category.id === id)?.name || 'Bez kategorie';
  const judgesFor = event => event.judges.filter(judge => ['judge','head_judge'].includes(judge.role));
  const panel = event => event.panelIds.slice(0, event.judgeCount);
  const ruleText = event => event.judgeCount === 5 ? '5 porotců • škrtá se minimum a maximum • průměr 3' : '3 porotci • průměr všech 3';
  const heatCount = (event, category) => Math.max(1, Math.ceil(event.riders.filter(rider => rider.categoryId === category.id).length / Math.max(1, Number(category.heatSize) || 4)));
  const categoryRange = category => {
    if (category.minBirthYear != null && category.maxBirthYear != null) return `${category.minBirthYear}–${category.maxBirthYear}`;
    if (category.minBirthYear != null) return `od ${category.minBirthYear}`;
    if (category.maxBirthYear != null) return `do ${category.maxBirthYear}`;
    return 'všechny ročníky';
  };
  const toast = message => { const element = $('#toast'); element.textContent = message; element.classList.add('show'); setTimeout(() => element.classList.remove('show'), 2400); };
  const save = () => store.save();

  function route() { return (location.hash.slice(1).split('?')[0] || 'events').toLowerCase(); }
  function setActiveNav() { const current = route(); $$('[data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === current)); $('#mainNav')?.classList.remove('open'); }
  window.addEventListener('hashchange', render);
  $('#navToggle').addEventListener('click', () => $('#mainNav').classList.toggle('open'));

  function publicHero(title, subtitle) {
    const event = activeEvent();
    return `<section class="hero"><div><div class="eyebrow"><span class="live-dot"></span>SCOOT SCORING</div><h1>${title}</h1><p>${subtitle}</p></div><div class="hero-event"><small>Aktuální závod</small><h3>${escapeHtml(event.name)}</h3><div class="muted">${escapeHtml(dateLabel(event.date))}${event.location ? ` • ${escapeHtml(event.location)}` : ''}</div><div class="mt"><span class="pill ${statusClass(event.status)}">${escapeHtml(statusLabel(event.status))}</span></div>${event.info ? `<p class="event-info">${escapeHtml(event.info)}</p>` : ''}</div></section>`;
  }
  function layoutSide(content, active = 'dashboard') {
    const event = activeEvent(); const user = state.currentUser || {name:'Nepřihlášený uživatel', role:'viewer'}; const admin = isAdmin();
    const adminItems = admin ? `<button data-side="dashboard" class="${active === 'dashboard' ? 'active' : ''}">Přehled</button><button data-side="events" class="${active === 'events' ? 'active' : ''}">Závody</button><button data-side="riders" class="${active === 'riders' ? 'active' : ''}">Jezdci</button><button data-side="categories" class="${active === 'categories' ? 'active' : ''}">Kategorie</button><button data-side="heats" class="${active === 'heats' ? 'active' : ''}">Heaty</button><button data-side="judges" class="${active === 'judges' ? 'active' : ''}">Rozhodčí</button><button data-side="settings" class="${active === 'settings' ? 'active' : ''}">Scoring</button>` : '';
    const roleItems = canUseJudge() ? `<button data-side="judge" class="${active === 'judge' ? 'active' : ''}">Judge mode</button>` : ''; const speakerItem = canUseSpeaker() ? `<button data-side="speaker" class="${active === 'speaker' ? 'active' : ''}">Speaker</button>` : '';
    return `<div class="app-shell"><aside class="sidebar"><div class="side-user"><b>${escapeHtml(user.name)}</b><small>${escapeHtml(user.role)}</small></div><div class="side-event">${admin ? `<label>Závod<select id="eventSwitcher" class="select">${state.events.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === event.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>` : `<span class="muted">Aktuální závod</span><b>${escapeHtml(event.name)}</b>`}</div><div class="side-nav">${adminItems}${roleItems}${speakerItem}<button class="logout" data-action="logout">Odhlásit</button></div></aside><section class="content">${content}</section></div>`;
  }
  function adminHeader(title, subtitle, actions = '') { return `<div class="content-head"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="toolbar">${actions}</div></div>`; }

  const currentRole = () => state.currentUser?.role || '';
  const isAdmin = () => currentRole() === 'admin';
  const isJudge = () => ['judge', 'head_judge'].includes(currentRole());
  const isSpeaker = () => currentRole() === 'speaker';
  const canUseJudge = () => isAdmin() || isJudge();
  const canUseSpeaker = () => isAdmin() || isSpeaker();
  function permittedCategoryIds(event) {
    if (isAdmin()) return new Set(event.categories.map(category => category.id));
    const user = state.currentUser; const record = event.judges.find(judge => judge.id === user?.id || (user?.email && judge.email === user.email));
    const assigned = Array.isArray(record?.categoryIds) ? record.categoryIds.filter(id => event.categories.some(category => category.id === id)) : [];
    return new Set(assigned.length ? assigned : event.categories.map(category => category.id));
  }
  const accessibleCategories = event => eventCategories(event).filter(category => permittedCategoryIds(event).has(category.id));
  function renderAccessDenied(message) {
    app.innerHTML = `<div class="login-shell"><div class="card"><div class="eyebrow">OMEZENÝ PŘÍSTUP</div><h1>${escapeHtml(message)}</h1><p class="muted">Tato role nemůže měnit nastavení závodu. Požádej administrátora o správnou roli nebo povolení kategorie.</p><div class="toolbar"><a class="btn btn-primary" href="#login">Přihlásit jiný účet</a><a class="btn btn-outline" href="#events">Zpět na závody</a></div></div></div>`;
  }
  function adminView() { return new URLSearchParams(location.hash.split('?')[1] || '').get('view') || 'dashboard'; }
  function navigateSide(view) { if (view === 'judge') location.hash = 'judge'; else if (view === 'speaker') location.hash = 'speaker'; else location.hash = `admin?view=${encodeURIComponent(view)}`; }
  function bindAdminCommon() {
    $('#eventSwitcher')?.addEventListener('change', eventTarget => { if (isAdmin()) setActiveEvent(eventTarget.target.value, `admin?view=${encodeURIComponent(adminView())}`); });
    $$('[data-side]').forEach(button => button.addEventListener('click', () => navigateSide(button.dataset.side)));
    $('[data-action="logout"]')?.addEventListener('click', logout);
  }

  function renderEvents() {
    const cards = state.events.slice().sort((a,b) => String(a.date).localeCompare(String(b.date))).map(event => `<article class="card event-card"><div class="event-card-top"><span class="pill ${statusClass(event.status)}">${escapeHtml(statusLabel(event.status))}</span><span class="muted">${escapeHtml(dateLabel(event.date))}</span></div><h2>${escapeHtml(event.name)}</h2><p class="muted">${escapeHtml(event.location || 'Místo bude doplněno')}</p>${event.info ? `<p>${escapeHtml(event.info)}</p>` : ''}<div class="event-card-meta"><span>${event.riders.length} jezdců</span><span>${event.categories.length} kategorií</span><span>${event.judgeCount} porotci</span></div><div class="toolbar"><button class="btn btn-primary" data-open-event="${escapeHtml(event.id)}">Otevřít závod</button></div></article>`).join('');
    app.innerHTML = publicHero('Závody.', 'Každý závod má vlastní datum, informace, porotu, kategorie, heaty a výsledky.') + `<div class="section-title"><div><h2>Kalendář závodů</h2><p>Vyber závod, který chceš zobrazit.</p></div><span class="pill">${state.events.length} závodů</span></div><div class="event-grid">${cards || '<div class="card empty">Zatím není vytvořený žádný závod.</div>'}</div>`;
    $$('[data-open-event]').forEach(button => button.onclick = () => setActiveEvent(button.dataset.openEvent, 'live'));
  }
  function resultFor(event, rider) { return window.ScootScoring.riderResult(event.scores.filter(score => score.riderId === rider.id), panel(event), event.runCount); }
  function leaderboard(event, categoryId) {
    const rows = event.riders.filter(rider => rider.categoryId === categoryId).map(rider => ({...rider, ...resultFor(event, rider)})).sort((a,b) => (b.total ?? -1) - (a.total ?? -1) || a.bib - b.bib);
    rows.forEach((row, index) => { row.rank = row.total == null ? null : (index && rows[index - 1].total === row.total ? rows[index - 1].rank : index + 1); });
    return rows;
  }
  function renderLive() {
    const event = activeEvent(); const categories = eventCategories(event); const selected = sessionStorage.getItem(`liveCat:${event.id}`) || categories[0]?.id || '';
    const rows = selected ? leaderboard(event, selected) : [];
    app.innerHTML = publicHero('Výsledky závodu.', 'U každého porotce se použije lepší jízda. Výsledek čeká na kompletní hodnocení panelu.') + `<div class="section-title"><div><h2>Live leaderboard</h2><p>${escapeHtml(ruleText(event))} • ${event.runCount} ${event.runCount === 1 ? 'jízda' : 'jízdy'}</p></div><span class="pill">${DEMO ? 'DEMO' : 'ONLINE'}</span></div><div class="toolbar"><div class="tabs">${categories.map(category => `<button class="tab ${category.id === selected ? 'active' : ''}" data-live-cat="${escapeHtml(category.id)}">${escapeHtml(category.name)}</button>`).join('')}</div><button class="btn btn-outline" data-action="export-results">Export CSV</button></div><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Jezdec</th>${panel(event).map((id,index) => `<th title="${escapeHtml(event.judges.find(judge => judge.id === id)?.name || '')}">Porotce ${index + 1}</th>`).join('')}<th>Výsledek</th></tr></thead><tbody>${rows.map(row => `<tr><td class="rank">${row.rank ?? '—'}</td><td><div class="rider-name">${escapeHtml(row.name)}</div><div class="rider-meta">#${row.bib} • ${row.birthYear || 'rok neuveden'}${row.heat ? ` • Heat ${row.heat}` : ''}</div></td>${row.marks.map((value,index) => `<td class="score">${value == null ? '—' : row.dropped.includes(index) ? `<del title="Škrtnutá známka">${value.toFixed(2)}</del>` : value.toFixed(2)}</td>`).join('')}<td class="score score-best">${row.total == null ? `<span class="help">Čeká ${row.received}/${event.judgeCount}</span>` : row.total.toFixed(2)}</td></tr>`).join('') || `<tr><td colspan="${panel(event).length + 3}" class="empty">Zatím bez výsledků.</td></tr>`}</tbody></table></div><p class="help">Přeškrtnuté známky se nepočítají. Při shodě se pořadí sdílí.</p>`;
    $$('[data-live-cat]').forEach(button => button.onclick = () => { sessionStorage.setItem(`liveCat:${event.id}`, button.dataset.liveCat); renderLive(); });
    $('[data-action="export-results"]')?.addEventListener('click', () => exportResults(event, selected));
  }
  function renderStartlist() {
    const event = activeEvent(); const categories = eventCategories(event); const selected = sessionStorage.getItem(`startCat:${event.id}`) || categories[0]?.id || '';
    const list = event.riders.filter(rider => rider.categoryId === selected).sort((a,b) => (a.heat || 999) - (b.heat || 999) || a.bib - b.bib);
    app.innerHTML = publicHero('Startovní listina.', 'Přehled jezdců, ročníků, kategorií a ručně připravených heatů.') + `<div class="section-title"><div><h2>Startovka</h2><p>${list.length} jezdců • ${escapeHtml(categoryName(event, selected))}</p></div></div><div class="toolbar"><div class="tabs">${categories.map(category => `<button class="tab ${category.id === selected ? 'active' : ''}" data-start-cat="${escapeHtml(category.id)}">${escapeHtml(category.name)}</button>`).join('')}</div></div><div class="table-wrap"><table class="table"><thead><tr><th>Pořadí</th><th>#</th><th>Jezdec</th><th>Ročník</th><th>Heat</th><th>Stav</th></tr></thead><tbody>${list.map((rider,index) => `<tr><td>${index + 1}</td><td class="score">${rider.bib}</td><td class="rider-name">${escapeHtml(rider.name)}</td><td>${rider.birthYear || '—'}</td><td><span class="pill">${rider.heat ? `Heat ${rider.heat}` : 'Nepřiřazen'}</span></td><td><span class="pill ${rider.status === 'checked-in' ? 'live' : 'warn'}">${rider.status === 'checked-in' ? 'Prezentován' : 'Přihlášen'}</span></td></tr>`).join('')}</tbody></table></div>`;
    $$('[data-start-cat]').forEach(button => button.onclick = () => { sessionStorage.setItem(`startCat:${event.id}`, button.dataset.startCat); renderStartlist(); });
  }
  function renderRegistration() {
    const event = activeEvent();
    app.innerHTML = `<div class="registration-shell"><div class="card"><div class="registration-head"><div><div class="eyebrow">PŘIHLÁŠKA NA ZÁVOD</div><h1>${escapeHtml(event.name)}</h1><p class="muted">Kategorie se přidělí automaticky podle roku narození.</p></div><span class="pill">${escapeHtml(dateLabel(event.date))}</span></div><form id="registrationForm" class="form-grid"><div class="field full"><label>Jméno a příjmení *</label><input class="input" name="name" required placeholder="Jan Novák"></div><div class="field"><label>Rok narození *</label><input class="input" type="number" name="birthYear" min="1900" max="${yearNow + 1}" required placeholder="2012"></div><div class="field"><label>Město</label><input class="input" name="city" placeholder="Pardubice"></div><div class="field"><label>Instagram</label><input class="input" name="instagram" placeholder="@username"></div><div class="field full"><label>Sponzoři</label><input class="input" name="sponsors" placeholder="Divine, Scootshop..."></div><div class="field full"><label>Informace pro speakera</label><textarea class="textarea" rows="4" name="bio" placeholder="Krátké info o jezdci..."></textarea></div><div class="field full"><button class="btn btn-primary" type="submit">Odeslat přihlášku</button><div class="help">Zařazení: ${eventCategories(event).map(category => `${escapeHtml(category.name)} (${escapeHtml(categoryRange(category))})`).join(' • ') || 'kategorie zatím nejsou nastavené'}</div></div></form></div></div>`;
    $('#registrationForm').onsubmit = async formEvent => {
      formEvent.preventDefault(); const values = Object.fromEntries(new FormData(formEvent.currentTarget)); const birthYear = parseYear(values.birthYear);
      if (!birthYear) { toast('Zadej platný rok narození.'); return; }
      const maxBib = Math.max(0, ...event.riders.map(rider => Number(rider.bib) || 0));
      const rider = {id:uid('rider'), registrationOrder:event.riders.length + 1, bib:maxBib + 1, name:String(values.name).trim(), birthYear, city:values.city || '', instagram:values.instagram || '', sponsors:values.sponsors || '', bio:values.bio || '', status:'registered'};
      assignCategory(event, rider); event.riders.push(rider); save();
      formEvent.currentTarget.innerHTML = `<div class="success"><b>Přihláška je uložená.</b><br>Startovní číslo: #${rider.bib}. ${rider.categoryId ? `Automatické zařazení: ${escapeHtml(categoryName(event, rider.categoryId))}.` : 'Kategorie zatím nebyla nalezena.'}</div>`;
    };
  }

  function adminDashboard() {
    const event = activeEvent(); const content = adminHeader('Přehled závodu', 'Nastavení a stav aktuálního závodu.', `<button class="btn btn-outline" data-action="edit-event">Upravit závod</button><button class="btn btn-primary" data-action="new-event">+ Nový závod</button>`) + `<div class="card event-summary"><div><span class="pill ${statusClass(event.status)}">${escapeHtml(statusLabel(event.status))}</span><h2>${escapeHtml(event.name)}</h2><p>${escapeHtml(dateLabel(event.date))}${event.location ? ` • ${escapeHtml(event.location)}` : ''}</p>${event.info ? `<p class="muted">${escapeHtml(event.info)}</p>` : ''}</div><div class="event-summary-meta"><b>${event.judgeCount}</b><span>porotci</span><b>${event.runCount}</b><span>${event.runCount === 1 ? 'jízda' : 'jízdy'}</span></div></div><div class="grid grid-4"><div class="card stat"><span>Jezdci</span><strong>${event.riders.length}</strong></div><div class="card stat"><span>Kategorie</span><strong>${event.categories.length}</strong></div><div class="card stat"><span>Heaty</span><strong>${event.categories.reduce((sum, category) => sum + heatCount(event, category), 0)}</strong></div><div class="card stat"><span>Hodnocení</span><strong>${event.scores.length}</strong></div></div><div class="section-title"><div><h2>Kategorie</h2><p>Zařazení podle roku narození.</p></div></div><div class="grid grid-2">${eventCategories(event).map(category => `<div class="card"><div class="event-card-top"><h3>${escapeHtml(category.name)}</h3><span class="pill">${escapeHtml(categoryRange(category))}</span></div><p class="muted">${event.riders.filter(rider => rider.categoryId === category.id).length} jezdců • ${heatCount(event, category)} heaty po ${category.heatSize}</p></div>`).join('') || '<div class="card empty">Přidej první kategorii.</div>'}</div>`;
    app.innerHTML = layoutSide(content, 'dashboard'); bindAdminCommon();
    $('[data-action="new-event"]').onclick = () => openEventForm(); $('[data-action="edit-event"]').onclick = () => openEventForm(event.id);
  }
  function adminEvents() {
    const content = adminHeader('Závody', 'Vytvoř samostatný závod a nastav ho podle jeho potřeb.', `<button class="btn btn-primary" data-action="new-event">+ Nový závod</button>`) + `<div class="event-grid admin-event-grid">${state.events.map(event => `<article class="card event-card ${event.id === activeEvent().id ? 'selected' : ''}"><div class="event-card-top"><span class="pill ${statusClass(event.status)}">${escapeHtml(statusLabel(event.status))}</span><span>${escapeHtml(dateLabel(event.date))}</span></div><h2>${escapeHtml(event.name)}</h2><p class="muted">${escapeHtml(event.location || 'Místo není nastavené')}</p><p>${escapeHtml(event.info || 'Bez popisu')}</p><div class="event-card-meta"><span>${event.judgeCount} porotci</span><span>${event.runCount} ${event.runCount === 1 ? 'jízda' : 'jízdy'}</span><span>${event.riders.length} jezdců</span></div><div class="toolbar"><button class="btn btn-primary" data-select-admin-event="${escapeHtml(event.id)}">${event.id === activeEvent().id ? 'Aktivní závod' : 'Otevřít'}</button><button class="btn btn-outline" data-edit-event-id="${escapeHtml(event.id)}">Upravit</button>${state.events.length > 1 ? `<button class="btn btn-danger" data-delete-event="${escapeHtml(event.id)}">Smazat</button>` : ''}</div></article>`).join('')}</div>`;
    app.innerHTML = layoutSide(content, 'events'); bindAdminCommon(); $('[data-action="new-event"]').onclick = () => openEventForm();
    $$('[data-select-admin-event]').forEach(button => button.onclick = () => setActiveEvent(button.dataset.selectAdminEvent, 'admin'));
    $$('[data-edit-event-id]').forEach(button => button.onclick = () => openEventForm(button.dataset.editEventId));
    $$('[data-delete-event]').forEach(button => button.onclick = () => { const event = state.events.find(item => item.id === button.dataset.deleteEvent); if (!event || !confirm(`Smazat závod „${event.name}“?`)) return; state.events = state.events.filter(item => item.id !== event.id); if (state.activeEventId === event.id) state.activeEventId = state.events[0].id; save(); adminEvents(); });
  }
  function adminRiders() {
    const event = activeEvent(); const content = adminHeader('Jezdci', 'Přihlášky, automatické zařazení podle ročníku a prezence.', `<button class="btn btn-outline" data-action="reassign">Přerozdělit podle ročníku</button><button class="btn btn-outline" data-action="import-csv">Import CSV</button><button class="btn btn-primary" data-action="add-rider">+ Přidat jezdce</button>`) + `<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Jezdec</th><th>Ročník</th><th>Kategorie</th><th>Heat</th><th>Stav</th></tr></thead><tbody>${event.riders.slice().sort((a,b) => a.bib - b.bib).map(rider => `<tr><td class="score">${rider.bib}</td><td><div class="rider-name">${escapeHtml(rider.name)}</div><div class="rider-meta">${escapeHtml(rider.city || '')}</div></td><td>${rider.birthYear || '—'}</td><td><span class="pill">${escapeHtml(categoryName(event, rider.categoryId))}</span></td><td>${rider.heat ? `Heat ${rider.heat}` : '—'}</td><td><button class="btn btn-small ${rider.status === 'checked-in' ? 'btn-primary' : 'btn-outline'}" data-checkin="${escapeHtml(rider.id)}">${rider.status === 'checked-in' ? 'Prezentován' : 'Prezentovat'}</button></td></tr>`).join('')}</tbody></table></div>`;
    app.innerHTML = layoutSide(content, 'riders'); bindAdminCommon();
    $$('[data-checkin]').forEach(button => button.onclick = () => { const rider = event.riders.find(item => item.id === button.dataset.checkin); if (rider) rider.status = rider.status === 'checked-in' ? 'registered' : 'checked-in'; save(); adminRiders(); });
    $('[data-action="reassign"]').onclick = () => { event.riders.forEach(rider => assignCategory(event, rider)); save(); toast('Jezdci byli zařazeni podle ročníku.'); adminRiders(); };
    $('[data-action="add-rider"]').onclick = () => openRiderForm(); $('[data-action="import-csv"]').onclick = openCsvImport;
  }
  function rangesOverlap(first, second) {
    return (first.minBirthYear == null || second.maxBirthYear == null || first.minBirthYear <= second.maxBirthYear) && (second.minBirthYear == null || first.maxBirthYear == null || second.minBirthYear <= first.maxBirthYear);
  }
  function adminCategories() {
    const event = activeEvent(); const content = adminHeader('Kategorie', 'Každá kategorie má rozsah ročníků a velikost heatů.', `<button class="btn btn-primary" data-action="add-category">+ Kategorie</button>`) + `<div class="grid grid-2">${eventCategories(event).map(category => `<div class="card category-card"><div class="event-card-top"><div><h2>${escapeHtml(category.name)}</h2><p class="muted">Ročníky: ${escapeHtml(categoryRange(category))}</p></div><div class="toolbar"><button class="icon-btn" data-edit-category="${escapeHtml(category.id)}">✎</button><button class="icon-btn danger-icon" data-delete-category="${escapeHtml(category.id)}">⌫</button></div></div><div class="grid grid-3 mt"><div><span class="muted">Jezdci</span><div class="score">${event.riders.filter(rider => rider.categoryId === category.id).length}</div></div><div><span class="muted">Jezdců / heat</span><div class="score">${category.heatSize}</div></div><div><span class="muted">Heaty</span><div class="score">${heatCount(event, category)}</div></div></div></div>`).join('') || '<div class="card empty">Zatím nejsou žádné kategorie.</div>'}</div><div class="card mt"><h3>Jak nastavit věk</h3><p class="muted">Pro „+14 let“ nastav do roku 2012. Pro „-14 let“ nastav od roku 2013. Další kategorie musí mít vlastní rozsah, například 2017–2020.</p></div>`;
    app.innerHTML = layoutSide(content, 'categories'); bindAdminCommon(); $('[data-action="add-category"]').onclick = () => openCategoryForm();
    $$('[data-edit-category]').forEach(button => button.onclick = () => openCategoryForm(button.dataset.editCategory));
    $$('[data-delete-category]').forEach(button => button.onclick = () => { const category = event.categories.find(item => item.id === button.dataset.deleteCategory); if (!category || !confirm(`Smazat kategorii „${category.name}“?`)) return; event.riders.filter(rider => rider.categoryId === category.id).forEach(rider => { rider.categoryId = ''; rider.heat = null; }); event.categories = event.categories.filter(item => item.id !== category.id); save(); adminCategories(); });
  }
  function adminHeats() {
    const event = activeEvent(); const categories = eventCategories(event); const selected = sessionStorage.getItem(`heatCat:${event.id}`) || categories[0]?.id || ''; const category = event.categories.find(item => item.id === selected); const riders = event.riders.filter(rider => rider.categoryId === selected).sort((a,b) => (a.heat || 999) - (b.heat || 999) || a.registrationOrder - b.registrationOrder); const maxHeat = category ? Math.max(heatCount(event, category), ...riders.map(rider => Number(rider.heat) || 0)) : 0;
    const cards = category ? Array.from({length:maxHeat}, (_,index) => { const heat = index + 1; const list = riders.filter(rider => Number(rider.heat) === heat); return `<div class="card heat-card"><div class="event-card-top"><h3>Heat ${heat}</h3><span class="pill">${list.length} jezdců</span></div>${list.map(rider => `<div class="heat-rider"><b>#${rider.bib}</b><span>${escapeHtml(rider.name)}</span><small>${rider.birthYear || '—'}</small></div>`).join('') || '<span class="muted">Zatím prázdný</span>'}</div>`; }).join('') : '<div class="card empty">Nejdřív vytvoř kategorii.</div>';
    const content = adminHeader('Heaty', 'Rozděl jezdce podle počtu na heat a potom pořadí ručně dolaď.', category ? `<div class="toolbar"><label class="inline-field">Jezdců / heat <input id="heatSize" class="input compact-input" type="number" min="1" max="99" value="${category.heatSize}"></label><button class="btn btn-outline" data-action="auto-heats">Rozdělit automaticky</button></div>` : '') + `<div class="toolbar"><div class="tabs">${categories.map(item => `<button class="tab ${item.id === selected ? 'active' : ''}" data-heat-cat="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`).join('')}</div></div>${category ? `<div class="table-wrap"><table class="table"><thead><tr><th>Pořadí</th><th>Jezdec</th><th>Ročník</th><th>Heat</th></tr></thead><tbody>${riders.map((rider,index) => `<tr><td>${index + 1}</td><td class="rider-name">#${rider.bib} ${escapeHtml(rider.name)}</td><td>${rider.birthYear || '—'}</td><td><select class="select heat-select" data-rider-heat="${escapeHtml(rider.id)}">${Array.from({length:Math.max(maxHeat,1)}, (_,heatIndex) => `<option value="${heatIndex + 1}" ${Number(rider.heat) === heatIndex + 1 ? 'selected' : ''}>Heat ${heatIndex + 1}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><div class="section-title"><div><h2>Náhled heatů</h2><p>${escapeHtml(category.name)} • ${maxHeat} heaty</p></div></div><div class="heat-grid">${cards}</div>` : cards}`;
    app.innerHTML = layoutSide(content, 'heats'); bindAdminCommon();
    $$('[data-heat-cat]').forEach(button => button.onclick = () => { sessionStorage.setItem(`heatCat:${event.id}`, button.dataset.heatCat); adminHeats(); });
    $('[data-action="auto-heats"]')?.addEventListener('click', () => { const size = Math.max(1, Number($('#heatSize').value) || 1); category.heatSize = size; event.riders.filter(rider => rider.categoryId === selected).sort((a,b) => a.registrationOrder - b.registrationOrder).forEach((rider,index) => rider.heat = Math.floor(index / size) + 1); save(); toast('Heaty byly rozdělené. Teď je můžeš ručně upravit.'); adminHeats(); });
    $('#heatSize')?.addEventListener('change', () => { category.heatSize = Math.max(1, Number($('#heatSize').value) || 1); save(); });
    $$('[data-rider-heat]').forEach(select => select.onchange = () => { const rider = event.riders.find(item => item.id === select.dataset.riderHeat); if (rider) rider.heat = Number(select.value); save(); adminHeats(); });
  }
  function openAccessForm(id) {
    const event = activeEvent(); const person = event.judges.find(judge => judge.id === id); if (!person) return;
    const selected = Array.isArray(person.categoryIds) ? person.categoryIds : [];
    modal('Přístup ke kategoriím', `<form id="accessForm"><p class="muted">Vyber kategorie, které může tento účet obsluhovat. Když zůstanou vybrané všechny, účet uvidí i nové kategorie automaticky.</p><div class="check-list">${eventCategories(event).map(category => `<label class="check-row"><input type="checkbox" data-access-category value="${escapeHtml(category.id)}" ${!selected.length || selected.includes(category.id) ? 'checked' : ''}><span>${escapeHtml(category.name)} <small>${escapeHtml(categoryRange(category))}</small></span></label>`).join('')}</div><button class="btn btn-primary" type="submit">Uložit přístup</button></form>`);
    $('#accessForm').onsubmit = formEvent => { formEvent.preventDefault(); const ids = $$('[data-access-category]:checked').map(input => input.value); person.categoryIds = ids.length === event.categories.length ? [] : ids; save(); closeModal(); toast('Přístup ke kategoriím je uložený.'); adminJudges(); };
  }
  function adminJudges() {
    const event = activeEvent(); const content = adminHeader('Rozhodčí a role', 'Admin spravuje účty. Rozhodčí a speaker mají jen svůj pracovní režim.', `<button class="btn btn-primary" data-action="add-judge">+ Uživatel</button>`) + `<div class="table-wrap"><table class="table"><thead><tr><th>Jméno</th><th>E-mail</th><th>Role</th><th>Panel</th><th>Kategorie</th></tr></thead><tbody>${event.judges.map(judge => { const restricted = Array.isArray(judge.categoryIds) && judge.categoryIds.length; const categoryText = restricted ? judge.categoryIds.map(id => categoryName(event, id)).join(', ') : 'Všechny'; return `<tr><td class="rider-name">${escapeHtml(judge.name)}</td><td>${escapeHtml(judge.email)}</td><td><span class="pill">${escapeHtml(String(judge.role || '').toUpperCase())}</span></td><td>${panel(event).includes(judge.id) ? '<span class="pill live">ANO</span>' : '—'}</td><td>${['judge','head_judge','speaker'].includes(judge.role) ? `<button class="btn btn-small btn-outline" data-access-id="${escapeHtml(judge.id)}">${escapeHtml(categoryText)}</button>` : '—'}</td></tr>`; }).join('')}</tbody></table></div>`;
    app.innerHTML = layoutSide(content, 'judges'); bindAdminCommon(); $('[data-action="add-judge"]').onclick = openJudgeForm; $$('[data-access-id]').forEach(button => button.onclick = () => openAccessForm(button.dataset.accessId));
  }
  function adminSettings() {
    const event = activeEvent(); const max = event.scoring.reduce((sum, criterion) => sum + criterion.max * criterion.weight, 0); const content = adminHeader('Scoring závodu', 'Nastavení panelu, jízd a bodovacích kritérií.', `<button class="btn btn-outline" data-action="edit-event">Upravit závod</button><button class="btn btn-primary" data-action="add-criterion">+ Kritérium</button>`) + `<form id="panelForm" class="card form-grid"><div class="field"><label for="judgeCount">Počet porotců</label><select id="judgeCount" class="select"><option value="3" ${event.judgeCount === 3 ? 'selected' : ''}>3 — průměr všech známek</option><option value="5" ${event.judgeCount === 5 ? 'selected' : ''}>5 — škrtat minimum a maximum</option></select></div><div class="field"><label>Počet jízd</label><input class="input" value="${event.runCount}" disabled><div class="help">Bez semifinále a finále.</div></div><div id="panelSeats" class="field full"></div><div class="field full"><button class="btn btn-primary">Uložit porotu</button><p class="help">${escapeHtml(ruleText(event))}. Změna panelu přepočítá výsledky.</p></div></form><div class="card mt"><div class="section-title" style="margin-top:0"><div><h2>Kritéria</h2><p>Maximum celkem: ${max}</p></div></div>${event.scoring.map((criterion,index) => `<div class="criterion"><div class="criterion-head"><div><b>${escapeHtml(criterion.label)}</b><div class="help">${escapeHtml(criterion.desc || '')}</div></div><div class="toolbar"><span class="pill">max ${criterion.max} • váha ${criterion.weight}</span><button class="icon-btn" data-edit-criterion="${index}">✎</button></div></div></div>`).join('')}</div><div class="card mt"><h3>Výpočet</h3><p class="muted">Nejdřív se vybere lepší jízda každého porotce. Potom se použije pravidlo panelu: ${escapeHtml(ruleText(event))}.</p></div>`;
    app.innerHTML = layoutSide(content, 'settings'); bindAdminCommon(); $('[data-action="edit-event"]').onclick = () => openEventForm(event.id); $('[data-action="add-criterion"]').onclick = () => openCriterionForm(); $$('[data-edit-criterion]').forEach(button => button.onclick = () => openCriterionForm(Number(button.dataset.editCriterion)));
    const drawSeats = () => { const count = Number($('#judgeCount').value); const previous = $$('[data-panel-seat]').map(select => select.value); $('#panelSeats').innerHTML = `<label>Obsazení poroty</label><div class="panel-seats">${Array.from({length:count}, (_,index) => `<label for="seat${index}">Porotce ${index + 1}<select id="seat${index}" class="select" data-panel-seat><option value="">Vyber porotce</option>${judgesFor(event).map(judge => `<option value="${escapeHtml(judge.id)}" ${judge.id === (previous[index] || panel(event)[index]) ? 'selected' : ''}>${escapeHtml(judge.name)}</option>`).join('')}</select></label>`).join('')}</div>`; };
    drawSeats(); $('#judgeCount').onchange = drawSeats;
    $('#panelForm').onsubmit = formEvent => { formEvent.preventDefault(); const ids = $$('[data-panel-seat]').map(select => select.value); const count = Number($('#judgeCount').value); if (![3,5].includes(count) || ids.length !== count || ids.some(id => !id) || new Set(ids).size !== count) { toast('Vyber různé porotce pro všechna místa.'); return; } event.judgeCount = count; event.panelIds = ids; state.judgeState.values = {}; save(); toast('Porota uložena, výsledky přepočítány.'); adminSettings(); };
  }

  function renderAdmin() {
    if (!isAdmin()) { renderAccessDenied('Administrace je jen pro admina'); return; }
    const views = {dashboard:adminDashboard, events:adminEvents, riders:adminRiders, categories:adminCategories, heats:adminHeats, judges:adminJudges, settings:adminSettings};
    (views[adminView()] || adminDashboard)();
  }
  function judgeHeats(event, categoryId) {
    const values = event.riders.filter(rider => rider.categoryId === categoryId && rider.status === 'checked-in').map(rider => Number(rider.heat) || 1);
    return [...new Set(values)].sort((a,b) => a - b).length ? [...new Set(values)].sort((a,b) => a - b) : [1];
  }
  function judgeRiders(event) { return event.riders.filter(rider => permittedCategoryIds(event).has(rider.categoryId) && rider.categoryId === state.judgeState.categoryId && rider.status === 'checked-in' && (Number(rider.heat) || 1) === Number(state.judgeState.heat || 1)).sort((a,b) => a.registrationOrder - b.registrationOrder || a.bib - b.bib); }
  function currentJudgeId(event) { return DEMO ? (state.judgeState.judgeId || panel(event)[0]) : state.currentUser?.id; }
  function scoreTotal(event, values) { return +event.scoring.reduce((sum, criterion) => sum + (Number(values[criterion.key]) || 0) * criterion.weight, 0).toFixed(1); }
  function advanceJudgeAfterSubmit(event, judgeId, list, index) {
    const run = Number(state.judgeState.run) || 1; const heat = Number(state.judgeState.heat) || 1;
    if (index < list.length - 1) return {riderIndex:index + 1, run, heat, message:'Score uložen.'};
    const complete = list.every(item => event.scores.some(score => score.riderId === item.id && score.judgeId === judgeId && Number(score.run) === run));
    if (!complete) return {riderIndex:index, run, heat, message:`Score uložen. Dokonči ještě všechny jezdce v Heat ${heat}, jízdě ${run}.`};
    if (run < event.runCount) return {riderIndex:0, run:run + 1, heat, message:`Heat ${heat} uzavřen pro jízdu ${run}. Začíná jízda ${run + 1}.`};
    const heats = judgeHeats(event, state.judgeState.categoryId); const next = heats[heats.indexOf(heat) + 1];
    if (next) return {riderIndex:0, run:1, heat:next, message:`Heat ${heat} uzavřen. Pokračuje Heat ${next}, jízda 1.`};
    return {riderIndex:index, run, heat, message:`Heat ${heat} uzavřen. Kategorie je pro tohoto rozhodčího dokončená.`};
  }
  function renderJudge() {
    const event = activeEvent(); const categories = accessibleCategories(event); if (!state.judgeState.categoryId || !categories.some(category => category.id === state.judgeState.categoryId)) state.judgeState.categoryId = categories[0]?.id || '';
    const heats = judgeHeats(event, state.judgeState.categoryId); if (!heats.includes(Number(state.judgeState.heat))) state.judgeState.heat = heats[0] || 1;
    const list = judgeRiders(event); const index = Math.min(state.judgeState.riderIndex || 0, Math.max(list.length - 1, 0)); const rider = list[index]; const judgeId = currentJudgeId(event); const savedScore = rider && event.scores.find(score => score.riderId === rider.id && score.judgeId === judgeId && score.run === state.judgeState.run);
    if (!state.judgeState.values || Object.keys(state.judgeState.values).length === 0) state.judgeState.values = savedScore?.values ? {...savedScore.values} : Object.fromEntries(event.scoring.map(criterion => [criterion.key, 0]));
    const values = state.judgeState.values; const total = scoreTotal(event, values); const maximum = event.scoring.reduce((sum, criterion) => sum + criterion.max * criterion.weight, 0); const actions = DEMO ? `<label>Demo porotce<select id="demoJudge" class="select">${panel(event).map(id => `<option value="${escapeHtml(id)}" ${id === judgeId ? 'selected' : ''}>${escapeHtml(event.judges.find(judge => judge.id === id)?.name || id)}</option>`).join('')}</select></label>` : '';
    const heatOptions = heats.map(heat => `<option value="${heat}" ${Number(state.judgeState.heat) === heat ? 'selected' : ''}>Heat ${heat}</option>`).join('');
    const content = adminHeader('Judge mode', `Hodnocení pro ${escapeHtml(event.name)} • Heat ${state.judgeState.heat} z ${heats.length} • jízda ${state.judgeState.run} z ${event.runCount}`, `${actions}<select id="judgeCat" class="select">${categories.map(category => `<option value="${escapeHtml(category.id)}" ${category.id === state.judgeState.categoryId ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}</select><select id="judgeHeat" class="select">${heatOptions}</select>`) + (rider ? `<div class="judge-grid"><div class="card"><div class="current-rider"><div style="display:flex;gap:14px;align-items:center"><div class="bib">${rider.bib}</div><div><div class="eyebrow">HEAT ${state.judgeState.heat} • JÍZDA ${state.judgeState.run} / ${event.runCount}</div><h2>${escapeHtml(rider.name)}</h2><div class="muted">${rider.birthYear || '—'} • ${escapeHtml(categoryName(event, rider.categoryId))}</div></div></div><span class="pill">${index + 1} / ${list.length}</span></div>${event.scoring.map(criterion => `<div class="criterion"><div class="criterion-head"><div><b>${escapeHtml(criterion.label)}</b><div class="help">${escapeHtml(criterion.desc || '')}</div></div><span class="criterion-score" data-score-label="${escapeHtml(criterion.key)}">${(Number(values[criterion.key]) || 0).toFixed(1)}</span></div><input class="range" type="range" min="0" max="${criterion.max}" step="0.1" value="${Number(values[criterion.key]) || 0}" data-criterion="${escapeHtml(criterion.key)}"></div>`).join('')}</div><aside class="card total-box"><div class="eyebrow">CELKOVÉ SKÓRE</div><div class="big-total" id="judgeTotal">${total.toFixed(1)}</div><div class="total-max">z ${maximum}</div><div class="progress"><span id="judgeProgress" style="width:${maximum ? total / maximum * 100 : 0}%"></span></div><div class="total-actions"><button class="btn btn-primary" data-action="submit-score">Odeslat score</button><button class="btn btn-outline" data-action="reset-score">Vynulovat</button><div class="grid grid-2"><button class="btn btn-outline" data-action="prev-rider">← Předchozí</button><button class="btn btn-outline" data-action="next-rider">Další →</button></div><div class="tabs" style="width:100%;justify-content:center">${Array.from({length:event.runCount}, (_,runIndex) => `<button class="tab ${state.judgeState.run === runIndex + 1 ? 'active' : ''}" data-run="${runIndex + 1}">Jízda ${runIndex + 1}</button>`).join('')}</div></div><div class="judge-history"><b>Uložené známky</b>${event.scores.filter(score => score.riderId === rider.id).map(score => `<div class="history-row"><span>Jízda ${score.run} • ${escapeHtml(score.judge || score.judgeId)}</span><b>${Number(score.total).toFixed(1)}</b></div>`).join('') || '<span class="muted">Zatím nic.</span>'}</div></aside></div>` : `<div class="card empty">V tomto heatě není prezentovaný jezdec.</div>`);
    app.innerHTML = layoutSide(content, 'judge'); bindAdminCommon();
    $('#demoJudge')?.addEventListener('change', eventTarget => { state.judgeState.judgeId = eventTarget.target.value; state.judgeState.values = {}; save(); renderJudge(); });
    $('#judgeCat')?.addEventListener('change', eventTarget => { state.judgeState.categoryId = eventTarget.target.value; state.judgeState.heat = 1; state.judgeState.run = 1; state.judgeState.riderIndex = 0; state.judgeState.values = {}; save(); renderJudge(); });
    $('#judgeHeat')?.addEventListener('change', eventTarget => { state.judgeState.heat = Number(eventTarget.target.value) || 1; state.judgeState.run = 1; state.judgeState.riderIndex = 0; state.judgeState.values = {}; save(); renderJudge(); });
    $$('[data-criterion]').forEach(input => input.oninput = () => { state.judgeState.values[input.dataset.criterion] = Number(input.value); const next = scoreTotal(event, state.judgeState.values); $(`[data-score-label="${input.dataset.criterion}"]`).textContent = Number(input.value).toFixed(1); $('#judgeTotal').textContent = next.toFixed(1); $('#judgeProgress').style.width = `${maximum ? next / maximum * 100 : 0}%`; save(); });
    $$('[data-run]').forEach(button => button.onclick = () => { state.judgeState.run = Number(button.dataset.run); state.judgeState.values = {}; save(); renderJudge(); });
    $('[data-action="reset-score"]')?.addEventListener('click', () => { state.judgeState.values = {}; save(); renderJudge(); });
    $('[data-action="prev-rider"]')?.addEventListener('click', () => { state.judgeState.riderIndex = Math.max(0, index - 1); state.judgeState.values = {}; save(); renderJudge(); });
    $('[data-action="next-rider"]')?.addEventListener('click', () => { state.judgeState.riderIndex = Math.min(Math.max(list.length - 1, 0), index + 1); state.judgeState.values = {}; save(); renderJudge(); });
    $('[data-action="submit-score"]')?.addEventListener('click', () => { if (!rider || !panel(event).includes(judgeId)) { toast('Tento účet není přiřazen do panelu.'); return; } const valuesToSave = Object.fromEntries(event.scoring.map(criterion => [criterion.key, Number(state.judgeState.values[criterion.key] || 0)])); if (event.scoring.some(criterion => valuesToSave[criterion.key] < 0 || valuesToSave[criterion.key] > criterion.max)) { toast('Body jsou mimo povolený rozsah.'); return; } const score = {id:uid('score'), riderId:rider.id, categoryId:rider.categoryId, run:state.judgeState.run, judgeId, judge:event.judges.find(item => item.id === judgeId)?.name || 'Porotce', values:valuesToSave, total:scoreTotal(event, valuesToSave), submitted:true}; event.scores = event.scores.filter(item => !(item.riderId === rider.id && item.judgeId === judgeId && item.run === state.judgeState.run)); event.scores.push(score); const next = advanceJudgeAfterSubmit(event, judgeId, list, index); state.judgeState.run = next.run; state.judgeState.heat = next.heat; state.judgeState.riderIndex = next.riderIndex; state.judgeState.values = {}; save(); toast(next.message); renderJudge(); });
  }
  function speakerRiders(event) { return event.riders.filter(rider => rider.categoryId === state.speakerState.categoryId && (!state.speakerState.heat || Number(rider.heat) === Number(state.speakerState.heat))).sort((a,b) => a.bib - b.bib); }
  function renderSpeaker() {
    const event = activeEvent(); const categories = accessibleCategories(event); if (!state.speakerState.categoryId || !categories.some(category => category.id === state.speakerState.categoryId)) state.speakerState.categoryId = categories[0]?.id || '';
    const category = event.categories.find(item => item.id === state.speakerState.categoryId); const assignedHeats = category ? [...new Set(event.riders.filter(rider => rider.categoryId === category.id).map(rider => Number(rider.heat)).filter(heat => heat > 0))].sort((a,b) => a - b) : []; const maxHeat = category ? Math.max(heatCount(event, category), ...assignedHeats, 1) : 1; if (!assignedHeats.length) state.speakerState.heat = 0; else if (state.speakerState.heat && !assignedHeats.includes(Number(state.speakerState.heat))) state.speakerState.heat = 0; const list = speakerRiders(event); const index = Math.min(state.speakerState.riderIndex || 0, Math.max(list.length - 1, 0)); const rider = list[index];
    const content = adminHeader('Speaker mode', 'Startovní listina s informacemi pro uvádění jezdců.', `<select id="speakerCat" class="select">${categories.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === state.speakerState.categoryId ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select><select id="speakerHeat" class="select"><option value="0">Všechny heaty</option>${Array.from({length:maxHeat}, (_,heatIndex) => `<option value="${heatIndex + 1}" ${Number(state.speakerState.heat) === heatIndex + 1 ? 'selected' : ''}>Heat ${heatIndex + 1}</option>`).join('')}</select>`) + (rider ? `<div class="speaker-layout"><div class="card speaker-card"><div class="current-rider"><div style="display:flex;gap:14px;align-items:center"><div class="bib">${rider.bib}</div><div><div class="eyebrow">HEAT ${rider.heat || '—'}</div><h2>${escapeHtml(rider.name)}</h2><div class="muted">${rider.birthYear || '—'} • ${escapeHtml(categoryName(event, rider.categoryId))}</div></div></div><span class="pill">${index + 1} / ${list.length}</span></div><div class="speaker-facts"><div><span>Bydliště</span><b>${escapeHtml(rider.city || '—')}</b></div><div><span>Sponzoři</span><b>${escapeHtml(rider.sponsors || '—')}</b></div><div><span>Instagram</span><b>${escapeHtml(rider.instagram || '—')}</b></div></div><div class="speaker-bio"><span>Info pro speakera</span><p>${escapeHtml(rider.bio || 'Informace zatím nejsou vyplněné.')}</p></div><div class="grid grid-2 mt"><button class="btn btn-outline" data-speaker-prev>← Předchozí</button><button class="btn btn-primary" data-speaker-next>Další →</button></div></div><aside class="card"><h3>Startovka heat ${state.speakerState.heat || 'všech'}</h3>${list.map((item,itemIndex) => `<button class="speaker-list-row ${item.id === rider.id ? 'active' : ''}" data-speaker-index="${itemIndex}"><b>#${item.bib}</b><span>${escapeHtml(item.name)}</span><small>${item.birthYear || '—'}</small></button>`).join('') || '<span class="muted">Heat zatím nemá jezdce.</span>'}</aside></div>` : '<div class="card empty">Pro tuto volbu není žádný jezdec.</div>');
    app.innerHTML = layoutSide(content, 'speaker'); bindAdminCommon();
    $('#speakerCat').onchange = eventTarget => { state.speakerState.categoryId = eventTarget.target.value; state.speakerState.heat = 0; state.speakerState.riderIndex = 0; save(); renderSpeaker(); }; $('#speakerHeat').onchange = eventTarget => { state.speakerState.heat = Number(eventTarget.target.value); state.speakerState.riderIndex = 0; save(); renderSpeaker(); }; $('[data-speaker-prev]')?.addEventListener('click', () => { state.speakerState.riderIndex = Math.max(0, index - 1); save(); renderSpeaker(); }); $('[data-speaker-next]')?.addEventListener('click', () => { state.speakerState.riderIndex = Math.min(Math.max(list.length - 1, 0), index + 1); save(); renderSpeaker(); }); $$('[data-speaker-index]').forEach(button => button.onclick = () => { state.speakerState.riderIndex = Number(button.dataset.speakerIndex); save(); renderSpeaker(); });
  }

  function openEventForm(id) {
    const event = id ? state.events.find(item => item.id === id) : newEvent(); if (!event) return;
    modal(id ? 'Upravit závod' : 'Nový závod', `<form id="eventForm" class="form-grid"><div class="field full"><label>Název závodu *</label><input class="input" name="name" required value="${escapeHtml(event.name)}"></div><div class="field"><label>Datum závodu</label><input class="input" type="date" name="date" value="${escapeHtml(event.date)}"></div><div class="field"><label>Místo</label><input class="input" name="location" value="${escapeHtml(event.location)}"></div><div class="field"><label>Typ poroty</label><select class="select" name="judgeCount"><option value="3" ${event.judgeCount === 3 ? 'selected' : ''}>3 porotci</option><option value="5" ${event.judgeCount === 5 ? 'selected' : ''}>5 porotců</option></select></div><div class="field"><label>Počet jízd</label><select class="select" name="runCount">${[1,2,3].map(count => `<option value="${count}" ${event.runCount === count ? 'selected' : ''}>${count} ${count === 1 ? 'jízda' : 'jízdy'}</option>`).join('')}</select><div class="help">Závod nemá semifinále ani finále.</div></div><div class="field"><label>Stav závodu</label><select class="select" name="status">${['draft','registration','live','finished'].map(status => `<option value="${status}" ${event.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></div><div class="field full"><label>Info o závodu</label><textarea class="textarea" name="info" rows="4" placeholder="Místo, čas, pravidla, kontakt...">${escapeHtml(event.info)}</textarea></div><div class="field full"><button class="btn btn-primary">Uložit závod</button></div></form>`);
    $('#eventForm').onsubmit = formEvent => { formEvent.preventDefault(); const values = Object.fromEntries(new FormData(formEvent.currentTarget)); if (!id) { const created = newEvent({...values, judgeCount:Number(values.judgeCount), runCount:Number(values.runCount)}); ensureEvent(created); state.events.push(created); state.activeEventId = created.id; } else { Object.assign(event, {name:String(values.name).trim(), date:values.date, location:values.location, info:values.info || '', status:values.status, judgeCount:Number(values.judgeCount), runCount:Number(values.runCount)}); ensureEvent(event); } save(); closeModal(); toast('Závod je uložený.'); renderAdmin(); };
  }
  function openCategoryForm(id) {
    const event = activeEvent(); const category = id ? event.categories.find(item => item.id === id) : {name:'', minBirthYear:null, maxBirthYear:null, heatSize:4, order:event.categories.length + 1}; if (!category) return;
    modal(id ? 'Upravit kategorii' : 'Nová kategorie', `<form id="categoryForm" class="form-grid"><div class="field full"><label>Název kategorie *</label><input class="input" name="name" required value="${escapeHtml(category.name)}" placeholder="-14 let"></div><div class="field"><label>Od ročníku</label><input class="input" type="number" name="minBirthYear" min="1900" max="${yearNow + 1}" value="${category.minBirthYear ?? ''}" placeholder="např. 2013"></div><div class="field"><label>Do ročníku</label><input class="input" type="number" name="maxBirthYear" min="1900" max="${yearNow + 1}" value="${category.maxBirthYear ?? ''}" placeholder="např. 2012"></div><div class="field"><label>Jezdců v heat</label><input class="input" type="number" name="heatSize" min="1" max="99" value="${category.heatSize || 4}"></div><div class="field full"><div class="help">Prázdné „od“ znamená bez dolní hranice, prázdné „do“ bez horní hranice. Rozsahy se nesmí překrývat.</div></div><div class="field full"><button class="btn btn-primary">Uložit kategorii</button></div></form>`);
    $('#categoryForm').onsubmit = formEvent => { formEvent.preventDefault(); const values = Object.fromEntries(new FormData(formEvent.currentTarget)); const next = {...category, name:String(values.name).trim(), minBirthYear:parseYear(values.minBirthYear), maxBirthYear:parseYear(values.maxBirthYear), heatSize:Math.max(1, Number(values.heatSize) || 4)}; if (next.minBirthYear != null && next.maxBirthYear != null && next.minBirthYear > next.maxBirthYear) { toast('Ročník „od“ musí být menší nebo stejný jako „do“.'); return; } if (event.categories.some(item => item.id !== id && rangesOverlap(next, item))) { toast('Rozsah se překrývá s jinou kategorií.'); return; } if (!id) { next.id = uid('cat'); event.categories.push(next); } else Object.assign(category, next); event.riders.forEach(rider => assignCategory(event, rider)); save(); closeModal(); toast('Kategorie je uložená.'); adminCategories(); };
  }
  function openRiderForm() { const event = activeEvent(); modal('Přidat jezdce', `<form id="riderForm" class="form-grid"><div class="field full"><label>Jméno *</label><input class="input" name="name" required></div><div class="field"><label>Rok narození *</label><input class="input" type="number" name="birthYear" min="1900" max="${yearNow + 1}" required></div><div class="field"><label>Startovní číslo</label><input class="input" type="number" name="bib" value="${Math.max(0, ...event.riders.map(rider => rider.bib || 0)) + 1}"></div><div class="field"><label>Město</label><input class="input" name="city"></div><div class="field"><label>Instagram</label><input class="input" name="instagram"></div><div class="field full"><button class="btn btn-primary">Uložit</button></div></form>`); $('#riderForm').onsubmit = formEvent => { formEvent.preventDefault(); const values = Object.fromEntries(new FormData(formEvent.currentTarget)); const rider = {id:uid('rider'), registrationOrder:event.riders.length + 1, name:String(values.name).trim(), birthYear:parseYear(values.birthYear), bib:Number(values.bib) || event.riders.length + 1, city:values.city || '', instagram:values.instagram || '', sponsors:'', bio:'', status:'registered'}; assignCategory(event, rider); event.riders.push(rider); save(); closeModal(); adminRiders(); }; }
  function openJudgeForm() { const event = activeEvent(); modal('Přidat uživatele', `<form id="judgeForm" class="form-grid"><div class="field full"><label>Jméno *</label><input class="input" name="name" required></div><div class="field full"><label>E-mail Google účtu *</label><input class="input" name="email" type="email" required></div><div class="field full"><label>Role</label><select class="select" name="role"><option value="judge">Judge</option><option value="head_judge">Head Judge</option><option value="speaker">Speaker</option><option value="registration">Prezence</option><option value="admin">Admin</option></select></div><div class="field full"><button class="btn btn-primary">Uložit</button></div></form>`); $('#judgeForm').onsubmit = formEvent => { formEvent.preventDefault(); const values = Object.fromEntries(new FormData(formEvent.currentTarget)); event.judges.push({id:uid('judge'), ...values, categoryIds:[]}); save(); closeModal(); adminJudges(); }; }
  function openCriterionForm(index) { const event = activeEvent(); const criterion = index == null ? {key:uid('criterion'), label:'', max:25, weight:1, desc:''} : event.scoring[index]; modal(index == null ? 'Nové kritérium' : 'Upravit kritérium', `<form id="criterionForm" class="form-grid"><div class="field full"><label>Název *</label><input class="input" name="label" required value="${escapeHtml(criterion.label)}"></div><div class="field"><label>Maximum</label><input class="input" name="max" type="number" min="0" step="0.1" value="${criterion.max}"></div><div class="field"><label>Váha</label><input class="input" name="weight" type="number" min="0" step="0.1" value="${criterion.weight}"></div><div class="field full"><label>Popis</label><input class="input" name="desc" value="${escapeHtml(criterion.desc || '')}"></div><div class="field full"><button class="btn btn-primary">Uložit</button></div></form>`); $('#criterionForm').onsubmit = formEvent => { formEvent.preventDefault(); const values = Object.fromEntries(new FormData(formEvent.currentTarget)); Object.assign(criterion, {label:values.label, max:Number(values.max), weight:Number(values.weight), desc:values.desc}); if (index == null) event.scoring.push(criterion); save(); closeModal(); adminSettings(); }; }
  function openCsvImport() { modal('Import přihlášek', `<div class="dropzone"><b>Exportuj odpovědi Google Form jako CSV</b><p>Stačí jméno a rok narození. Kategorie se nepřenáší, web ji doplní podle nastaveného rozsahu.</p><input id="csvFile" type="file" accept=".csv,text/csv"></div><div id="csvStatus" class="help mt"></div>`); $('#csvFile').onchange = async changeEvent => { const file = changeEvent.target.files[0]; if (!file) return; try { const count = importRows(parseCSV(await file.text())); $('#csvStatus').innerHTML = `<span class="accent">Hotovo: importováno ${count} jezdců.</span>`; save(); setTimeout(() => { closeModal(); adminRiders(); }, 700); } catch (error) { $('#csvStatus').textContent = `Chyba: ${error.message}`; } }; }
  function parseCSV(text) { const first = text.split(/\r?\n/)[0] || ''; const delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ','; const rows = []; let row = [], cell = '', quoted = false; for (let index = 0; index < text.length; index += 1) { const char = text[index]; if (char === '"') { if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; } else quoted = !quoted; } else if (char === delimiter && !quoted) { row.push(cell); cell = ''; } else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[index + 1] === '\n') index += 1; row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ''; } else cell += char; } if (cell || row.length) { row.push(cell); rows.push(row); } return rows; }
  function importRows(rows) { if (rows.length < 2) return 0; const event = activeEvent(); const normalizeHeader = value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); const headers = rows[0].map(normalizeHeader); const indexOf = (...names) => headers.findIndex(header => names.some(name => header.includes(normalizeHeader(name)))); const nameIndex = indexOf('jméno závodníka','jmeno zavodnika','jméno','name'); const yearIndex = indexOf('rok narození','rok narozeni','year','datum narození','datum narozeni','birth'); const cityIndex = indexOf('město','mesto','city'); const sponsorsIndex = indexOf('sponzoři','sponzori','sponsors'); const instagramIndex = indexOf('instagram'); const bioIndex = indexOf('informace o jezdci','bio'); let count = 0; for (const row of rows.slice(1)) { const name = row[nameIndex]?.trim(); const birthYear = parseYear(row[yearIndex]); if (!name || !birthYear) continue; const rider = {id:uid('rider'), registrationOrder:event.riders.length + 1, bib:Math.max(0, ...event.riders.map(item => Number(item.bib) || 0)) + 1, name, birthYear, city:cityIndex >= 0 ? row[cityIndex] || '' : '', sponsors:sponsorsIndex >= 0 ? row[sponsorsIndex] || '' : '', instagram:instagramIndex >= 0 ? row[instagramIndex] || '' : '', bio:bioIndex >= 0 ? row[bioIndex] || '' : '', status:'registered'}; assignCategory(event, rider); event.riders.push(rider); count += 1; } return count; }
  function exportResults(event, categoryId) { const safe = value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`; const rows = [['Pořadí','Startovní číslo','Jezdec','Ročník','Kategorie',...panel(event).map((_,index) => `Porotce ${index + 1}`),'Výsledek','Hodnoceno','Porota'], ...leaderboard(event, categoryId).map(row => [row.rank,row.bib,row.name,row.birthYear,categoryName(event,row.categoryId),...row.marks,row.total == null ? '' : row.total.toFixed(2),row.received,event.judgeCount])]; download(`vysledky-${categoryName(event,categoryId)}.csv`, rows.map(row => row.map(safe).join(';')).join('\n')); }
  function download(name, text) { const blob = new Blob(['\ufeff' + text], {type:'text/csv;charset=utf-8'}); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; link.click(); URL.revokeObjectURL(link.href); }
  function logout() { state.currentUser = null; save(); if (sb) sb.auth.signOut(); location.hash = 'login'; }
  function modal(title, body) { const template = $('#modalTemplate').content.cloneNode(true); template.querySelector('#modalTitle').textContent = title; template.querySelector('#modalBody').innerHTML = body; document.body.appendChild(template); $$('[data-modal-close]').forEach(element => element.onclick = closeModal); }
  function closeModal() { document.querySelector('.modal-backdrop')?.remove(); }
  async function handleAuth() { if (!sb) return false; const {data:{session}} = await sb.auth.getSession(); if (!session) return false; const email = session.user.email; let role = 'viewer'; let name = session.user.user_metadata?.full_name || email; const {data} = await sb.from('profiles').select('role,full_name').eq('id', session.user.id).maybeSingle(); if (data) { role = data.role || role; name = data.full_name || name; } state.currentUser = {id:session.user.id, name, email, role}; save(); if (route() === 'auth') location.hash = role === 'admin' ? 'admin' : role === 'judge' || role === 'head_judge' ? 'judge' : role === 'speaker' ? 'speaker' : 'login'; return true; }
  function renderLogin() { app.innerHTML = `<div class="login-shell"><div class="card"><div class="eyebrow">STAFF LOGIN</div><h1>Přihlášení</h1><p class="muted">Admin, rozhodčí a speaker se přihlásí přes Google. Diváci login nepotřebují.</p><button id="googleLogin" class="google-btn"><b>G</b> Pokračovat přes Google</button>${DEMO ? `<div class="section-title"><div><h3>Demo přístup</h3><p>Vyzkoušej role bez databáze.</p></div></div><div class="demo-logins"><button class="btn btn-outline" data-demo-role="admin">Admin</button><button class="btn btn-outline" data-demo-role="judge">Rozhodčí</button><button class="btn btn-outline" data-demo-role="speaker">Speaker</button></div>` : ''}</div></div>`; $('#googleLogin').onclick = async () => { if (!sb) { toast('Nejdřív doplň Supabase URL a klíč.'); return; } const {error} = await sb.auth.signInWithOAuth({provider:'google', options:{redirectTo:location.origin + '/#auth'}}); if (error) toast(error.message); }; $$('[data-demo-role]').forEach(button => button.onclick = () => { const role = button.dataset.demoRole; state.currentUser = {id:role === 'admin' ? 'admin' : role === 'judge' ? panel(activeEvent())[0] : panel(activeEvent())[0], name:role === 'admin' ? 'Demo administrátor' : role === 'judge' ? 'Demo porotce 1' : 'Demo speaker', role}; if (role === 'judge') state.judgeState.judgeId = panel(activeEvent())[0]; save(); location.hash = role === 'admin' ? 'admin' : role; }); }
  async function render() { setActiveNav(); await handleAuth(); const current = route(); if (current === 'events') renderEvents(); else if (current === 'live') renderLive(); else if (current === 'startlist') renderStartlist(); else if (current === 'registration') renderRegistration(); else if (current === 'login' || current === 'auth') renderLogin(); else if (current === 'admin') renderAdmin(); else if (current === 'judge') canUseJudge() ? renderJudge() : renderAccessDenied('Judge mode je jen pro rozhodčího'); else if (current === 'speaker') canUseSpeaker() ? renderSpeaker() : renderAccessDenied('Speaker mode je jen pro speakera'); else renderEvents(); window.scrollTo({top:0, behavior:'instant'}); }
  render();
})();
