// ============================================================
// CONFIGURACIÓN EDITABLE — cambia aquí el contenido sin tocar el resto
// ============================================================

// Objetos con los que Alba puede hablar para desbloquear un recuerdo
// (sin pista de regalo). Varios tienen texto PLACEHOLDER.
const OBJECT_MEMORIES = [
  { id: 'mecedora', col: 5, row: 4, emoji: '🪑', label: 'La mecedora del porche',
    text: 'La mecedora del porche, testigo de tardes enteras.\n(Recuerdo por escribir.)' },
  { id: 'mortero', col: 8, row: 3, emoji: '🥣', label: 'El mortero',
    text: 'Ese mortero de siempre.\nHay una foto suya de pequeña con él en las manos — icónica.' },
  { id: 'madrono', col: 4, row: 7, emoji: '🌳', label: 'El madroño',
    text: 'El madroño de la parcela.\n(Recuerdo por escribir.)' },
  { id: 'limonero', col: 2, row: 19, emoji: '🍋', label: 'El limonero',
    text: 'El limonero de la parcela.\n(Recuerdo por escribir.)' },
  { id: 'gallinero', col: 8, row: 21, emoji: '🐔', label: 'El gallinero',
    text: 'El gallinero de toda la vida.\n(Recuerdo por escribir.)' },
];

// Personas de la familia: cada una da un recuerdo profundo Y una pista de
// regalo ("Pablo me dijo que estaba pensando regalarte..."). Cuando Alba
// haya hablado con TODAS (incluida la del invernadero), la casa se abre.
// sprite: null → todavía no hay arte (se usa emoji de sustitución).
const HUMAN_CHARACTERS = [
  { id: 'padre', col: 2, row: 2, sprite: 'padre_down', label: 'Papá',
    text: '(Diálogo profundo por escribir.)',
    clue: '🧦 Pablo me dijo que estaba pensando regalarte unos calcetines a juego con la casa.' },
  { id: 'madre', col: 10, row: 2, sprite: 'madre_down', label: 'Mamá',
    text: '(Diálogo profundo por escribir.)',
    clue: '🍓 Pablo me dijo que estaba pensando regalarte fresas infinitas para la granja.' },
  { id: 'abuela2', col: 2, row: 3, sprite: 'abuela2_down', label: 'La abuela',
    text: '(Diálogo profundo por escribir.)',
    clue: '🛋️ Pablo me dijo que estaba pensando regalarte un vale para redecorar el salón (otra vez).' },
  { id: 'abuelo2', col: 10, row: 3, sprite: 'abuelo2_down', label: 'El abuelo',
    text: '(Diálogo profundo por escribir.)',
    clue: '🎬 Pablo me dijo que estaba pensando regalarte una noche de cine en casa.' },
  { id: 'hermana', col: 9, row: 1, sprite: null, emoji: '👧', label: 'Tu hermana',
    text: '(Diálogo profundo por escribir. Nota: el sprite de tu hermana salió con un error — pídele a Pablo que lo regenere.)',
    clue: '🏡 Pablo me dijo que estaba pensando regalarte una tarde entera decorando la parcela.' },
];

// El abuelo que murió: vive dentro del invernadero, junto a Sando. Su
// "pista" cuenta igual para desbloquear la casa. Sin arte propio todavía.
const GREENHOUSE_ABUELO = {
  id: 'abuelo', label: 'El abuelo', emoji: '👴',
  text: 'En el huerto, donde siempre estaba tu abuelo.\nSigue aquí, en cada rincón de la parcela.',
  clue: '🎫 Pablo me dijo que tenía algo que ver con música... o un concierto. No quiso decir más.',
  isKarolG: true,
};
const GREENHOUSE_SANDO_TEXT = 'Sando, tu compañero más fiel.\nYa no está, pero sigue aquí, correteando por el invernadero.';

// Perros de la familia: solo recuerdo, sin pista de regalo.
const DOG_MEMORIES = [
  { id: 'turka', col: 3, row: 6, sprite: 'turka_down', label: 'Turka',
    text: 'Turka, siempre atenta a todo lo que pasa en la parcela.\n(Recuerdo por escribir.)' },
  { id: 'nuka', col: 8, row: 6, sprite: 'nuka_down', label: 'Nuka',
    text: 'Nuka, la otra perrita de la familia.\n(Recuerdo por escribir.)' },
];

const TOTAL_CLUE_GIVERS = HUMAN_CHARACTERS.length + 1; // +1 = el abuelo del invernadero

