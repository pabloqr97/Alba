// ============================================================
// CONFIGURACIÓN EDITABLE — cambia aquí el contenido sin tocar el resto
// ============================================================

// Recuerdos desbloqueables al interactuar con objetos/personas de la parcela.
// Los de "pozo", "limonero", "gallinero", "mecedora", "tendedero" y "parra"
// tienen texto PLACEHOLDER — edítalos con calma cuando tengas la anécdota real.
// col/row son coordenadas de casilla en el mapa (ver buildGrid más abajo).
const MEMORIES = [
  { id: 'pozo', col: 2, row: 5, emoji: '💧', label: 'El pozo',
    text: 'El pozo de la parcela.\n(Recuerdo por escribir: cuéntame algo real sobre él.)' },
  { id: 'mortero', col: 7, row: 3, emoji: '🥣', label: 'El mortero',
    text: 'Ese mortero de siempre.\nHay una foto suya de pequeña con él en las manos — icónica.' },
  { id: 'limonero', col: 9, row: 5, emoji: '🍋', label: 'El limonero',
    text: 'El limonero de la parcela.\n(Recuerdo por escribir.)' },
  { id: 'gallinero', col: 8, row: 10, emoji: '🐔', label: 'El gallinero',
    text: 'El gallinero de toda la vida.\n(Recuerdo por escribir.)' },
  { id: 'mecedora', col: 4, row: 4, emoji: '🪑', label: 'La mecedora del porche',
    text: 'La mecedora del porche, testigo de tardes enteras.\n(Recuerdo por escribir.)' },
  { id: 'tendedero', col: 2, row: 8, emoji: '🎽', label: 'El tendedero',
    text: 'El tendedero de siempre.\n(Recuerdo por escribir.)' },
  { id: 'parra', col: 3, row: 10, emoji: '🍇', label: 'La parra',
    text: 'La parra que da sombra en verano.\n(Recuerdo por escribir.)' },
  { id: 'abuelo-sando', col: 4, row: 11, emoji: '👴', label: 'El abuelo y Sando',
    text: 'En el huerto, donde siempre estaban su abuelo y Sando juntos.\nLos dos siguen aquí, en cada rincón de la parcela.' },
];

// 5 cofres normales. El SEGUNDO que se abra (sea cual sea, en el orden que
// Alba decida) da siempre las entradas de Karol G — así el regalo queda
// garantizado aunque no llegue a abrir los 5. Ver resolveChestPrize().
const CHESTS = [
  { id: 'chest1', col: 8, row: 4 },
  { id: 'chest2', col: 2, row: 9 },
  { id: 'chest3', col: 7, row: 7 },
  { id: 'chest4', col: 7, row: 11 },
  { id: 'chest5', col: 2, row: 3 },
];

// Cofre dorado final: se activa solo cuando ya se han abierto 2+ cofres
// normales (garantía de que Karol G ya está entre lo recogido). Al abrirlo
// se lanza la ruleta con TODO lo que Alba haya encontrado hasta ese momento.
const GOLDEN_CHEST = { id: 'golden', col: 3, row: 7 };

const DECOY_PRIZES = [
  '🧦 Calcetines a juego con tu casa',
  '🍓 Fresas infinitas para la granja',
  '🛋️ Vale para redecorar el salón (otra vez)',
  '🎬 Noche de cine en casa',
  '🐾 Un peluche que se parece a Sando',
  '🏝️ Un vecino nuevo para Candeleda',
];
const KAROL_G_PRIZE = '🎫 Entradas para ver a Karol G';

const MAP_COLS = 11;
const MAP_ROWS = 14;

// ============================================================
// NAVEGACIÓN ENTRE ESCENAS
// ============================================================

