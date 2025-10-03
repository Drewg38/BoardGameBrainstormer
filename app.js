<!-- Buttons -->
<div class="toolbar">
  <button id="btnSlow"   class="btn">Slow Spin</button>
  <button id="btnSpin"   class="btn">Spin</button>
  <button id="btnFast"   class="btn">Fast Spin</button>
  <button id="btnManual" class="btn">Manual Set</button>
  <button id="btnLock"   class="btn primary">Stop & Lock</button>
</div>

<div id="dataStatus" class="status"></div>

<!-- Reels (each has a `.list` inside) -->
<div id="reelTheme" class="slot"><div class="list"></div></div>
<div id="reelMech1" class="slot"><div class="list"></div></div>
<div id="reelMech2" class="slot"><div class="list"></div></div>

<!-- Concept -->
<div id="concept"></div>

<!-- Directory filters (buttons with these classes/text) -->
<div class="filters">
  <button class="theme-filter">A–E</button>
  <button class="theme-filter">F–J</button>
  <button class="theme-filter">K–O</button>
  <button class="theme-filter">P–T</button>
  <button class="theme-filter">U–Z</button>
  <button class="theme-filter">ALL</button>
</div>
<div id="themeDir" class="dirgrid"></div>
<div class="pager">
  <button id="themePrev" class="btn">◀ Prev</button>
  <span id="themePageLabel"></span>
  <button id="themeNext" class="btn">Next ▶</button>
</div>

<!-- Mechanics directory uses .mech-filter -->
<div class="filters">
  <button class="mech-filter">A–E</button>
  <button class="mech-filter">F–J</button>
  <button class="mech-filter">K–O</button>
  <button class="mech-filter">P–T</button>
  <button class="mech-filter">U–Z</button>
  <button class="mech-filter">ALL</button>
</div>
<div id="mechDir" class="dirgrid"></div>
<div class="pager">
  <button id="mechPrev" class="btn">◀ Prev</button>
  <span id="mechPageLabel"></span>
  <button id="mechNext" class="btn">Next ▶</button>
</div>
