(() => {
  const CFG = window.SCOOT_CONFIG || {};
  const hasSupabase = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  const DEMO = CFG.DEMO_MODE !== false || !hasSupabase;
  const sb = hasSupabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const app = $('#app');
  const modeBadge = $('#modeBadge');
  modeBadge.textContent = DEMO ? 'DEMO režim • data zůstávají v tomto prohlížeči' : 'ONLINE • Supabase';

  const scoringDefault = [
    {key:'difficulty',label:'Difficulty',max:20,weight:1,desc:'Obtížnost triků a kombinací'},
    {key:'execution',label:'Execution',max:20,weight:1,desc:'Čistota provedení a kontrola'},
    {key:'style',label:'Style',max:20,weight:1,desc:'Styl, flow a originalita'},
    {key:'variety',label:'Variety',max:20,weight:1,desc:'Variabilita triků'},
    {key:'park',label:'Use of park',max:20,weight:1,desc:'Využití překážek a prostoru'}
  ];

  const seed = {
    currentUser:null,
    event:{id:'ev1',name:'Scootshop Contest 2026',slug:'scootshop-contest-2026',date:'29. 8. 2026',location:'Ústí nad Orlicí',status:'live'},
    categories:[
      {id:'c1',name:'U13',runs:2,advance:8,order:1},
      {id:'c2',name:'U16',runs:2,advance:8,order:2},
      {id:'c3',name:'OPEN',runs:2,advance:10,order:3},
      {id:'c4',name:'PRO',runs:2,advance:8,order:4}
    ],
    scoring:scoringDefault,
    riders:[
      {id:'r1',bib:21,name:'Demo jezdec 1',categoryId:'c2',city:'',birth:'',sponsors:'',instagram:'',bio:'',status:'checked-in'},
      {id:'r2',bib:34,name:'Demo jezdec 2',categoryId:'c2',city:'',birth:'',sponsors:'',instagram:'',bio:'',status:'checked-in'},
      {id:'r3',bib:18,name:'Demo jezdec 3',categoryId:'c2',city:'',birth:'',sponsors:'',instagram:'',bio:'',status:'checked-in'},
      {id:'r4',bib:7,name:'Demo jezdec 4',categoryId:'c2',city:'',birth:'',sponsors:'',instagram:'',bio:'',status:'checked-in'},
      {id:'r5',bib:51,name:'Demo jezdec 5',categoryId:'c3',city:'',birth:'',sponsors:'',instagram:'',bio:'',status:'registered'},
      {id:'r6',bib:3,name:'Demo jezdec 6',categoryId:'c4',city:'',birth:'',sponsors:'',instagram:'',bio:'',status:'checked-in'}
    ],
    scores:[
      {id:'s1',riderId:'r1',categoryId:'c2',run:1,judge:'Judge 1',values:{difficulty:18.2,execution:17.5,style:18.4,variety:17.9,park:18.1},total:90.1,submitted:true},
      {id:'s2',riderId:'r1',categoryId:'c2',run:2,judge:'Judge 1',values:{difficulty:18.5,execution:18.1,style:18.6,variety:18.0,park:18.5},total:91.7,submitted:true},
      {id:'s3',riderId:'r2',categoryId:'c2',run:1,judge:'Judge 1',values:{difficulty:17.8,execution:17.9,style:18.0,variety:17.7,park:18.0},total:89.4,submitted:true},
      {id:'s4',riderId:'r2',categoryId:'c2',run:2,judge:'Judge 1',values:{difficulty:17.5,execution:17.8,style:17.7,variety:17.6,park:17.6},total:88.2,submitted:true},
      {id:'s5',riderId:'r3',categoryId:'c2',run:1,judge:'Judge 1',values:{difficulty:17.1,execution:16.8,style:17.0,variety:17.0,park:17.2},total:85.1,submitted:true},
      {id:'s6',riderId:'r3',categoryId:'c2',run:2,judge:'Judge 1',values:{difficulty:17.6,execution:17.5,style:17.8,variety:17.3,park:17.6},total:87.8,submitted:true}
    ],
    judges:[
      {id:'u1',name:'Demo administrátor',email:'admin@example.invalid',role:'admin'},
      {id:'u2',name:'Demo rozhodčí 1',email:'judge1@example.invalid',role:'judge'},
      {id:'u3',name:'Demo rozhodčí 2',email:'judge2@example.invalid',role:'judge'}
    ],
    judgeState:{categoryId:'c2',riderIndex:0,run:1,values:{}}
  };

  const store = {
    load(){
      if(!DEMO) return structuredClone(seed);
      const raw = localStorage.getItem('scootScoringData');
      if(!raw){ localStorage.setItem('scootScoringData',JSON.stringify(seed)); return structuredClone(seed); }
      try{return JSON.parse(raw)}catch{return structuredClone(seed)}
    },
    save(){ if(DEMO) localStorage.setItem('scootScoringData',JSON.stringify(state)); }
  };
  let state = store.load();

  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid = (p='id') => p+Math.random().toString(36).slice(2,9);
  const catName = id => state.categories.find(c=>c.id===id)?.name || '—';
  const rider = id => state.riders.find(r=>r.id===id);
  const toast = msg => { const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); };
  const save = () => store.save();

  function route(){return (location.hash.slice(1).split('?')[0] || 'live').toLowerCase()}
  function setActiveNav(){const r=route();$$('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===r));$('#mainNav')?.classList.remove('open')}
  window.addEventListener('hashchange',render);
  $('#navToggle').addEventListener('click',()=>$('#mainNav').classList.toggle('open'));

  function layoutSide(content, active='dashboard'){
    const user=state.currentUser || {name:'Demo Admin',role:'admin'};
    return `<div class="app-shell">
      <aside class="sidebar">
        <div class="side-user"><b>${escapeHtml(user.name)}</b><small>${escapeHtml(user.role)}</small></div>
        <div class="side-nav">
          <button data-side="dashboard" class="${active==='dashboard'?'active':''}">Přehled</button>
          <button data-side="riders" class="${active==='riders'?'active':''}">Jezdci</button>
          <button data-side="categories" class="${active==='categories'?'active':''}">Kategorie</button>
          <button data-side="judges" class="${active==='judges'?'active':''}">Rozhodčí</button>
          <button data-side="settings" class="${active==='settings'?'active':''}">Scoring</button>
          <button data-side="judge">Judge mode</button>
          <button class="logout" data-action="logout">Odhlásit</button>
        </div>
      </aside>
      <section class="content">${content}</section>
    </div>`
  }

  function publicHero(title,sub){
    return `<section class="hero"><div><div class="eyebrow"><span class="live-dot"></span>LIVE SCORING</div><h1>${title}</h1><p>${sub}</p></div><div class="hero-event"><small>Aktuální závod</small><h3>${escapeHtml(state.event.name)}</h3><div class="muted">${escapeHtml(state.event.date)} • ${escapeHtml(state.event.location)}</div><div class="mt"><span class="pill live">● Závod probíhá</span></div></div></section>`
  }

  function leaderboard(categoryId='c2'){
    const rows = state.riders.filter(r=>r.categoryId===categoryId).map(r=>{
      const ss=state.scores.filter(s=>s.riderId===r.id && s.submitted);
      const run1=ss.filter(s=>s.run===1).map(s=>s.total); const run2=ss.filter(s=>s.run===2).map(s=>s.total);
      const avg=a=>a.length?+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2):null;
      const a=avg(run1),b=avg(run2),best=Math.max(a??-1,b??-1);return {...r,run1:a,run2:b,best:best<0?null:best};
    }).sort((a,b)=>(b.best??-1)-(a.best??-1));
    return rows;
  }

  function renderLive(){
    const selected = sessionStorage.getItem('liveCat') || 'c2';
    app.innerHTML = publicHero('Výsledky v reálném čase.','Body od rozhodčích se propisují přímo do leaderboardu. Diváci, speaker i riders vidí stejné pořadí bez přepisování tabulek.') + `
      <div class="section-title"><div><h2>Live leaderboard</h2><p>Nejlepší jízda ze dvou runů</p></div><span class="pill live">AUTO REFRESH</span></div>
      <div class="toolbar"><div class="tabs">${state.categories.map(c=>`<button class="tab ${selected===c.id?'active':''}" data-live-cat="${c.id}">${escapeHtml(c.name)}</button>`).join('')}</div><button class="btn btn-outline" data-action="export-results">Export CSV</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Rider</th><th>Run 1</th><th>Run 2</th><th>Best</th></tr></thead><tbody>
      ${leaderboard(selected).map((r,i)=>`<tr><td class="rank">${i+1}</td><td><div class="rider-name">${escapeHtml(r.name)}</div><div class="rider-meta">#${r.bib} • ${escapeHtml(r.city)}${r.sponsors?' • '+escapeHtml(r.sponsors):''}</div></td><td class="score">${r.run1?.toFixed(1)??'—'}</td><td class="score">${r.run2?.toFixed(1)??'—'}</td><td class="score score-best">${r.best?.toFixed(1)??'—'}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">Zatím bez výsledků.</td></tr>`}
      </tbody></table></div>`;
    $$('[data-live-cat]').forEach(b=>b.onclick=()=>{sessionStorage.setItem('liveCat',b.dataset.liveCat);renderLive()});
    $('[data-action="export-results"]')?.addEventListener('click',()=>exportResults(selected));
  }

  function renderStartlist(){
    const selected=sessionStorage.getItem('startCat')||'c2';
    const list=state.riders.filter(r=>r.categoryId===selected).sort((a,b)=>a.bib-b.bib);
    app.innerHTML=publicHero('Startovní listina.','Přehled přihlášených jezdců, startovních čísel a kategorií. Admin může pořadí kdykoliv upravit.')+`
      <div class="section-title"><div><h2>Startovka</h2><p>${list.length} jezdců v kategorii ${escapeHtml(catName(selected))}</p></div></div>
      <div class="toolbar"><div class="tabs">${state.categories.map(c=>`<button class="tab ${selected===c.id?'active':''}" data-start-cat="${c.id}">${escapeHtml(c.name)}</button>`).join('')}</div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Jezdec</th><th>Město</th><th>Sponzoři</th><th>Stav</th></tr></thead><tbody>${list.map(r=>`<tr><td class="score">${r.bib}</td><td class="rider-name">${escapeHtml(r.name)}</td><td>${escapeHtml(r.city)}</td><td>${escapeHtml(r.sponsors||'—')}</td><td><span class="pill ${r.status==='checked-in'?'live':'warn'}">${r.status==='checked-in'?'Prezentován':'Přihlášen'}</span></td></tr>`).join('')}</tbody></table></div>`;
    $$('[data-start-cat]').forEach(b=>b.onclick=()=>{sessionStorage.setItem('startCat',b.dataset.startCat);renderStartlist()});
  }

  function renderRegistration(){
    app.innerHTML=`<div class="registration-shell"><div class="card"><div class="registration-head"><div><div class="eyebrow">ONLINE PŘIHLÁŠKA</div><h1>${escapeHtml(state.event.name)}</h1><p class="muted">Jeden formulář → jezdec se rovnou objeví v administraci a ve startovní listině.</p></div><span class="pill">${escapeHtml(state.event.date)}</span></div>
      <form id="registrationForm" class="form-grid">
        <div class="field full"><label>Jméno a příjmení *</label><input class="input" name="name" required placeholder="Jan Novák"></div>
        <div class="field"><label>Kategorie *</label><select class="select" name="categoryId" required>${state.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Datum narození *</label><input class="input" type="date" name="birth" required></div>
        <div class="field"><label>Město</label><input class="input" name="city" placeholder="Pardubice"></div>
        <div class="field"><label>Instagram</label><input class="input" name="instagram" placeholder="@username"></div>
        <div class="field full"><label>Sponzoři</label><input class="input" name="sponsors" placeholder="Divine, Scootshop..."></div>
        <div class="field full"><label>Informace o jezdci</label><textarea class="textarea" rows="4" name="bio" placeholder="Krátké info pro speakera..."></textarea></div>
        <div class="field full"><button class="btn btn-primary" type="submit">Odeslat přihlášku</button><div class="help">V ostré verzi doplníme GDPR souhlas a kontaktní údaje rodiče podle věku jezdce.</div></div>
      </form></div></div>`;
    $('#registrationForm').onsubmit=async e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);const obj=Object.fromEntries(f.entries());
      const maxBib=Math.max(0,...state.riders.map(r=>+r.bib||0));
      const newR={id:uid('r'),bib:maxBib+1,name:obj.name,categoryId:obj.categoryId,birth:obj.birth,city:obj.city||'',instagram:obj.instagram||'',sponsors:obj.sponsors||'',bio:obj.bio||'',status:'registered'};
      if(!DEMO && sb){
        const {error}=await sb.from('registrations_public').insert({event_slug:state.event.slug,...newR});
        if(error){toast('Nepodařilo se uložit: '+error.message);return;}
      } else {state.riders.push(newR);save();}
      e.currentTarget.innerHTML='<div class="success"><b>Přihláška je uložená.</b><br>Startovní číslo: #'+newR.bib+'. Jezdec je připravený k prezenci.</div>';
    };
  }

  function renderLogin(){
    app.innerHTML=`<div class="login-shell"><div class="card"><div class="eyebrow">STAFF LOGIN</div><h1>Přihlášení</h1><p class="muted">Admin a rozhodčí se přihlásí Google účtem. Diváci a riders login nepotřebují.</p><div class="mt"><button id="googleLogin" class="google-btn"><b>G</b> Pokračovat přes Google</button></div>${DEMO?`<div class="section-title"><div><h3>Demo přístup</h3><p>Pro vyzkoušení bez databáze</p></div></div><div class="demo-logins"><button class="btn btn-outline" data-demo-role="admin">Admin</button><button class="btn btn-outline" data-demo-role="judge">Rozhodčí</button></div>`:''}<div class="help mt">Role se po prvním přihlášení nastaví v administraci.</div></div></div>`;
    $('#googleLogin').onclick=async()=>{
      if(!sb){toast('Nejdřív doplň Supabase URL a klíč do config.js.');return;}
      const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/#auth'}});if(error)toast(error.message);
    };
    $$('[data-demo-role]').forEach(b=>b.onclick=()=>{const role=b.dataset.demoRole;state.currentUser=role==='admin'?{name:'Demo administrátor',role:'admin',email:'admin@example.invalid'}:{name:'Demo rozhodčí 1',role:'judge',email:'judge1@example.invalid'};save();location.hash=role==='admin'?'admin':'judge'});
  }

  function adminHeader(title,sub,actions=''){return `<div class="content-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="toolbar">${actions}</div></div>`}

  function adminDashboard(){
    const content=adminHeader('Přehled závodu','Všechno důležité na jednom místě.',`<button class="btn btn-primary" data-admin-action="open-judge">Spustit scoring</button>`)+`
      <div class="grid grid-4"><div class="card stat"><span>Jezdci</span><strong>${state.riders.length}</strong></div><div class="card stat"><span>Kategorie</span><strong>${state.categories.length}</strong></div><div class="card stat"><span>Rozhodčí</span><strong>${state.judges.filter(j=>j.role==='judge').length}</strong></div><div class="card stat"><span>Odeslané scores</span><strong>${state.scores.filter(s=>s.submitted).length}</strong></div></div>
      <div class="section-title"><div><h2>Kategorie</h2><p>Stav závodu a počty jezdců</p></div></div>
      <div class="grid grid-2">${state.categories.map(c=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:16px"><div><span class="pill live">LIVE</span><h2 style="font:700 32px 'Space Grotesk';margin:12px 0 3px">${escapeHtml(c.name)}</h2><span class="muted">${state.riders.filter(r=>r.categoryId===c.id).length} jezdců • ${c.runs} runy</span></div><div class="right"><div class="muted">Postup</div><div class="score">TOP ${c.advance}</div></div></div><div class="progress"><span style="width:${Math.min(100,state.scores.filter(s=>s.categoryId===c.id).length/Math.max(1,state.riders.filter(r=>r.categoryId===c.id).length*c.runs)*100)}%"></span></div></div>`).join('')}</div>`;
    app.innerHTML=layoutSide(content,'dashboard');bindAdminCommon();$('[data-admin-action="open-judge"]')?.addEventListener('click',()=>location.hash='judge');
  }

  function adminRiders(){
    const content=adminHeader('Jezdci','Přihlášky, prezence a rozdělení do kategorií.',`<button class="btn btn-outline" data-action="import-csv">Import Google Sheets CSV</button><button class="btn btn-primary" data-action="add-rider">+ Přidat jezdce</button>`)+`
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Jezdec</th><th>Kategorie</th><th>Město</th><th>Instagram</th><th>Stav</th></tr></thead><tbody>${state.riders.sort((a,b)=>a.bib-b.bib).map(r=>`<tr><td class="score">${r.bib}</td><td><div class="rider-name">${escapeHtml(r.name)}</div><div class="rider-meta">${escapeHtml(r.sponsors||'')}</div></td><td><span class="pill">${escapeHtml(catName(r.categoryId))}</span></td><td>${escapeHtml(r.city||'—')}</td><td>${escapeHtml(r.instagram||'—')}</td><td><button class="btn btn-small ${r.status==='checked-in'?'btn-primary':'btn-outline'}" data-checkin="${r.id}">${r.status==='checked-in'?'Prezentován':'Prezentovat'}</button></td></tr>`).join('')}</tbody></table></div>`;
    app.innerHTML=layoutSide(content,'riders');bindAdminCommon();$$('[data-checkin]').forEach(b=>b.onclick=()=>{const r=rider(b.dataset.checkin);r.status=r.status==='checked-in'?'registered':'checked-in';save();adminRiders()});
    $('[data-action="add-rider"]')?.addEventListener('click',openAddRider);$('[data-action="import-csv"]')?.addEventListener('click',openCsvImport);
  }

  function adminCategories(){
    const content=adminHeader('Kategorie','Nastavení runů a počtu postupujících.',`<button class="btn btn-primary" data-action="add-category">+ Kategorie</button>`)+`<div class="grid grid-2">${state.categories.map(c=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:18px"><div><h2>${escapeHtml(c.name)}</h2><span class="muted">${state.riders.filter(r=>r.categoryId===c.id).length} jezdců</span></div><button class="icon-btn" data-edit-cat="${c.id}">✎</button></div><div class="grid grid-2 mt"><div><span class="muted">Runy</span><div class="score">${c.runs}</div></div><div><span class="muted">Postupuje</span><div class="score">TOP ${c.advance}</div></div></div></div>`).join('')}</div>`;
    app.innerHTML=layoutSide(content,'categories');bindAdminCommon();$('[data-action="add-category"]')?.addEventListener('click',()=>openCategory());$$('[data-edit-cat]').forEach(b=>b.onclick=()=>openCategory(b.dataset.editCat));
  }

  function adminJudges(){
    const content=adminHeader('Rozhodčí a role','Kdo může zadávat body, spravovat závod nebo obsluhovat prezenci.',`<button class="btn btn-primary" data-action="add-judge">+ Uživatel</button>`)+`<div class="table-wrap"><table class="table"><thead><tr><th>Jméno</th><th>E-mail</th><th>Role</th></tr></thead><tbody>${state.judges.map(j=>`<tr><td class="rider-name">${escapeHtml(j.name)}</td><td>${escapeHtml(j.email)}</td><td><span class="pill">${escapeHtml(j.role.toUpperCase())}</span></td></tr>`).join('')}</tbody></table></div>`;
    app.innerHTML=layoutSide(content,'judges');bindAdminCommon();$('[data-action="add-judge"]')?.addEventListener('click',openJudge);
  }

  function adminSettings(){
    const max=state.scoring.reduce((s,c)=>s+c.max*c.weight,0);
    const content=adminHeader('Scoring pravidla','Kritéria jsou konfigurovatelná. Až dodáš Excel, nastavíme je 1:1.',`<button class="btn btn-primary" data-action="add-criterion">+ Kritérium</button>`)+`
      <div class="card"><div class="section-title" style="margin-top:0"><div><h2>Kritéria</h2><p>Maximum celkem: ${max}</p></div></div>${state.scoring.map((c,i)=>`<div class="criterion"><div class="criterion-head"><div><b>${escapeHtml(c.label)}</b><div class="help">${escapeHtml(c.desc||'')}</div></div><div style="display:flex;align-items:center;gap:10px"><span class="pill">max ${c.max} • váha ${c.weight}</span><button class="icon-btn" data-edit-criterion="${i}">✎</button></div></div></div>`).join('')}</div>
      <div class="card mt"><h3>Výpočet výsledku</h3><p class="muted">Aktuální demo: součet kritérií, 2 runy, do pořadí se počítá nejlepší run. V ostré verzi můžeme nastavit průměr rozhodčích, škrtání nejvyšší/nejnižší známky i tie-break přesně podle Excelu.</p></div>`;
    app.innerHTML=layoutSide(content,'settings');bindAdminCommon();$('[data-action="add-criterion"]')?.addEventListener('click',()=>openCriterion());$$('[data-edit-criterion]').forEach(b=>b.onclick=()=>openCriterion(+b.dataset.editCriterion));
  }

  function renderAdmin(){if(!state.currentUser && DEMO){state.currentUser={name:'Demo administrátor',role:'admin'}};const section=sessionStorage.getItem('adminSection')||'dashboard';({dashboard:adminDashboard,riders:adminRiders,categories:adminCategories,judges:adminJudges,settings:adminSettings}[section]||adminDashboard)()}
  function bindAdminCommon(){
    $$('[data-side]').forEach(b=>b.onclick=()=>{const s=b.dataset.side;if(s==='judge'){location.hash='judge';return}sessionStorage.setItem('adminSection',s);renderAdmin()});
    $('[data-action="logout"]')?.addEventListener('click',logout);
  }

  function judgeRiders(){return state.riders.filter(r=>r.categoryId===state.judgeState.categoryId && r.status==='checked-in')}
  function scoreTotal(values){return +state.scoring.reduce((sum,c)=>sum+(+values[c.key]||0)*c.weight,0).toFixed(1)}
  function renderJudge(){
    if(!state.currentUser && DEMO) state.currentUser={name:'Demo rozhodčí 1',role:'judge'};
    const list=judgeRiders(); if(!list.length){state.judgeState.riderIndex=0}
    const idx=Math.min(state.judgeState.riderIndex||0,Math.max(0,list.length-1)); const r=list[idx];
    if(!state.judgeState.values || Object.keys(state.judgeState.values).length===0) state.judgeState.values=Object.fromEntries(state.scoring.map(c=>[c.key,0]));
    const vals=state.judgeState.values; const total=scoreTotal(vals); const max=state.scoring.reduce((s,c)=>s+c.max*c.weight,0);
    const content=adminHeader('Judge mode','Rychlé zadávání bodů z mobilu nebo tabletu.',`<select id="judgeCat" class="select">${state.categories.map(c=>`<option value="${c.id}" ${c.id===state.judgeState.categoryId?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select>`)+`${r?`<div class="judge-grid"><div class="card"><div class="current-rider"><div style="display:flex;gap:14px;align-items:center"><div class="bib">${r.bib}</div><div><div class="eyebrow">RUN ${state.judgeState.run}</div><h2>${escapeHtml(r.name)}</h2><div class="muted">${escapeHtml(r.city)} • ${escapeHtml(catName(r.categoryId))}</div></div></div><span class="pill">${idx+1} / ${list.length}</span></div>
      ${state.scoring.map(c=>`<div class="criterion"><div class="criterion-head"><div><b>${escapeHtml(c.label)}</b><div class="help">${escapeHtml(c.desc||'')}</div></div><span class="criterion-score" data-score-label="${c.key}">${(+vals[c.key]||0).toFixed(1)}</span></div><input class="range" type="range" min="0" max="${c.max}" step="0.1" value="${+vals[c.key]||0}" data-criterion="${c.key}"></div>`).join('')}
      </div><aside class="card total-box"><div class="eyebrow">CELKOVÉ SKÓRE</div><div class="big-total" id="judgeTotal">${total.toFixed(1)}</div><div class="total-max">z ${max}</div><div class="progress"><span id="judgeProgress" style="width:${total/max*100}%"></span></div><div class="total-actions"><button class="btn btn-primary" data-action="submit-score">Odeslat score</button><button class="btn btn-outline" data-action="reset-score">Vynulovat</button><div class="grid grid-2"><button class="btn btn-outline" data-action="prev-rider">← Předchozí</button><button class="btn btn-outline" data-action="next-rider">Další →</button></div><div class="tabs" style="width:100%;justify-content:center"><button class="tab ${state.judgeState.run===1?'active':''}" data-run="1">Run 1</button><button class="tab ${state.judgeState.run===2?'active':''}" data-run="2">Run 2</button></div></div><div class="judge-history"><b>Uložené známky</b>${state.scores.filter(s=>s.riderId===r.id).map(s=>`<div class="history-row"><span>Run ${s.run} • ${escapeHtml(s.judge)}</span><b>${s.total.toFixed(1)}</b></div>`).join('')||'<span class="muted">Zatím nic.</span>'}</div></aside></div>`:`<div class="card empty">V této kategorii není žádný prezentovaný jezdec.</div>`}`;
    app.innerHTML=layoutSide(content,'judge');
    $$('[data-side]').forEach(b=>b.onclick=()=>{if(b.dataset.side==='judge')return;sessionStorage.setItem('adminSection',b.dataset.side);location.hash='admin'});$('[data-action="logout"]')?.addEventListener('click',logout);
    $('#judgeCat')?.addEventListener('change',e=>{state.judgeState.categoryId=e.target.value;state.judgeState.riderIndex=0;state.judgeState.values={};save();renderJudge()});
    $$('[data-criterion]').forEach(inp=>inp.oninput=()=>{state.judgeState.values[inp.dataset.criterion]=+inp.value;const t=scoreTotal(state.judgeState.values);$(`[data-score-label="${inp.dataset.criterion}"]`).textContent=(+inp.value).toFixed(1);$('#judgeTotal').textContent=t.toFixed(1);$('#judgeProgress').style.width=(t/max*100)+'%';save()});
    $$('[data-run]').forEach(b=>b.onclick=()=>{state.judgeState.run=+b.dataset.run;state.judgeState.values={};save();renderJudge()});
    $('[data-action="reset-score"]')?.addEventListener('click',()=>{state.judgeState.values={};save();renderJudge()});
    $('[data-action="prev-rider"]')?.addEventListener('click',()=>{state.judgeState.riderIndex=Math.max(0,idx-1);state.judgeState.values={};save();renderJudge()});
    $('[data-action="next-rider"]')?.addEventListener('click',()=>{state.judgeState.riderIndex=Math.min(list.length-1,idx+1);state.judgeState.values={};save();renderJudge()});
    $('[data-action="submit-score"]')?.addEventListener('click',()=>{const t=scoreTotal(state.judgeState.values);if(t<=0){toast('Nejdřív zadej body.');return}state.scores.push({id:uid('s'),riderId:r.id,categoryId:r.categoryId,run:state.judgeState.run,judge:state.currentUser?.name||'Judge',values:{...state.judgeState.values},total:t,submitted:true});state.judgeState.values={};state.judgeState.riderIndex=Math.min(list.length-1,idx+1);save();toast('Score '+t.toFixed(1)+' uložen.');renderJudge()});
  }

  function logout(){state.currentUser=null;save();if(sb)sb.auth.signOut();location.hash='login'}

  function modal(title,body){const t=$('#modalTemplate').content.cloneNode(true);t.querySelector('#modalTitle').textContent=title;t.querySelector('#modalBody').innerHTML=body;document.body.appendChild(t);$$('[data-modal-close]').forEach(x=>x.onclick=closeModal)}
  function closeModal(){document.querySelector('.modal-backdrop')?.remove()}

  function openAddRider(){modal('Přidat jezdce',`<form id="addRiderForm" class="form-grid"><div class="field full"><label>Jméno</label><input class="input" name="name" required></div><div class="field"><label>Kategorie</label><select class="select" name="categoryId">${state.categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select></div><div class="field"><label>Startovní číslo</label><input class="input" type="number" name="bib" value="${Math.max(0,...state.riders.map(r=>+r.bib||0))+1}"></div><div class="field"><label>Město</label><input class="input" name="city"></div><div class="field"><label>Instagram</label><input class="input" name="instagram"></div><div class="field full"><button class="btn btn-primary">Uložit</button></div></form>`);$('#addRiderForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.currentTarget));state.riders.push({id:uid('r'),name:o.name,categoryId:o.categoryId,bib:+o.bib,city:o.city||'',instagram:o.instagram||'',sponsors:'',birth:'',bio:'',status:'registered'});save();closeModal();adminRiders()}}
  function openCategory(id){const c=state.categories.find(x=>x.id===id)||{name:'',runs:2,advance:8};modal(id?'Upravit kategorii':'Nová kategorie',`<form id="catForm" class="form-grid"><div class="field full"><label>Název</label><input class="input" name="name" value="${escapeHtml(c.name)}" required></div><div class="field"><label>Počet runů</label><input class="input" type="number" min="1" max="5" name="runs" value="${c.runs}"></div><div class="field"><label>Postupuje TOP</label><input class="input" type="number" min="1" name="advance" value="${c.advance}"></div><div class="field full"><button class="btn btn-primary">Uložit</button></div></form>`);$('#catForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.currentTarget));if(id){Object.assign(c,{name:o.name,runs:+o.runs,advance:+o.advance})}else state.categories.push({id:uid('c'),name:o.name,runs:+o.runs,advance:+o.advance,order:state.categories.length+1});save();closeModal();adminCategories()}}
  function openJudge(){modal('Přidat uživatele',`<form id="judgeForm" class="form-grid"><div class="field full"><label>Jméno</label><input class="input" name="name" required></div><div class="field full"><label>E-mail Google účtu</label><input class="input" type="email" name="email" required></div><div class="field full"><label>Role</label><select class="select" name="role"><option value="judge">Judge</option><option value="head_judge">Head Judge</option><option value="registration">Prezence</option><option value="speaker">Speaker</option><option value="admin">Admin</option></select></div><div class="field full"><button class="btn btn-primary">Uložit</button></div></form>`);$('#judgeForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.currentTarget));state.judges.push({id:uid('u'),...o});save();closeModal();adminJudges()}}
  function openCriterion(index){const c=index!==undefined?state.scoring[index]:{label:'',key:'criterion_'+Date.now(),max:20,weight:1,desc:''};modal(index!==undefined?'Upravit kritérium':'Nové kritérium',`<form id="criterionForm" class="form-grid"><div class="field full"><label>Název</label><input class="input" name="label" value="${escapeHtml(c.label)}" required></div><div class="field"><label>Maximum</label><input class="input" type="number" step="0.1" name="max" value="${c.max}"></div><div class="field"><label>Váha</label><input class="input" type="number" step="0.1" name="weight" value="${c.weight}"></div><div class="field full"><label>Popis</label><input class="input" name="desc" value="${escapeHtml(c.desc||'')}"></div><div class="field full"><button class="btn btn-primary">Uložit</button></div></form>`);$('#criterionForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.currentTarget));Object.assign(c,{label:o.label,max:+o.max,weight:+o.weight,desc:o.desc});if(index===undefined)state.scoring.push(c);save();closeModal();adminSettings()}}

  function openCsvImport(){modal('Import přihlášek z Google Sheets',`<div class="dropzone"><b>Exportuj odpovědi Google Form jako CSV</b><p>Soubor sem nahraj. Rozpoznáme sloupce: Jméno závodníka, Kategorie, Město, Datum narození, Sponzoři, Instagram, Informace o jezdci.</p><input id="csvFile" type="file" accept=".csv,text/csv"></div><div id="csvStatus" class="help mt"></div>`);$('#csvFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;const text=await file.text();try{const rows=parseCSV(text);const n=importRows(rows);$('#csvStatus').innerHTML=`<span class="accent">Hotovo: importováno ${n} jezdců.</span>`;save();setTimeout(()=>{closeModal();adminRiders()},700)}catch(err){$('#csvStatus').textContent='Chyba: '+err.message}}}
  function parseCSV(text){const first=(text.split(/\r?\n/)[0]||'');const delim=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';const out=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(q&&text[i+1]==='"'){cell+='"';i++}else q=!q}else if(ch===delim&&!q){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))out.push(row);row=[];cell=''}else cell+=ch}if(cell||row.length){row.push(cell);out.push(row)}return out}
  function importRows(rows){if(rows.length<2)return 0;const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();const headers=rows[0].map(norm);const idx=(...names)=>headers.findIndex(h=>names.some(n=>h.includes(norm(n))));const iName=idx('jméno závodníka','jmeno zavodnika','jméno','name'),iCat=idx('kategorie','category'),iCity=idx('město','mesto','city'),iBirth=idx('datum narození','datum narozeni','birth'),iSponsors=idx('sponzoři','sponzori','sponsors'),iIg=idx('instagram'),iBio=idx('informace o jezdci','bio');let count=0;for(const row of rows.slice(1)){const name=row[iName]?.trim();if(!name)continue;const catRaw=row[iCat]?.trim();let c=state.categories.find(x=>norm(x.name)===norm(catRaw||''));if(!c){c={id:uid('c'),name:catRaw||'OPEN',runs:2,advance:8,order:state.categories.length+1};state.categories.push(c)}state.riders.push({id:uid('r'),bib:Math.max(0,...state.riders.map(r=>+r.bib||0))+1,name,categoryId:c.id,city:iCity>=0?row[iCity]||'':'',birth:iBirth>=0?row[iBirth]||'':'',sponsors:iSponsors>=0?row[iSponsors]||'':'',instagram:iIg>=0?row[iIg]||'':'',bio:iBio>=0?row[iBio]||'':'',status:'registered'});count++}return count}

  function exportResults(catId){const rows=leaderboard(catId);const csv=['Poradi;Startovni cislo;Jezdec;Kategorie;Run 1;Run 2;Best',...rows.map((r,i)=>[i+1,r.bib,r.name,catName(r.categoryId),r.run1??'',r.run2??'',r.best??''].join(';'))].join('\n');download('vysledky-'+catName(catId)+'.csv',csv)}
  function download(name,text){const blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}

  async function handleAuth(){
    if(!sb)return false; const {data:{session}}=await sb.auth.getSession(); if(!session)return false;
    const email=session.user.email;let role='viewer',name=session.user.user_metadata?.full_name||email;
    const {data}=await sb.from('profiles').select('role,full_name').eq('id',session.user.id).maybeSingle();if(data){role=data.role||role;name=data.full_name||name}
    state.currentUser={name,email,role};save();if(route()==='auth')location.hash=(role==='judge'||role==='head_judge')?'judge':'admin';return true;
  }

  async function render(){setActiveNav();await handleAuth();const r=route();if(r==='live')renderLive();else if(r==='startlist')renderStartlist();else if(r==='registration')renderRegistration();else if(r==='login'||r==='auth')renderLogin();else if(r==='admin')renderAdmin();else if(r==='judge')renderJudge();else renderLive();window.scrollTo({top:0,behavior:'instant'})}
  render();
})();