const MAP_COLS = 13;
const MAP_ROWS = 26;
const VIEW_COLS = 8;
const VIEW_ROWS = 9;

// ============================================================
// NAVEGACIÓN ENTRE ESCENAS
// ============================================================

function showScene(id) {
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

document.querySelectorAll('[data-target]').forEach(el => {
  el.addEventListener('click', () => {
    showScene(el.dataset.target);
    if (el.dataset.target === 'scene-overworld') updateCamera();
  });
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
    'Puliendo los muebles de la parcela...',
    'Regando el huerto...',
    'Calentando el invernadero...',
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
// LA PARCELA — mapa, personajes, colisiones e interacción
// ============================================================

// Plano calcado del boceto real de Pablo (estilizado, no una recreación
// literal por satélite). De arriba abajo: casa con porche y escaleras,
// caseta de barbacoa+alacena (+madroño al lado), piscina, zona de perros
// vallada, invernadero y campos de cultivo. El camino largo baja por la
// derecha desde la entrada (abajo) hasta la casa (el fondo).
function buildGrid() {
  const g = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill('.'));
  for (let c = 0; c < MAP_COLS; c++) { g[0][c] = '#'; g[MAP_ROWS - 1][c] = '#'; }
  for (let r = 0; r < MAP_ROWS; r++) { g[r][0] = '#'; g[r][MAP_COLS - 1] = '#'; }
  g[MAP_ROWS - 1][11] = 'P'; // puerta de entrada, abajo

  // Casa (la imagen real se dibuja encima; esto solo marca la colisión):
  // rows1-3 = cuerpo de la casa, row4 = porche transitable con la puerta
  // (objeto interactivo "house-door" en col6,row4), row5 = escalón de bajada.
  for (let r = 1; r <= 3; r++) for (let c = 4; c <= 8; c++) g[r][c] = 'H';
  for (let c = 4; c <= 8; c++) g[4][c] = 'T';
  g[5][6] = 'E';

  // Caseta de barbacoa + alacena
  for (let c = 1; c <= 2; c++) g[7][c] = 'K';
  for (let r = 8; r <= 11; r++) for (let c = 1; c <= 2; c++) g[r][c] = 'B';

  // Piscina: borde transitable ("Y") con agua bloqueada en el centro ("W")
  for (let c = 3; c <= 6; c++) { g[9][c] = 'Y'; g[11][c] = 'Y'; }
  g[10][3] = 'Y'; g[10][4] = 'W'; g[10][5] = 'W'; g[10][6] = 'Y';

  // Zona de perros: al descubierto pero vallada (transitable)
  for (let c = 3; c <= 6; c++) g[12][c] = 'F';

  // Invernadero (la imagen real se dibuja encima; esto marca la colisión)
  for (let r = 13; r <= 16; r++) for (let c = 3; c <= 9; c++) g[r][c] = 'I';

  // Campos de cultivo / huerto
  for (let r = 18; r <= 23; r++) for (let c = 1; c <= 9; c++) g[r][c] = 'C';

  // Camino largo por la derecha, con parras bordeándolo donde hay hueco
  for (let r = 9; r <= 24; r++) { g[r][10] = 'P'; g[r][11] = 'P'; }
  [7, 8, 12, 17].forEach(r => { g[r][9] = 'V'; });

  return g;
}

const grid = buildGrid();
const OBSTACLE_TILES = new Set(['#', 'H', 'K', 'B', 'I', 'W']);

const player = { col: 11, row: 23, facing: 'up' };
let currentTarget = null; // objeto con el que se puede interactuar ahora mismo
let pendingOverlayAction = null;

let collectedClues = []; // { text, isKarolG }
const talkedTo = new Set(); // ids de personas/animales/objetos ya hablados

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function computeTileSize() {
  const viewportW = Math.min(window.innerWidth, 600);
  const size = Math.floor(Math.min(60, (viewportW - 16) / VIEW_COLS, (window.innerHeight * 0.8) / VIEW_ROWS));
  document.documentElement.style.setProperty('--tile-size', Math.max(32, size) + 'px');
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
      else if (type === 'H') cls += 'tile-wall';
      else if (type === 'T') cls += 'tile-terrace';
      else if (type === 'E') cls += 'tile-steps';
      else if (type === 'K') cls += 'tile-shed-roof';
      else if (type === 'B') cls += 'tile-shed-wall';
      else if (type === 'Y') cls += 'tile-pool-edge';
      else if (type === 'W') cls += 'tile-pool';
      else if (type === 'F') cls += 'tile-dogyard';
      else if (type === 'P') cls += 'tile-path';
      else if (type === 'V') cls += 'tile-vine';
      else if (type === 'C') cls += 'tile-crop';
      else if (type === 'I') cls += 'tile-greenhouse-floor';
      else cls += 'tile-grass';
      tile.className = cls;
      mapGrid.appendChild(tile);
    }
  }
  document.documentElement.style.setProperty('--view-cols', VIEW_COLS);
  document.documentElement.style.setProperty('--view-rows', VIEW_ROWS);

  // Estructuras grandes (casa e invernadero) como imagen real
  const structures = document.getElementById('map-structures');
  structures.innerHTML = '';
  addStructure(structures, 'game/cropped/house.png', 1.368 / 1.776, { colStart: 4, colEnd: 8, bottomRow: 5 });
  addStructure(structures, 'game/cropped/greenhouse_tile.png', 2304 / 1106, { colStart: 3, colEnd: 9, bottomRow: 17 }, true);
}

