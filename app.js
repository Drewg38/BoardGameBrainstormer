
// Cool Board Game Brainstormer — External Logic (app.js) v3 (self-deriving RAW paths)
(function(){
  // Try to derive RAW_BASE from the script URL so JSON loads from the same commit/origin.
  var scriptUrl = (document.currentScript && document.currentScript.src) || '';
  var derivedBase = '';
  try {
    // Expect .../<commit>/app.js  -> we want .../<commit>
    var m = scriptUrl.match(/^(https?:\/\/[^?#]+)\/app\.js(?:[?#].*)?$/i);
    if (m) {
      derivedBase = m[1]; // includes commit
    }
  } catch(e){/* noop */}

  // Fallbacks if currentScript is unavailable or not a RAW URL.
  var FALLBACK_BASES = [
    // Replace this first one with your latest commit if needed:
    'https://raw.githubusercontent.com/Drewg38/BoardGameBrainstormer/5e202edfc340de95b5afc47f95ca20cd9b652083',
    'https://raw.githubusercontent.com/Drewg38/BoardGameBrainstormer/main'
  ];

  var RAW_BASE = derivedBase || FALLBACK_BASES[0];

  var MECH_URL  = RAW_BASE + '/mechanics_full.json';
  var THEME_URL = RAW_BASE + '/themes_full.json';

  var $ = function(sel, root){ return (root||document).querySelector(sel); };
  var $$ = function(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); };
  var by = function(k){ return function(a,b){ return (a[k]||'').localeCompare(b[k]||''); }; };
  var clamp = function(n,min,max){ return Math.max(min, Math.min(max,n)); };

  function toArrayDesc(m){
    if (typeof m === 'string') return '';
    if (m && Array.isArray(m.desc)) return m.desc.join(' ');
    if (m && typeof m.desc === 'string') return m.desc;
    if (m && typeof m.description === 'string') return m.description;
    return '';
  }
  function toName(x){
    if (typeof x === 'string') return x;
    if (x && typeof x.name === 'string') return x.name;
    return String(x);
  }
  function normalizeList(raw, keyGuess){
    var list = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw && Array.isArray(raw.items)) list = raw.items;
    else if (keyGuess && raw && Array.isArray(raw[keyGuess])) list = raw[keyGuess];
    else if (raw && raw.data && Array.isArray(raw.data[keyGuess])) list = raw.data[keyGuess];
    else list = [];
    return list.map(function(x){
      return {
        name: toName(x),
        desc: toArrayDesc(x),
        url: (x && typeof x.url === 'string') ? x.url : ''
      };
    });
  }

  function bucketByLetters(entries){
    var buckets = { 'A–E':[], 'F–J':[], 'K–O':[], 'P–T':[], 'U–Z':[], 'ALL': [] };
    entries.forEach(function(e){
      var n = (e.name||'').trim();
      var c = n.charAt(0).toUpperCase();
      var b = (c>='A'&&c<='E')?'A–E':
              (c>='F'&&c<='J')?'F–J':
              (c>='K'&&c<='O')?'K–O':
              (c>='P'&&c<='T')?'P–T':
              (c>='U'&&c<='Z')?'U–Z':'ALL';
      buckets[b].push(e);
      buckets['ALL'].push(e);
    });
    Object.keys(buckets).forEach(function(k){ buckets[k].sort(by('name')); });
    return buckets;
  }

  function windowed(list, center, size){
    size = size || 3;
    var out = [];
    var half = Math.floor(size/2);
    for(var i=center-half;i<=center+half;i++){
      var idx = ((i % list.length) + list.length) % list.length;
      out.push(list[idx]);
    }
    return out;
  }

  function makeReel(el, items){
    var listEl = $('.list', el);
    var viewport = $('.viewport', el) || el;
    var idx = Math.floor(Math.random()*items.length);
    var spinning = false;
    var raf = 0;
    var locked = false;

    function render(){
      if (!listEl) return;
      listEl.innerHTML = '';
      var rows = windowed(items, idx, 3);
      rows.forEach(function(e,i){
        var div = document.createElement('div');
        div.className = 'rowitem' + (i===1 ? ' center' : '');
        div.textContent = e.name || String(e);
        listEl.appendChild(div);
      });
    }
    render();

    function step(dir){
      dir = (dir==null?1:dir);
      idx = ((idx + dir) % items.length + items.length) % items.length;
      render();
    }

    function spin(speed){
      if (locked) return;
      if (spinning) cancelAnimationFrame(raf);
      spinning = true;
      var acc = 0;
      var last = performance.now();
      var cadence = (100 / speed);
      var tick = function(t){
        if (!spinning) return;
        var dt = t - last;
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
    function lock(v){
      if (v==null) v = true;
      locked = v;
      el.classList.toggle('locked', locked);
    }

    // Slower manual wheel (precise)
    var wheelAccum = 0;
    var STEP_THRESHOLD = 120; // tweak for manual scroll speed
    function onWheel(e){
      if (!el.matches(':hover')) return;
      e.preventDefault();
      e.stopPropagation();
      if (spinning) return;
      wheelAccum += e.deltaY;
      while (wheelAccum >= STEP_THRESHOLD){ step(1); wheelAccum -= STEP_THRESHOLD; }
      while (wheelAccum <= -STEP_THRESHOLD){ step(-1); wheelAccum += STEP_THRESHOLD; }
    }
    viewport.addEventListener('wheel', onWheel, { passive:false });

    return {
      get index(){ return idx; },
      set index(v){ idx = ((v % items.length) + items.length) % items.length; render(); },
      render: render, spin: spin, stop: stop, lock: lock,
      get value(){ return items[idx]; },
      setItems: function(newItems){
        items = newItems && newItems.length ? newItems : items;
        idx = Math.min(idx, items.length - 1);
        render();
      }
    };
  }

  var WEIGHTS = [1,2,3,4,5];
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function randomMode(){ return Math.random()<0.5 ? 'Competitive' : 'Cooperative'; }
  function weightDots(w){ return '●'.repeat(w) + '○'.repeat(5-w); }

  function renderConcept(el, theme, m1, m2){
    if (!el) return;
    var players = randInt(1,6);
    var weight = WEIGHTS[randInt(0,WEIGHTS.length-1)];
    var mode = randomMode();
    var themeDesc = (theme && theme.desc) || '';
    var m1Desc = (m1 && m1.desc) || '';
    var m2Desc = (m2 && m2.desc) || '';
    el.innerHTML = '\
      <article class="idea">\
        <div class="badges">\
          <span class="badge">'+mode+'</span>\
          <span class="badge">Players '+players+'</span>\
          <span class="badge">Weight '+weight+' <span style="letter-spacing:2px;margin-left:6px">'+weightDots(weight)+'</span></span>\
        </div>\
        <div class="sep"></div>\
        <div style="margin-bottom:8px">\
          <div style="font-weight:800;margin-bottom:6px;">Theme</div>\
          <div style="margin-left:2px">'+(theme? (theme.name||'') : '')+'</div>\
          '+(themeDesc ? '<p style="opacity:.9;margin-top:6px">'+themeDesc+'</p>' : '')+'\
        </div>\
        <div style="margin:10px 0 8px 0">\
          <div style="font-weight:800;margin-bottom:6px;">Mechanic 1</div>\
          <div style="margin-left:2px">'+(m1? (m1.name||'') : '')+'</div>\
          '+(m1Desc ? '<p style="opacity:.9;margin-top:6px">'+m1Desc+'</p>' : '')+'\
        </div>\
        <div style="margin-top:10px">\
          <div style="font-weight:800;margin-bottom:6px;">Mechanic 2</div>\
          <div style="margin-left:2px">'+(m2? (m2.name||'') : '')+'</div>\
          '+(m2Desc ? '<p style="opacity:.9;margin-top:6px">'+m2Desc+'</p>' : '')+'\
        </div>\
        <div class="sep"></div>\
        <p><strong>Design prompt:</strong> Combine <em>'+(theme? (theme.name||''):'')+'</em> with <em>'+(m1? (m1.name||''):'')+'</em> and <em>'+(m2? (m2.name||''):'')+'</em>. Outline the core loop, how players interact, and what creates tension or cooperation.</p>\
      </article>\
    ';
  }

  function renderDir(el, entries, page, size){
    if (!el) return;
    var start = page*size;
    var slice = entries.slice(start, start+size);
    el.innerHTML = '';
    slice.forEach(function(e){
      var card = document.createElement('div');
      card.className = 'dircard';
      var safeDesc = e.desc ? '<p>'+e.desc+'</p>' : '';
      card.innerHTML = '<h3>'+e.name+'</h3>'+safeDesc;
      el.appendChild(card);
    });
  }

  function loadJSON(urlList){
    // Accept a single URL or an array of fallback URLs
    var list = Array.isArray(urlList) ? urlList : [urlList];
    return new Promise(function(resolve, reject){
      (function next(i){
        if (i >= list.length) return reject(new Error('All JSON sources failed'));
        var url = list[i];
        fetch(url, { mode:'cors', redirect:'follow' }).then(function(res){
          if (!res.ok) throw new Error('HTTP '+res.status);
          return res.text().then(function(txt){
            if (txt.trim().startsWith('<')) throw new Error('HTML not JSON at '+url);
            try {
              resolve(JSON.parse(txt));
            } catch (e){
              throw new Error('Invalid JSON at '+url);
            }
          });
        }).catch(function(){ next(i+1); });
      })(0);
    });
  }

  function bootstrap(opts){
    var status = $(opts.els.dataStatus);
    var setStatus = function(msg){ if(status) status.textContent = msg || ''; };

    setStatus('Fetching data…');
    var themeUrls = [THEME_URL].concat(FALLBACK_BASES.map(function(b){return b+'/themes_full.json';}));
    var mechUrls  = [MECH_URL].concat(FALLBACK_BASES.map(function(b){return b+'/mechanics_full.json';}));

    Promise.all([ loadJSON(themeUrls), loadJSON(mechUrls) ]).then(function(results){
      var THEMES = normalizeList(results[0], 'themes');
      var MECHS  = normalizeList(results[1], 'mechanics');
      setStatus('Loaded '+THEMES.length+' themes and '+MECHS.length+' mechanics.');

      var themeReel = makeReel($(opts.els.reels.theme), THEMES);
      var m1Reel    = makeReel($(opts.els.reels.mech1), MECHS);
      var m2Reel    = makeReel($(opts.els.reels.mech2), MECHS);

      var speeds = { slow: 0.9, spin: 1.4, fast: 2.2 };

      function stopAll(){ themeReel.stop(); m1Reel.stop(); m2Reel.stop(); }
      function unlockAll(){ themeReel.lock(false); m1Reel.lock(false); m2Reel.lock(false); }
      function lockAll(){ themeReel.lock(true); m1Reel.lock(true); m2Reel.lock(true); }

      var conceptEl = $(opts.els.concept);

      var btnSlow = $(opts.els.buttons.slow);
      var btnSpin = $(opts.els.buttons.spin);
      var btnFast = $(opts.els.buttons.fast);
      var btnManual = $(opts.els.buttons.manual);
      var btnLock = $(opts.els.buttons.lock);

      if (btnSlow) btnSlow.onclick = function(){ unlockAll(); stopAll(); themeReel.spin(speeds.slow); m1Reel.spin(speeds.slow); m2Reel.spin(speeds.slow); };
      if (btnSpin) btnSpin.onclick = function(){ unlockAll(); stopAll(); themeReel.spin(speeds.spin); m1Reel.spin(speeds.spin); m2Reel.spin(speeds.spin); };
      if (btnFast) btnFast.onclick = function(){ unlockAll(); stopAll(); themeReel.spin(speeds.fast); m1Reel.spin(speeds.fast); m2Reel.spin(speeds.fast); };
      if (btnManual) btnManual.onclick = function(){ stopAll(); unlockAll(); };
      if (btnLock) btnLock.onclick = function(){
        stopAll(); lockAll();
        setStatus('');
        renderConcept(conceptEl, themeReel.value, m1Reel.value, m2Reel.value);
      };

      var themeBuckets = bucketByLetters(THEMES);
      var mechBuckets  = bucketByLetters(MECHS);
      var themePage = { bucket: 'A–E', page: 0, size: 6 };
      var mechPage  = { bucket: 'A–E', page: 0, size: 10 };
      var themeDir  = $(opts.els.themeDir);
      var mechDir   = $(opts.els.mechDir);
      var themePageLabel = $(opts.els.themePageLabel);
      var mechPageLabel  = $(opts.els.mechPageLabel);

      function updateThemeDir(){
        var data = themeBuckets[themePage.bucket] || [];
        var totalPages = Math.max(1, Math.ceil(data.length / themePage.size));
        themePage.page = clamp(themePage.page, 0, totalPages-1);
        renderDir(themeDir, data, themePage.page, themePage.size);
        if (themePageLabel) themePageLabel.textContent = themePage.bucket+' — Page '+(themePage.page+1)+' / '+totalPages;
      }
      function updateMechDir(){
        var data = mechBuckets[mechPage.bucket] || [];
        var totalPages = Math.max(1, Math.ceil(data.length / mechPage.size));
        mechPage.page = clamp(mechPage.page, 0, totalPages-1);
        renderDir(mechDir, data, mechPage.page, mechPage.size);
        if (mechPageLabel) mechPageLabel.textContent = mechPage.bucket+' — Page '+(mechPage.page+1)+' / '+totalPages;
      }

      $$('.theme-filter').forEach(function(btn){
        btn.onclick = function(){ themePage.bucket = btn.textContent.trim(); themePage.page = 0; updateThemeDir(); };
      });
      $$('.mech-filter').forEach(function(btn){
        btn.onclick = function(){ mechPage.bucket = btn.textContent.trim(); mechPage.page = 0; updateMechDir(); };
      });

      var tPrev = $(opts.els.themePagerPrev);
      var tNext = $(opts.els.themePagerNext);
      var mPrev = $(opts.els.mechPagerPrev);
      var mNext = $(opts.els.mechPagerNext);
      if (tPrev) tPrev.onclick = function(){ themePage.page--; updateThemeDir(); };
      if (tNext) tNext.onclick = function(){ themePage.page++; updateThemeDir(); };
      if (mPrev) mPrev.onclick = function(){ mechPage.page--; updateMechDir(); };
      if (mNext) mNext.onclick = function(){ mechPage.page++; updateMechDir(); };

      updateThemeDir();
      updateMechDir();
      setStatus('');
    }).catch(function(e){
      console.error(e);
      setStatus('⚠️ Data fetch failed. Check JSON URLs or CORS.');
    });
  }

  window.Brainstormer = window.Brainstormer || {};
  window.Brainstormer.init = function init(opts){
    try { bootstrap(opts); }
    catch (e){
      console.error('bootstrap error', e);
      var status = document.querySelector((opts && opts.els && opts.els.dataStatus) || '#dataStatus');
      if (status) status.textContent = '⚠️ Init error (see console).';
    }
  };
})();