function showScene(id) {
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

document.querySelectorAll('[data-target]').forEach(el => {
  el.addEventListener('click', () => showScene(el.dataset.target));
});

document.getElementById('overworld-menu-btn').addEventListener('click', () => showScene('scene-menu'));

// ============================================================
// ESCENA BOOT — barra de carga falsa (con tiempo para disfrutarla)
// ============================================================

function runBoot() {
  const fill = document.getElementById('loadbar-fill');
  const flavor = document.getElementById('boot-flavor');
  const messages = [
    'Cargando cariño...',
    'Plantando fresas...',
    'Espantando vecinos de la isla...',
    'Puliendo los muebles de Candeleda...',
    'Regando el huerto...',
    'Afinando la voz de Karol G...',
    'Cociendo algo en el mortero...',
    'Repasando fotos antiguas...',
    'Casi está...',
  ];
  const totalSteps = 12;
  const stepMs = 480;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    const pct = Math.min(100, Math.round((step / totalSteps) * 100));
    fill.style.width = pct + '%';
    const msgIndex = Math.min(messages.length - 1, Math.floor((step / totalSteps) * messages.length));
    flavor.textContent = messages[msgIndex];
    if (step >= totalSteps) {
      clearInterval(interval);
      setTimeout(() => showScene('scene-menu'), 600);
    }
  }, stepMs);
}

// ============================================================
// LA PARCELA — mapa, personaje, colisiones e interacción
// ============================================================

function buildGrid() {
  const g = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill('.'));
  for (let c = 0; c < MAP_COLS; c++) { g[0][c] = '#'; g[MAP_ROWS - 1][c] = '#'; }
  for (let r = 0; r < MAP_ROWS; r++) { g[r][0] = '#'; g[r][MAP_COLS - 1] = '#'; }
  g[MAP_ROWS - 1][5] = 'P'; // puerta de entrada a la parcela

  for (let r = 1; r <= 3; r++) {
    for (let c = 3; c <= 7; c++) g[r][c] = 'H';
  }
  g[3][5] = 'P'; // puerta de la casa

  for (let r = 4; r <= 12; r++) g[r][5] = 'P'; // camino central

  const trees = [[2, 1], [2, 9], [6, 1], [9, 9], [12, 9], [12, 2]];
  trees.forEach(([r, c]) => { g[r][c] = 'T'; });

  return g;
}

const grid = buildGrid();
const OBSTACLE_TILES = new Set(['#', 'H', 'T']);

const player = { col: 5, row: 12, facing: 'down' };
let currentTarget = null; // objeto con el que se puede interactuar ahora mismo
let pendingOverlayAction = null;

let chestsOpenedCount = 0;
let collectedPrizes = []; // { text, isKarolG }
let decoyPool = shuffle([...DECOY_PRIZES]);
const unlockedMemories = new Set();

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function computeTileSize() {
  const viewportW = Math.min(window.innerWidth, 520);
  const viewportH = window.innerHeight;
  const size = Math.floor(Math.min(42, (viewportW - 24) / MAP_COLS, (viewportH * 0.55) / MAP_ROWS));
  document.documentElement.style.setProperty('--tile-size', Math.max(24, size) + 'px');
}

function buildMapDOM() {
  const mapGrid = document.getElementById('map-grid');
  mapGrid.style.setProperty('--map-cols', MAP_COLS);
  mapGrid.style.setProperty('--map-rows', MAP_ROWS);
  mapGrid.innerHTML = '';
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const tile = document.createElement('div');
      const type = grid[r][c];
      let cls = 'tile ';
      if (type === '#') cls += 'tile-fence';
      else if (type === 'H') cls += 'tile-house';
      else if (type === 'P') cls += 'tile-path';
      else if (type === 'T') cls += 'tile-tree';
      else cls += 'tile-grass';
      tile.className = cls;
      if (type === 'T') tile.textContent = '🌳';
      mapGrid.appendChild(tile);
    }
  }
}

function allObjects() {
  return [
    ...MEMORIES.map(m => ({ ...m, type: 'memory' })),
    ...CHESTS.map(c => ({ ...c, type: 'chest' })),
    { ...GOLDEN_CHEST, type: 'golden' },
  ];
}