function addStructure(container, src, aspect, { colStart, colEnd, bottomRow }, matchWidth) {
  const tileSize = getTileSizePx();
  const footprintWidth = (colEnd - colStart + 1) * tileSize;
  const el = document.createElement('div');
  el.className = 'map-structure';
  let width, height;
  if (matchWidth) {
    width = footprintWidth * 1.18;
    height = width / aspect;
  } else {
    width = footprintWidth;
    height = width / aspect;
  }
  const centerCol = (colStart + colEnd + 1) / 2;
  el.style.width = width + 'px';
  el.style.height = height + 'px';
  el.style.left = (centerCol * tileSize - width / 2) + 'px';
  el.style.top = (bottomRow * tileSize - height) + 'px';
  el.innerHTML = `<img src="${src}" alt="">`;
  container.appendChild(el);
}

function allInteractables() {
  const list = [
    ...OBJECT_MEMORIES.map(m => ({ ...m, type: 'memory' })),
    ...HUMAN_CHARACTERS.map(h => ({ ...h, type: 'human' })),
    ...DOG_MEMORIES.map(d => ({ ...d, type: 'memory', sprite: d.sprite })),
    { id: 'house-door', col: 6, row: 4, type: 'house', emoji: '🚪' },
    { id: 'greenhouse-door', col: 6, row: 16, type: 'greenhouse', emoji: '🌿' },
  ];
  return list;
}

function renderObjects() {
  const tileSize = getTileSizePx();
  const layer = document.getElementById('map-objects');
  layer.innerHTML = '';
  allInteractables().forEach(obj => {
    if (obj.type === 'house' || obj.type === 'greenhouse') return; // no se dibujan, son invisibles (la estructura ya se ve)
    const el = document.createElement('div');
    el.className = 'map-object';
    el.dataset.id = obj.id;
    el.style.left = obj.col * tileSize + 'px';
    el.style.top = obj.row * tileSize + 'px';

    if (obj.sprite) {
      el.classList.add('character');
      if (obj.type === 'memory') el.classList.add('small');
      const img = document.createElement('img');
      img.src = `game/cropped/${obj.sprite}.png`;
      img.alt = '';
      el.appendChild(img);
    } else {
      el.textContent = obj.emoji;
    }
    layer.appendChild(el);
  });
}

function getTileSizePx() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
}

function updateCamera() {
  const tileSize = getTileSizePx();
  const viewport = document.querySelector('.map-viewport');
  const camera = document.getElementById('map-camera');
  const viewportRect = viewport.getBoundingClientRect();
  const mapW = MAP_COLS * tileSize;
  const mapH = MAP_ROWS * tileSize;
  let camX = player.col * tileSize + tileSize / 2 - viewportRect.width / 2;
  let camY = player.row * tileSize + tileSize / 2 - viewportRect.height / 2;
  camX = Math.max(0, Math.min(camX, Math.max(0, mapW - viewportRect.width)));
  camY = Math.max(0, Math.min(camY, Math.max(0, mapH - viewportRect.height)));
  camera.style.transform = `translate(${-camX}px, ${-camY}px)`;
}

function renderPlayerPosition() {
  const tileSize = getTileSizePx();
  const sprite = document.getElementById('player-sprite');
  sprite.style.left = player.col * tileSize + 'px';
  sprite.style.top = player.row * tileSize + 'px';
  sprite.classList.toggle('face-left', player.facing === 'left');
  updateCamera();
}

