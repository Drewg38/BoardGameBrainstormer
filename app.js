
// Cool Board Game Brainstormer — External Logic (app.js)
(function(){
  const RAW_BASE = 'https://raw.githubusercontent.com/Drewg38/BoardGameBrainstormer/3e3f84dc187ee19bf63a71a000bc3a82c7b6420e';
  const MECH_URL  = RAW_BASE + '/mechanics_full.json';
  const THEME_URL = RAW_BASE + '/themes_full.json';

  // ---------- tiny utils ----------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const by = (k) => (a,b)=> (a[k]||'').localeCompare(b[k]||'');
  const clamp = (n,min,max)=> Math.max(min, Math.min(max,n));

  function toArrayDesc(m){
    if (typeof m === 'string') return '';
    if (Array.isArray(m?.desc)) return m.desc.join(' ');
    if (typeof m?.desc === 'string') return m.desc;
    if (typeof m?.description === 'string') return m.description;
    return '';
  }
  function toName(x){
    if (typeof x === 'string') return x;
    if (x && typeof x.name === 'string') return x.name;
    return String(x);
  }
  function normalizeList(raw, keyGuess){
    // accepts: {items:[...]}, {mechanics:[...]}, {themes:[...]}, [...]
    let list = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw && Array.isArray(raw.items)) list = raw.items;
    else if (keyGuess && raw && Array.isArray(raw[keyGuess])) list = raw[keyGuess];
    else if (raw && raw.data && Array.isArray(raw.data[keyGuess])) list = raw.data[keyGuess];
    else list = [];
    // map to {name, desc, url?}
    return list.map(x => ({
      name: toName(x),
      desc: toArrayDesc(x),
      url: (x && typeof x.url === 'string') ? x.url : ''
    }));
  }

  function bucketByLetters(entries){
    const buckets = { 'A–E':[], 'F–J':[], 'K–O':[], 'P–T':[], 'U–Z':[], 'ALL': [] };
    entries.forEach(e=>{
      const n = (e.name||'').trim();
      const c = n.charAt(0).toUpperCase();
      const b = (c>='A'&&c<='E')?'A–E':
                (c>='F'&&c<='J')?'F–J':
                (c>='K'&&c<='O')?'K–O':
                (c>='P'&&c<='T')?'P–T':
                (c>='U'&&c<='Z')?'U–Z':'ALL';
      buckets[b].push(e);
      buckets['ALL'].push(e);
    });
    Object.keys(buckets).forEach(k => buckets[k].sort(by('name')));
    return buckets;
  }

  // ---------- reels model ----------
  function windowed(list, center, size=3){
    const out = [];
    const half = Math.floor(size/2);
    for(let i=center-half;i<=center+half;i++){
      const idx = ((i % list.length) + list.length) % list.length;
      out.push(list[idx]);
    }
    return out;
  }

  function makeReel(el, items){
    const listEl = $('.list', el);
    const viewport = $('.viewport', el) || el;
    let idx = Math.floor(Math.random()*items.length);
    let spinning = false;
    let raf = 0;
    let vel = 0;
    let locked = false;

    function render(){
      if (!listEl) return;
      listEl.innerHTML = '';
      const rows = windowed(items, idx, 3);
      rows.forEach((e,i)=>{
        const div = document.createElement('div');
        div.className = 'rowitem' + (i===1 ? ' center' : '');
        div.textContent = e.name || String(e);
        listEl.appendChild(div);
      });
    }
    render();

    function step(dir=1){
      idx = ((idx + dir) % items.length + items.length) % items.length;
      render();
    }

    function spin(speed){
      if (locked) return;
      if (spinning) cancelAnimationFrame(raf);
      spinning = true;
      let acc = 0;
      let last = performance.now();
      const cadence = (100 / speed); // smaller = faster
      const tick = (t)=>{
        if (!spinning) return;
        const dt = t - last;
        last = t;
        acc += dt;
        while (acc >= cadence){
          step(1);
          acc -= cadence;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    function stop(){
      spinning = false;
      cancelAnimationFrame(raf);
    }
    function lock(v=true){
      locked = v;
      el.classList.toggle('locked', locked);
    }
    function isLocked(){ return locked; }

    // manual scroll :: consume wheel within reel
    function onWheel(e){
      if (!el.matches(':hover')) return;
      e.preventDefault();
      e.stopPropagation();
      if (spinning) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      step(dir);
    }
    viewport.addEventListener('wheel', onWheel, { passive:false });

    return {
      get index(){ return idx; },
      set index(v){ idx = ((v % items.length) + items.length) % items.length; render(); },
      render, spin, stop, lock, isLocked,
      get value(){ return items[idx]; },
      setItems(newItems){
        items = newItems && newItems.length ? newItems : items;
        idx = Math.min(idx, items.length - 1);
        render();
      }
    };
  }

  // ---------- concept card ----------
  const WEIGHTS = [1,2,3,4,5];
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function randomMode(){ return Math.random()<0.5 ? 'Competitive' : 'Cooperative'; }
  function weightDots(w){ return '●'.repeat(w) + '○'.repeat(5-w); }

  function renderConcept(el, theme, m1, m2){
    if (!el) return;
    const players = randInt(1,6);
    const weight = WEIGHTS[randInt(0,WEIGHTS.length-1)];
    const mode = randomMode();
    const themeDesc = theme?.desc || '';
    const m1Desc = m1?.desc || '';
    const m2Desc = m2?.desc || '';
    el.innerHTML = `
      <article class="idea">
        <div class="badges">
          <span class="badge">${mode}</span>
          <span class="badge">Players ${players}</span>
          <span class="badge">Weight ${weight} &nbsp;<span style="letter-spacing:2px">${weightDots(weight)}</span></span>
        </div>
        <div class="sep"></div>
        <div style="margin-bottom:8px">
          <div style="font-weight:800;margin-bottom:6px;">Theme</div>
          <div style="margin-left:2px">${theme?.name || ''}</div>
          ${themeDesc ? `<p style="opacity:.9;margin-top:6px">${themeDesc}</p>` : ''}
        </div>
        <div style="margin:10px 0 8px 0">
          <div style="font-weight:800;margin-bottom:6px;">Mechanic 1</div>
          <div style="margin-left:2px">${m1?.name || ''}</div>
          ${m1Desc ? `<p style="opacity:.9;margin-top:6px">${m1Desc}</p>` : ''}
        </div>
        <div style="margin-top:10px">
          <div style="font-weight:800;margin-bottom:6px;">Mechanic 2</div>
          <div style="margin-left:2px">${m2?.name || ''}</div>
          ${m2Desc ? `<p style="opacity:.9;margin-top:6px">${m2Desc}</p>` : ''}
        </div>
        <div class="sep"></div>
        <p><strong>Design prompt:</strong> Combine <em>${theme?.name}</em> with <em>${m1?.name}</em> and <em>${m2?.name}</em>. Outline the core loop, how players interact, and what creates tension or cooperation.</p>
      </article>
    `;
  }

  // ---------- directories ----------
  function renderDir(el, entries, page, size){
    if (!el) return;
    const start = page*size;
    const slice = entries.slice(start, start+size);
    el.innerHTML = '';
    slice.forEach(e=>{
      const card = document.createElement('div');
      card.className = 'dircard';
      const safeDesc = e.desc ? `<p>${e.desc}</p>` : '';
      card.innerHTML = `<h3>${e.name}</h3>${safeDesc}`;
      el.appendChild(card);
    });
  }

  // ---------- main init ----------
  async function loadJSON(url){
    const res = await fetch(url, { mode:'cors', redirect:'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    const ct = res.headers.get('content-type') || '';
    const txt = await res.text();
    if (txt.trim().startsWith('<') || ct.includes('text/html')){
      throw new Error('Got HTML instead of JSON at ' + url);
    }
    try { return JSON.parse(txt); } catch(e){ throw new Error('Invalid JSON at ' + url); }
  }

  async function bootstrap(opts){
    const status = $(opts.els.dataStatus);
    const setStatus = (msg)=>{ if(status) status.textContent = msg || ''; };

    setStatus('Fetching data…');
    let themesRaw, mechsRaw;
    try {
      [themesRaw, mechsRaw] = await Promise.all([
        loadJSON(THEME_URL),
        loadJSON(MECH_URL)
      ]);
    } catch (e){
      console.error(e);
      setStatus('⚠️ Data fetch failed. Check JSON URLs or CORS.');
      return;
    }

    const THEMES = normalizeList(themesRaw, 'themes');
    const MECHS  = normalizeList(mechsRaw, 'mechanics');
    setStatus(`Loaded ${THEMES.length} themes and ${MECHS.length} mechanics.`);

    // build reels
    const themeReel = makeReel($(opts.els.reels.theme), THEMES);
    const m1Reel    = makeReel($(opts.els.reels.mech1), MECHS);
    const m2Reel    = makeReel($(opts.els.reels.mech2), MECHS);

    // spin speeds
    const speeds = { slow: 0.9, spin: 1.4, fast: 2.2 };
    let active = null;

    function stopAll(){ themeReel.stop(); m1Reel.stop(); m2Reel.stop(); active = null; }
    function unlockAll(){ themeReel.lock(false); m1Reel.lock(false); m2Reel.lock(false); }
    function lockAll(){ themeReel.lock(true); m1Reel.lock(true); m2Reel.lock(true); }

    const conceptEl = $(opts.els.concept);

    const btnSlow = $(opts.els.buttons.slow);
    const btnSpin = $(opts.els.buttons.spin);
    const btnFast = $(opts.els.buttons.fast);
    const btnManual = $(opts.els.buttons.manual);
    const btnLock = $(opts.els.buttons.lock);

    if (btnSlow) btnSlow.onclick = ()=>{ unlockAll(); stopAll(); themeReel.spin(speeds.slow); m1Reel.spin(speeds.slow); m2Reel.spin(speeds.slow); active='slow'; };
    if (btnSpin) btnSpin.onclick = ()=>{ unlockAll(); stopAll(); themeReel.spin(speeds.spin); m1Reel.spin(speeds.spin); m2Reel.spin(speeds.spin); active='spin'; };
    if (btnFast) btnFast.onclick = ()=>{ unlockAll(); stopAll(); themeReel.spin(speeds.fast); m1Reel.spin(speeds.fast); m2Reel.spin(speeds.fast); active='fast'; };
    if (btnManual) btnManual.onclick = ()=>{ stopAll(); unlockAll(); setStatus('Manual: hover a reel and scroll to change'); };
    if (btnLock) btnLock.onclick = ()=>{
      stopAll(); lockAll();
      setStatus('Locked.');
      renderConcept(conceptEl, themeReel.value, m1Reel.value, m2Reel.value);
    };

    // directories
    const themeBuckets = bucketByLetters(THEMES);
    const mechBuckets  = bucketByLetters(MECHS);
    const themePage = { bucket: 'A–E', page: 0, size: 6 };
    const mechPage  = { bucket: 'A–E', page: 0, size: 10 };
    const themeDir  = $(opts.els.themeDir);
    const mechDir   = $(opts.els.mechDir);
    const themePageLabel = $(opts.els.themePageLabel);
    const mechPageLabel  = $(opts.els.mechPageLabel);

    function updateThemeDir(){
      const data = themeBuckets[themePage.bucket] || [];
      const totalPages = Math.max(1, Math.ceil(data.length / themePage.size));
      themePage.page = clamp(themePage.page, 0, totalPages-1);
      renderDir(themeDir, data, themePage.page, themePage.size);
      if (themePageLabel) themePageLabel.textContent = `${themePage.bucket} — Page ${themePage.page+1} / ${totalPages}`;
    }
    function updateMechDir(){
      const data = mechBuckets[mechPage.bucket] || [];
      const totalPages = Math.max(1, Math.ceil(data.length / mechPage.size));
      mechPage.page = clamp(mechPage.page, 0, totalPages-1);
      renderDir(mechDir, data, mechPage.page, mechPage.size);
      if (mechPageLabel) mechPageLabel.textContent = `${mechPage.bucket} — Page ${mechPage.page+1} / ${totalPages}`;
    }

    // filter buttons (independent sets)
    $$('.theme-filter').forEach(btn=>{
      btn.onclick = ()=>{ themePage.bucket = btn.textContent.trim(); themePage.page = 0; updateThemeDir(); };
    });
    $$('.mech-filter').forEach(btn=>{
      btn.onclick = ()=>{ mechPage.bucket = btn.textContent.trim(); mechPage.page = 0; updateMechDir(); };
    });

    // pagers
    const tPrev = $(opts.els.themePagerPrev);
    const tNext = $(opts.els.themePagerNext);
    const mPrev = $(opts.els.mechPagerPrev);
    const mNext = $(opts.els.mechPagerNext);
    if (tPrev) tPrev.onclick = ()=>{ themePage.page--; updateThemeDir(); };
    if (tNext) tNext.onclick = ()=>{ themePage.page++; updateThemeDir(); };
    if (mPrev) mPrev.onclick = ()=>{ mechPage.page--; updateMechDir(); };
    if (mNext) mNext.onclick = ()=>{ mechPage.page++; updateMechDir(); };

    updateThemeDir();
    updateMechDir();
    setStatus('');
  }

  // expose init globally
  window.Brainstormer = window.Brainstormer || {};
  window.Brainstormer.init = function init(opts){
    try {
      bootstrap(opts);
    } catch (e){
      console.error('bootstrap error', e);
      const status = document.querySelector(opts?.els?.dataStatus || '#dataStatus');
      if (status) status.textContent = '⚠️ Init error (see console).';
    }
  };
})();