function renderObjects() {
  const tileSize = getTileSizePx();
  const layer = document.getElementById('map-objects');
  layer.innerHTML = '';
  allObjects().forEach(obj => {
    const el = document.createElement('div');
    el.className = 'map-object';
    el.dataset.id = obj.id;
    el.style.left = obj.col * tileSize + 'px';
    el.style.top = obj.row * tileSize + 'px';

    if (obj.type === 'memory') {
      el.textContent = obj.emoji;
    } else if (obj.type === 'chest') {
      const chestState = CHESTS.find(c => c.id === obj.id);
      el.textContent = chestState.opened ? '🎁' : '📦';
      if (chestState.opened) el.classList.add('chest-opened');
    } else if (obj.type === 'golden') {
      el.textContent = '✨';
      el.classList.add(chestsOpenedCount >= 2 ? 'golden-ready' : 'golden-locked');
    }
    layer.appendChild(el);
  });
}

function getTileSizePx() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
}

function renderPlayerPosition() {
  const tileSize = getTileSizePx();
  const sprite = document.getElementById('player-sprite');
  sprite.style.left = player.col * tileSize + 'px';
  sprite.style.top = player.row * tileSize + 'px';
  sprite.classList.toggle('face-left', player.facing === 'left');
}

// Sprite en pixel-art dibujado con box-shadow (sin imágenes externas)
const PLAYER_MATRIX = [
  '011110',
  '122221',
  '122221',
  '033330',
  '333333',
  '333333',
  '032230',
  '044440',
];
const PLAYER_PALETTE = { '1': '#6b4a34', '2': '#f3c9a3', '3': '#e78fa6', '4': '#4a3b2a' };

function renderPlayerSprite() {
  const tileSize = getTileSizePx();
  const unit = tileSize * 0.135;
  const cols = PLAYER_MATRIX[0].length;
  const rows = PLAYER_MATRIX.length;
  const shadows = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = PLAYER_MATRIX[r][c];
      if (v === '0') continue;
      const x = (c - cols / 2) * unit;
      const y = (r - rows / 2) * unit;
      shadows.push(`${x}px ${y}px 0 0 ${PLAYER_PALETTE[v]}`);
    }
  }
  const pixel = document.querySelector('.player-pixel');
  pixel.style.width = unit + 'px';
  pixel.style.height = unit + 'px';
  pixel.style.boxShadow = shadows.join(', ');
}

function isBlocked(col, row) {
  if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return true;
  if (OBSTACLE_TILES.has(grid[row][col])) return true;
  return allObjects().some(o => o.col === col && o.row === row);
}

function tryMove(dx, dy) {
  const targetCol = player.col + dx;
  const targetRow = player.row + dy;
  if (dx < 0) player.facing = 'left';
  else if (dx > 0) player.facing = 'right';
  if (!isBlocked(targetCol, targetRow)) {
    player.col = targetCol;
    player.row = targetRow;
  }
  renderPlayerPosition();
  updateProximity();
}

function updateProximity() {
  document.querySelectorAll('.map-object').forEach(el => el.classList.remove('near'));
  const neighbors = [
    [player.col, player.row - 1], [player.col, player.row + 1],
    [player.col - 1, player.row], [player.col + 1, player.row],
  ];
  const objects = allObjects();
  let found = null;
  for (const [c, r] of neighbors) {
    const obj = objects.find(o => o.col === c && o.row === r);
    if (obj) { found = obj; break; }
  }
  currentTarget = found;
  const btn = document.getElementById('action-btn');
  const hint = document.getElementById('overworld-hint');
  if (!found) {
    btn.style.display = 'none';
    hint.textContent = 'Muévete por la parcela y explora todo lo que puedas.';
    return;
  }
  const el = document.querySelector(`.map-object[data-id="${found.id}"]`);
  if (el) el.classList.add('near');
  btn.style.display = 'inline-block';
  if (found.type === 'memory') {
    btn.textContent = 'Hablar';
    hint.textContent = '✨ Hay algo aquí. Toca "Hablar".';
  } else if (found.type === 'chest') {
    const chestState = CHESTS.find(c => c.id === found.id);
    btn.textContent = chestState.opened ? 'Ver de nuevo' : 'Abrir cofre';
    hint.textContent = '✨ Hay un cofre. Toca el botón para abrirlo.';
  } else if (found.type === 'golden') {
    btn.textContent = chestsOpenedCount >= 2 ? 'Abrir regalo final' : 'Tocar';
    hint.textContent = chestsOpenedCount >= 2
      ? '✨ ¡El cofre dorado está listo!'
      : 'Ese cofre dorado parece cerrado con algo más...';
  }
}