function renderPlayerSprite() {
  const img = document.getElementById('player-img');
  const dir = player.facing === 'left' ? 'left' : (player.facing === 'up' ? 'up' : 'down');
  img.src = `game/cropped/player_${dir}.png`;
}

function isBlocked(col, row) {
  if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return true;
  if (OBSTACLE_TILES.has(grid[row][col])) return true;
  return allInteractables().some(o => o.col === col && o.row === row);
}

function tryMove(dx, dy) {
  const targetCol = player.col + dx;
  const targetRow = player.row + dy;
  let facingChanged = false;
  if (dx < 0 && player.facing !== 'left') { player.facing = 'left'; facingChanged = true; }
  else if (dx > 0 && player.facing === 'left') { player.facing = 'right'; facingChanged = true; }
  else if (dx > 0 && player.facing !== 'right') { player.facing = 'right'; facingChanged = true; }
  else if (dy < 0 && player.facing !== 'up') { player.facing = 'up'; facingChanged = true; }
  else if (dy > 0 && player.facing !== 'down') { player.facing = 'down'; facingChanged = true; }
  if (facingChanged) renderPlayerSprite();
  if (!isBlocked(targetCol, targetRow)) {
    player.col = targetCol;
    player.row = targetRow;
    const sprite = document.getElementById('player-sprite');
    sprite.classList.remove('stepping');
    void sprite.offsetWidth; // reinicia la animación aunque se repita el mismo movimiento
    sprite.classList.add('stepping');
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
  const objects = allInteractables();
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
  if (found.type === 'memory' || found.type === 'human') {
    btn.textContent = 'Hablar';
    hint.textContent = '✨ Hay algo aquí. Toca "Hablar".';
  } else if (found.type === 'greenhouse') {
    btn.textContent = 'Entrar';
    hint.textContent = '✨ Puedes entrar al invernadero.';
  } else if (found.type === 'house') {
    const ready = collectedClues.length >= TOTAL_CLUE_GIVERS;
    btn.textContent = ready ? 'Entrar' : 'Tocar';
    hint.textContent = ready
      ? '✨ ¡La casa está abierta!'
      : `La casa está cerrada (${collectedClues.length}/${TOTAL_CLUE_GIVERS} pistas).`;
  }
}

function openOverlay(avatarHtml, text, closeLabel) {
  const avatarEl = document.getElementById('interaction-avatar');
  avatarEl.innerHTML = avatarHtml;
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

function avatarFor(obj) {
  if (obj.sprite) return `<img src="game/cropped/${obj.sprite}.png" alt="" style="height:60px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">`;
  return obj.emoji || '💬';
}

function handleTalk(obj) {
  const isNew = !talkedTo.has(obj.id);
  talkedTo.add(obj.id);
  document.getElementById('hud-memories').textContent = talkedTo.size;

  let text = `${obj.label}\n\n${obj.text}`;
  if (obj.clue) {
    if (isNew) collectedClues.push({ text: obj.clue, isKarolG: !!obj.isKarolG });
    text += `\n\n💬 "${obj.clue}"`;
    document.getElementById('hud-clues').textContent = collectedClues.length;
  }
  openOverlay(avatarFor(obj), text, 'Cerrar');
}

function handleInteract() {
  if (!currentTarget) return;
  const obj = currentTarget;

  if (obj.type === 'memory' || obj.type === 'human') {
    handleTalk(obj);
    return;
  }

  if (obj.type === 'greenhouse') {
    showScene('scene-greenhouse');
    return;
  }

  if (obj.type === 'house') {
    if (collectedClues.length < TOTAL_CLUE_GIVERS) {
      openOverlay('🔒', `La casa está cerrada.\nVuelve cuando hayas hablado con toda la familia (${collectedClues.length}/${TOTAL_CLUE_GIVERS}).`, 'Vale');
      return;
    }
    showScene('scene-house-interior');
  }
}

document.getElementById('action-btn').addEventListener('click', handleInteract);

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('scene-overworld').classList.contains('active')) return;
  if (['ArrowUp', 'w', 'W'].includes(e.key)) tryMove(0, -1);
  else if (['ArrowDown', 's', 'S'].includes(e.key)) tryMove(0, 1);
  else if (['ArrowLeft', 'a', 'A'].includes(e.key)) tryMove(-1, 0);
  else if (['ArrowRight', 'd', 'D'].includes(e.key)) tryMove(1, 0);
  else if (e.key === 'Enter' || e.key === ' ') handleInteract();
});

// ------------------------------------------------------------
// Joystick táctil (mantener pulsado y arrastrar para moverse)
// ------------------------------------------------------------