function openOverlay(emoji, text, closeLabel) {
  document.getElementById('interaction-avatar').textContent = emoji;
  document.getElementById('interaction-text').textContent = text;
  document.getElementById('interaction-close').textContent = closeLabel || 'Cerrar';
  document.getElementById('interaction-overlay').classList.add('active');
}

function closeOverlay() {
  document.getElementById('interaction-overlay').classList.remove('active');
}

document.getElementById('interaction-close').addEventListener('click', () => {
  closeOverlay();
  if (pendingOverlayAction) {
    const fn = pendingOverlayAction;
    pendingOverlayAction = null;
    fn();
  }
});

function resolveChestPrize() {
  chestsOpenedCount++;
  if (chestsOpenedCount === 2) return { text: KAROL_G_PRIZE, isKarolG: true };
  const decoy = decoyPool.pop() || '🎁 Un regalo sorpresa';
  return { text: decoy, isKarolG: false };
}

function handleInteract() {
  if (!currentTarget) return;
  const obj = currentTarget;

  if (obj.type === 'memory') {
    unlockedMemories.add(obj.id);
    document.getElementById('hud-memories').textContent = unlockedMemories.size;
    openOverlay(obj.emoji, `${obj.label}\n\n${obj.text}`, 'Cerrar');
    return;
  }

  if (obj.type === 'chest') {
    const chestState = CHESTS.find(c => c.id === obj.id);
    if (!chestState.opened) {
      const prize = resolveChestPrize();
      chestState.opened = true;
      chestState.prize = prize;
      collectedPrizes.push(prize);
      document.getElementById('hud-chests').textContent = CHESTS.filter(c => c.opened).length;
      renderObjects();
      updateProximity();
      openOverlay('🎁', `¡Cofre abierto!\n\nDentro hay: ${prize.text}`, 'Genial');
    } else {
      openOverlay('📦', `Este cofre ya lo abriste.\n\nDentro había: ${chestState.prize.text}`, 'Cerrar');
    }
    return;
  }

  if (obj.type === 'golden') {
    if (chestsOpenedCount < 2) {
      openOverlay('✨', 'Este cofre dorado parece cerrado con algo más...\nQuizá abrir un par de cofres normales ayude.', 'Vale');
      return;
    }
    pendingOverlayAction = () => {
      showScene('scene-wheel');
      prepareWheelFromCollectedPrizes();
    };
    openOverlay('✨', '¡Has encontrado el regalo especial!\nVamos a decidir con la ruleta cuál te llevas de verdad, entre todo lo que has ido encontrando...', 'Ir a la ruleta ▶');
  }
}

document.getElementById('action-btn').addEventListener('click', handleInteract);

document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const dir = btn.dataset.dir;
    if (dir === 'up') tryMove(0, -1);
    else if (dir === 'down') tryMove(0, 1);
    else if (dir === 'left') tryMove(-1, 0);
    else if (dir === 'right') tryMove(1, 0);
  });
});

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('scene-overworld').classList.contains('active')) return;
  if (['ArrowUp', 'w', 'W'].includes(e.key)) tryMove(0, -1);
  else if (['ArrowDown', 's', 'S'].includes(e.key)) tryMove(0, 1);
  else if (['ArrowLeft', 'a', 'A'].includes(e.key)) tryMove(-1, 0);
  else if (['ArrowRight', 'd', 'D'].includes(e.key)) tryMove(1, 0);
  else if (e.key === 'Enter' || e.key === ' ') handleInteract();
});

function initOverworld() {
  computeTileSize();
  buildMapDOM();
  renderObjects();
  renderPlayerSprite();
  renderPlayerPosition();
  updateProximity();
}

function resetOverworld() {
  player.col = 5; player.row = 12; player.facing = 'down';
  CHESTS.forEach(c => { c.opened = false; c.prize = null; });
  chestsOpenedCount = 0;
  collectedPrizes = [];
  decoyPool = shuffle([...DECOY_PRIZES]);
  unlockedMemories.clear();
  document.getElementById('hud-memories').textContent = '0';
  document.getElementById('hud-chests').textContent = '0';
  renderObjects();
  renderPlayerPosition();
  updateProximity();
}

window.addEventListener('resize', () => {
  computeTileSize();
  renderObjects();
  renderPlayerSprite();
  renderPlayerPosition();
});

// ============================================================
// ESCENA RULETA (contenido dinámico según lo recogido en la parcela)
// ============================================================

let WHEEL_PRIZES = [];
let WINNING_PRIZE_INDEX = 0;
let wheelSpun = false;

function prepareWheelFromCollectedPrizes() {
  WHEEL_PRIZES = collectedPrizes.map(p => p.text);
  WINNING_PRIZE_INDEX = collectedPrizes.findIndex(p => p.isKarolG);
  if (WINNING_PRIZE_INDEX === -1) WINNING_PRIZE_INDEX = 0; // salvaguarda, no debería pasar
  wheelSpun = false;
  document.getElementById('wheel-spin').disabled = false;
  buildWheel();
}

function buildWheel() {
  const wheel = document.getElementById('wheel');
  wheel.innerHTML = '';
  wheel.style.transform = 'rotate(0deg)';
  const n = WHEEL_PRIZES.length;
  const sliceAngle = 360 / n;
  const colors = ['#f4c26b', '#bfe8d9', '#f2a6b8', '#dcb96a', '#a9d8b4', '#e8c9e0', '#f6d98c'];

  let gradientParts = [];
  WHEEL_PRIZES.forEach((_, i) => {
    const start = i * sliceAngle;
    const end = start + sliceAngle;
    gradientParts.push(`${colors[i % colors.length]} ${start}deg ${end}deg`);
  });
  wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;

  const radius = wheel.getBoundingClientRect().width / 2;
  const labelRadius = radius * 0.62;

  WHEEL_PRIZES.forEach((prize, i) => {
    const label = document.createElement('div');
    label.className = 'wheel-slice-label';
    const angle = sliceAngle * i + sliceAngle / 2;
    const rad = (angle * Math.PI) / 180;
    const x = labelRadius * Math.sin(rad);
    const y = -labelRadius * Math.cos(rad);
    label.style.left = `calc(50% + ${x}px)`;
    label.style.top = `calc(50% + ${y}px)`;
    label.textContent = prize.split(' ')[0];
    wheel.appendChild(label);
  });
}

function spinWheel() {
  if (wheelSpun) return;
  wheelSpun = true;
  const wheel = document.getElementById('wheel');
  const n = WHEEL_PRIZES.length;
  const sliceAngle = 360 / n;

  const targetSliceCenter = WINNING_PRIZE_INDEX * sliceAngle + sliceAngle / 2;
  const extraSpins = 5 * 360;
  const finalRotation = extraSpins + (360 - targetSliceCenter);

  wheel.style.transform = `rotate(${finalRotation}deg)`;
  document.getElementById('wheel-spin').disabled = true;

  setTimeout(() => {
    launchConfetti();
    showScene('scene-reveal');
  }, 4700);
}

document.getElementById('wheel-spin').addEventListener('click', spinWheel);

// ============================================================
// ESCENA REVELACIÓN — confeti
// ============================================================

function launchConfetti() {
  const layer = document.getElementById('confetti-layer');
  layer.innerHTML = '';
  const colors = ['#f4c26b', '#f2a6b8', '#6fae63', '#d4af37', '#bfe8d9'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = (2.5 + Math.random() * 2) + 's';
    piece.style.animationDelay = (Math.random() * 0.6) + 's';
    layer.appendChild(piece);
  }
}

document.getElementById('reveal-replay').addEventListener('click', () => {
  resetOverworld();
  showScene('scene-menu');
});

// ============================================================
// ARRANQUE
// ============================================================

runBoot();
initOverworld();