const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystick-knob');
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let moveInterval = null;
let currentDir = null;
const MOVE_REPEAT_MS = 220;
const JOYSTICK_MAX = 40;
const JOYSTICK_DEADZONE = 12;

function setKnobPosition(x, y) {
  joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}
function resetKnob() {
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}
function dirFromVector(dx, dy) {
  if (Math.hypot(dx, dy) < JOYSTICK_DEADZONE) return null;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle > -45 && angle <= 45) return 'right';
  if (angle > 45 && angle <= 135) return 'down';
  if (angle > 135 || angle <= -135) return 'left';
  return 'up';
}
function moveForDir(dir) {
  if (dir === 'up') tryMove(0, -1);
  else if (dir === 'down') tryMove(0, 1);
  else if (dir === 'left') tryMove(-1, 0);
  else if (dir === 'right') tryMove(1, 0);
}
function startMoveLoop(dir) {
  if (currentDir === dir) return;
  currentDir = dir;
  clearInterval(moveInterval);
  moveForDir(dir);
  moveInterval = setInterval(() => moveForDir(dir), MOVE_REPEAT_MS);
}
function stopMoveLoop() {
  clearInterval(moveInterval);
  moveInterval = null;
  currentDir = null;
}
function handleJoystickPointer(e) {
  const dx = e.clientX - joystickCenter.x;
  const dy = e.clientY - joystickCenter.y;
  const dist = Math.min(JOYSTICK_MAX, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  setKnobPosition(Math.cos(angle) * dist, Math.sin(angle) * dist);
  const dir = dirFromVector(dx, dy);
  if (dir) startMoveLoop(dir);
  else stopMoveLoop();
}
function endJoystick() {
  joystickActive = false;
  resetKnob();
  stopMoveLoop();
}
joystick.addEventListener('pointerdown', (e) => {
  joystickActive = true;
  joystick.setPointerCapture(e.pointerId);
  const rect = joystick.getBoundingClientRect();
  joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  handleJoystickPointer(e);
});
joystick.addEventListener('pointermove', (e) => { if (joystickActive) handleJoystickPointer(e); });
joystick.addEventListener('pointerup', endJoystick);
joystick.addEventListener('pointercancel', endJoystick);

function initOverworld() {
  computeTileSize();
  buildMapDOM();
  renderObjects();
  renderPlayerSprite();
  renderPlayerPosition();
  updateProximity();
  document.getElementById('hud-memories-total').textContent =
    OBJECT_MEMORIES.length + HUMAN_CHARACTERS.length + DOG_MEMORIES.length + 2; // +2 = abuelo y Sando del invernadero
  document.getElementById('hud-clues-total').textContent = TOTAL_CLUE_GIVERS;
}

function resetOverworld() {
  player.col = 11; player.row = 23; player.facing = 'up';
  collectedClues = [];
  talkedTo.clear();
  document.getElementById('hud-memories').textContent = '0';
  document.getElementById('hud-clues').textContent = '0';
  renderPlayerSprite();
  renderPlayerPosition();
  updateProximity();
}

window.addEventListener('resize', () => {
  computeTileSize();
  buildMapDOM();
  renderObjects();
  renderPlayerPosition();
});

// ============================================================
// ESCENA INVERNADERO (interior estático: Abuelo + Sando)
// ============================================================

document.getElementById('gh-abuelo').addEventListener('click', () => handleTalk(GREENHOUSE_ABUELO));
document.getElementById('gh-sando').addEventListener('click', () => handleTalk({
  id: 'sando', label: 'Sando', sprite: 'sando_down', text: GREENHOUSE_SANDO_TEXT,
}));
document.getElementById('greenhouse-exit').addEventListener('click', () => {
  showScene('scene-overworld');
  updateCamera();
});

// ============================================================
// ESCENA INTERIOR DE LA CASA (Pablo + botón a la ruleta)
// ============================================================

document.getElementById('house-to-wheel').addEventListener('click', () => {
  showScene('scene-wheel');
  prepareWheelFromCollectedClues();
});

// ============================================================
// ESCENA RULETA (contenido dinámico según las pistas recogidas)
// ============================================================

let WHEEL_PRIZES = [];
let WINNING_PRIZE_INDEX = 0;
let wheelSpun = false;

function prepareWheelFromCollectedClues() {
  WHEEL_PRIZES = collectedClues.map(p => p.text);
  WINNING_PRIZE_INDEX = collectedClues.findIndex(p => p.isKarolG);
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
