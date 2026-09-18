// ============================================================
// CONFIGURACIÓN EDITABLE — cambia aquí el contenido sin tocar el resto
// ============================================================

// Objetos con los que Alba puede hablar para desbloquear un recuerdo
// (sin pista de regalo). Los que no tienen "sprite" muestran un marcador
// neutro (sin emoji) hasta que tengan arte propio.
const OBJECT_MEMORIES = [
  { id: 'madrono', col: 8, row: 9, sprite: 'madroño_title', tree: true, label: 'El madroño',
    text: 'El madroño de la parcela.\n(Recuerdo por escribir.)' },
];

// Personas de la familia: cada una da un recuerdo profundo Y una pista de
// regalo ("Pablo me dijo que estaba pensando regalarte..."). Repartidas
// por la parcela (no todas junto a la casa). Cuando Alba haya hablado con
// TODAS (incluida la del invernadero), la casa se abre.
const HUMAN_CHARACTERS = [
  { id: 'padre', col: 4, row: 7, sprite: 'padre_down', label: 'Papá',
    text: '¡Albita! Dame un abrazo, ¿has visto a Nukita? El otro día me la llevé al campo y agarró su primer conejo, lo tengo ahora en la barbacoa, ¡no se lo digas a tu tío Victor! Anda tráeme una cervecita del congelador. Por cierto, Pabolito está dentro de la casa, pero me ha dicho que no entres hasta que hables con todos, ¿es verdad que te va a regalar a Jeepito?',
    clue: 'Jeepito (un jeep de coche).', clueInline: true },
  { id: 'madre', col: 3, row: 13, sprite: 'madre_down', label: 'Mamá',
    text: '¡Alba! Por fin llegas, te tengo preparadas unas lentejas que te vas a chupar los dedos, las alitas hoy se las dejamos a Pabolito jejejeje. Por cierto, ¿he escuchado que te va a regalar el nuevo iPhone?',
    clue: 'El nuevo iPhone.', clueInline: true },
  { id: 'abuela2', col: 9, row: 23, sprite: 'abuela2_down', label: 'Abuela Sofi',
    text: '¡Pero bueno qué sorpresa Alba! ¿Cómo están vuestras plantas? Si llego a saber que vienes te hubiese cortado un poquito del helecho que está bárbaro. Pasa pasa, Pablo está dentro, me había dicho que no te dijese nada de lo que te va a regalar por tu cumpleaños, pero yo creo que tiene algo que ver con un Mak? Mac? Uy no sé....',
    clue: 'Un Mac (ordenador).', clueInline: true },
  { id: 'abuelo2', col: 9, row: 2, sprite: 'abuelo2_down', label: 'Abuelo Andrés',
    text: '(Diálogo profundo por escribir.)',
    clue: 'Pablo me dijo que estaba pensando regalarte una noche de cine en casa.' },
  { id: 'hermana', col: 5, row: 18, sprite: 'hermana_down', label: 'Hermanita',
    text: '¡Hermana! Como te echaba de menos, por fin llegas, papá se ha puesto ya con la barbacoa y Nuka no para de mordisquear piedras... ¡Pasa pasa, que luego jugamos al Voley! Por cierto, Pablo me ha contado algo de tu regalo, creo que te va a gustar, creo que era algo como de un viaje a... ¿Canadá?',
    clue: 'Un viaje a Canadá.', clueInline: true },
  { id: 'abuela1', col: 7, row: 13, sprite: 'abuela1_down', label: 'Abuela Encarna',
    text: '(Diálogo profundo por escribir.)',
    clue: 'Pablo me dijo que estaba pensando regalarte un fin de semana en un balneario.' },
];

// El abuelo que murió: vive dentro del invernadero, junto a Sando. Su
// "pista" cuenta igual para desbloquear la casa.
const GREENHOUSE_ABUELO = {
  id: 'abuelo', label: 'Abuelo Manolo', sprite: 'abuelo1_down',
  text: 'En el huerto, donde siempre estaba tu abuelo.\nSigue aquí, en cada rincón de la parcela.',
  clue: 'Pablo me dijo que tenía algo que ver con música... o un concierto. No quiso decir más.',
  isKarolG: true,
};
const GREENHOUSE_SANDO = {
  id: 'sando', label: 'Sandete', sprite: 'sando_down', small: true,
  text: 'Sando, tu compañero más fiel.\nYa no está, pero sigue aquí, jugando con el abuelo.',
};

// Perros de la familia: solo recuerdo, sin pista de regalo.
const DOG_MEMORIES = [
  { id: 'turka', col: 3, row: 7, sprite: 'turka_down', label: 'Turka', small: true,
    text: 'Pensamiento de Alba: «No le quita ojo a las alitas de la barbacoa».\nTurka se acerca a ti para que la acaricies.' },
  { id: 'nuka', col: 2, row: 3, sprite: 'nuka_down', label: 'Nukita', small: true,
    text: 'Nuka: «¡Guau! ¡Guau!»\nAlba: «¡Nuka, deja de morder!»' },
];

const TOTAL_CLUE_GIVERS = HUMAN_CHARACTERS.length + 1; // +1 = el abuelo del invernadero

const MAP_COLS = 14;
const MAP_ROWS = 26;
const VIEW_COLS = 8;
const VIEW_ROWS = 9;
const HOUSE_DOOR_KEY = '6,3';
const GREENHOUSE_ROWS = [16];
const GREENHOUSE_DOOR_COL = 8;

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
// LA PARCELA — mapa principal
// ============================================================

// Plano calcado del boceto real de Pablo (estilizado). De arriba abajo:
// casa con porche y escaleras, caseta de barbacoa+alacena (+madroño al
// lado), piscina, zona de perros vallada, invernadero y campos de
// cultivo. El camino largo (asfalto) baja por la derecha desde la
// entrada (abajo, verja metálica de 2 casillas) hasta la casa (el
// fondo), bordeado por vallas con parra/arizónica. Todo el suelo es
// asfalto salvo: alrededores de la piscina, laterales del camino y la
// zona de cultivo (césped/tierra), y una franja de tierra-plantas justo
// dentro de las vallas laterales.
function buildMainGrid() {
  const cols = MAP_COLS, rows = MAP_ROWS;
  const g = Array.from({ length: rows }, () => Array(cols).fill('.'));

  // Bordes: murito de piedra arriba/abajo, valla con arizónica a la
  // izquierda, valla con parra a la derecha (un cuadrado más afuera que
  // antes: la columna donde iba la valla ahora es tierra-plantas).
  for (let c = 0; c < cols; c++) { g[0][c] = 'S'; g[rows - 1][c] = 'S'; }
  for (let r = 0; r < rows; r++) { g[r][0] = 'X'; g[r][cols - 1] = 'Y'; }
  for (let r = 1; r < rows - 1; r++) g[r][cols - 2] = 'D';

  // Franjas de césped/tierra alrededor de la piscina y zona de cultivo
  for (let c = 3; c <= 8; c++) { g[7][c] = 'G'; g[8][c] = 'G'; }
  for (let c = 7; c <= 8; c++) { g[9][c] = 'G'; g[10][c] = 'G'; g[11][c] = 'G'; g[12][c] = 'G'; }
  for (let c = 1; c <= 9; c++) { g[13][c] = 'G'; g[17][c] = 'G'; g[18][c] = 'G'; }
  for (let c = 1; c <= 8; c++) for (let r = 19; r <= 24; r++) g[r][c] = 'C';
  // Franja reservada para la futura caseta de los perros, entre la
  // piscina y el invernadero, y césped junto al invernadero
  for (let c = 1; c <= 9; c++) g[14][c] = 'G';
  for (let r = 15; r <= 17; r++) g[r][2] = 'G';

  // Casa: cuerpo (la imagen real ya trae su propio porche y escalera
  // dibujados, así que el suelo debajo se deja en asfalto normal)
  for (let r = 1; r <= 3; r++) for (let c = 4; c <= 8; c++) g[r][c] = 'H';
  g[3][6] = 'O';

  // Caseta de barbacoa + alacena (una sola estructura, imagen real encima);
  // un parche de tierra delante (a juego con la franja de la valla) y
  // césped al otro lado, en vez del asfalto suelto que quedaba
  for (let r = 5; r <= 9; r++) for (let c = 1; c <= 2; c++) g[r][c] = 'K';
  g[4][2] = 'D';
  g[10][2] = 'G'; g[11][2] = 'G'; g[12][2] = 'G';

  // Piscina: solo agua, sin bordillo, 6 cuadrados (2x3), un poco elevada
  for (let r = 10; r <= 11; r++) for (let c = 4; c <= 6; c++) g[r][c] = 'W';
  // Césped donde antes había piscina (fila de arriba y columna de la izquierda)
  for (let c = 3; c <= 6; c++) g[9][c] = 'G';
  g[10][3] = 'G'; g[11][3] = 'G'; g[12][3] = 'G';
  // Bordillo elevado justo bajo el agua (no se puede pisar desde ningún lado)
  for (let c = 4; c <= 6; c++) g[12][c] = 'B';

  // Invernadero (imagen real encima, reducido, bajado un bloque); solo se
  // entra por la fila central de su lado derecho, las dos esquinas quedan
  // cerradas (si no, parece que se accede "por arte de magia" por ellas).
  for (let r = 15; r <= 17; r++) for (let c = 3; c <= 8; c++) g[r][c] = 'I';
  GREENHOUSE_ROWS.forEach(r => { g[r][GREENHOUSE_DOOR_COL] = 'O'; });
  [12, 13, 14, 15, 16, 17].forEach(r => { g[r][9] = 'G'; });

  // Camino largo (asfalto) a lo largo de todo el lateral derecho
  for (let r = 1; r <= 24; r++) { g[r][10] = 'P'; g[r][11] = 'P'; }

  // Franja de tierra-plantas junto a la valla izquierda (se salta la caseta
  // y el hueco de césped justo debajo de ella)
  [1, 2, 3, 4, 10, 11, 12, 13, 14, 15, 16, 17, 18].forEach(r => { g[r][1] = 'D'; });
  // Franja de tierra-plantas al lado izquierdo del camino: solo junto a la
  // piscina (arriba se junta con el asfalto de la casa, abajo pasa a césped)
  [7, 8, 9, 10, 11].forEach(r => { g[r][9] = 'D'; });

  // Bordillo entre la zona de cultivo y el camino
  for (let r = 19; r <= 24; r++) g[r][9] = 'U';

  // Entrada: verja metálica abierta de 2 casillas, abajo
  g[rows - 1][10] = 'Z';
  g[rows - 1][11] = 'Z';

  return g;
}

function mainTileClass(type) {
  switch (type) {
    case 'S': return 'tile-stonewall';
    case 'X': return 'tile-fence-hedge';
    case 'Y': return 'tile-fence-vine';
    case 'Z': return 'tile-gate';
    case 'H': return 'tile-wall';
    case 'O': return 'tile-asphalt';
    case 'K': return 'tile-shed';
    case 'I': return 'tile-greenhouse-floor';
    case 'W': return 'tile-pool';
    case 'B': return 'tile-poolcurb';
    case 'P': return 'tile-path';
    case 'C': return 'tile-crop';
    case 'G': return 'tile-grass';
    case 'D': return 'tile-dirtplants';
    case 'U': return 'tile-curb';
    default: return 'tile-asphalt';
  }
}

const MAIN_OBSTACLES = new Set(['H', 'K', 'I', 'W', 'S', 'X', 'Y', 'B']);

function houseUnlocked() { return collectedClues.length >= TOTAL_CLUE_GIVERS; }

function mainStructures() {
  return [
    { src: houseUnlocked() ? 'game/cropped/house_open.png' : 'game/cropped/house.png',
      aspect: 1368 / 1776, colStart: 4, colEnd: 8, bottomRow: 5 },
    { src: 'game/cropped/greenhouse_tile.png', aspect: 2646 / 1341,
      colStart: 3, colEnd: 8, bottomRow: 18, matchWidth: true, scale: 1.05 },
    { src: 'game/cropped/caseta_title.png', aspect: 1121 / 2338,
      colStart: 1, colEnd: 2, bottomRow: 10, matchWidth: true, scale: 1.25 },
    // Árboles/plantas decorativas (sin diálogo, solo ambientación —
    // el único árbol interactuable por ahora es el madroño).
    // Parras junto a la valla derecha, cada 4 bloques desde la entrada.
    ...([21, 17, 13, 9, 5, 1].map(row => ({
      src: 'game/cropped/parra_title.png', aspect: 700 / 544,
      colStart: 12, colEnd: 12, bottomRow: row + 1, matchWidth: true, scale: 1.66, sway: true,
    }))),
    // Almendros flanqueando la entrada del invernadero (las dos esquinas
    // donde no se puede entrar), no en los laterales de la estructura.
    { src: 'game/cropped/almendro_title.png', aspect: 700 / 620,
      colStart: 9, colEnd: 9, bottomRow: 16, matchWidth: true, scale: 2.0, sway: true },
    { src: 'game/cropped/almendro_title.png', aspect: 700 / 620,
      colStart: 9, colEnd: 9, bottomRow: 18, matchWidth: true, scale: 2.0, sway: true },
    // Olivo en el lado izquierdo del campo de cultivo
    { src: 'game/cropped/olivo_title.png', aspect: 700 / 619,
      colStart: 1, colEnd: 1, bottomRow: 22, matchWidth: true, scale: 2.0, sway: true },
    // Plantas pequeñas en los huecos entre parras (de 4 en 4) y por el huerto
    { src: 'game/cropped/plant_sprout.png', aspect: 1, colStart: 12, colEnd: 12, bottomRow: 20, matchWidth: true, scale: 0.5 },
    { src: 'game/cropped/plant_corn.png', aspect: 1, colStart: 12, colEnd: 12, bottomRow: 16, matchWidth: true, scale: 0.75 },
    { src: 'game/cropped/plant_sunflower.png', aspect: 112 / 128, colStart: 12, colEnd: 12, bottomRow: 12, matchWidth: true, scale: 0.85 },
    { src: 'game/cropped/plant_sunflower_bud.png', aspect: 96 / 104, colStart: 12, colEnd: 12, bottomRow: 8, matchWidth: true, scale: 0.6 },
    { src: 'game/cropped/plant_leaf.png', aspect: 1, colStart: 12, colEnd: 12, bottomRow: 4, matchWidth: true, scale: 0.5 },
    { src: 'game/cropped/plant_corn.png', aspect: 1, colStart: 2, colEnd: 2, bottomRow: 21, matchWidth: true, scale: 0.75 },
    { src: 'game/cropped/plant_sunflower.png', aspect: 112 / 128, colStart: 6, colEnd: 6, bottomRow: 23, matchWidth: true, scale: 0.85 },
    { src: 'game/cropped/plant_leaf.png', aspect: 1, colStart: 4, colEnd: 4, bottomRow: 25, matchWidth: true, scale: 0.5 },
    { src: 'game/cropped/plant_sprout.png', aspect: 1, colStart: 7, colEnd: 7, bottomRow: 20, matchWidth: true, scale: 0.5 },
    { src: 'game/cropped/plant_sunflower_bud.png', aspect: 96 / 104, colStart: 3, colEnd: 3, bottomRow: 24, matchWidth: true, scale: 0.6 },
  ];
}

function mainObjects() {
  return [...OBJECT_MEMORIES, ...HUMAN_CHARACTERS, ...DOG_MEMORIES];
}

const MAIN_WARPS = { [HOUSE_DOOR_KEY]: { area: 'house', enter: { col: 2, row: 3, facing: 'up' } } };
GREENHOUSE_ROWS.forEach(r => {
  MAIN_WARPS[`${GREENHOUSE_DOOR_COL},${r}`] = { area: 'greenhouse', enter: { col: 4, row: 2, facing: 'left' } };
});

// ============================================================
// INTERIORES (misma cámara/joystick, mapas diminutos)
// ============================================================

function buildHouseGrid() {
  // 5x5. Fila 4 = pared sur con la puerta (col2) por la que se entra/sale.
  const g = Array.from({ length: 5 }, () => Array(5).fill('.'));
  for (let c = 0; c < 5; c++) { g[0][c] = '#'; }
  for (let r = 0; r < 5; r++) { g[r][0] = '#'; g[r][4] = '#'; }
  for (let c = 0; c < 5; c++) g[4][c] = '#';
  g[4][2] = 'D';
  return g;
}

function buildGreenhouseGrid() {
  // 6x5. Pared este (col5) con la puerta (row2) por la que se entra/sale.
  const g = Array.from({ length: 5 }, () => Array(6).fill('.'));
  for (let c = 0; c < 6; c++) { g[0][c] = '#'; g[4][c] = '#'; }
  for (let r = 0; r < 5; r++) g[r][0] = '#';
  for (let r = 0; r < 5; r++) g[r][5] = '#';
  g[2][5] = 'D';
  return g;
}

const AREAS = {
  main: {
    cols: MAP_COLS, rows: MAP_ROWS,
    grid: buildMainGrid(),
    obstacles: MAIN_OBSTACLES,
    tileClass: mainTileClass,
    objects: mainObjects,
    structures: mainStructures,
    warps: MAIN_WARPS,
  },
  house: {
    cols: 5, rows: 5,
    grid: buildHouseGrid(),
    obstacles: new Set(['#']),
    tileClass: t => t === '#' ? 'tile-interior-wall' : (t === 'D' ? 'tile-door-warp' : 'tile-interior-floor'),
    objects: () => [{ id: 'pablo', col: 2, row: 1, sprite: 'pablo_down', label: 'Pablo', pabloTrigger: true }],
    structures: () => [],
    warps: { '2,4': { area: 'main', enter: { col: 6, row: 4, facing: 'down' } } },
  },
  greenhouse: {
    cols: 6, rows: 5,
    grid: buildGreenhouseGrid(),
    obstacles: new Set(['#']),
    tileClass: t => t === '#' ? 'tile-interior-wall' : (t === 'D' ? 'tile-door-warp' : 'tile-interior-floor-crop'),
    objects: () => [
      { ...GREENHOUSE_ABUELO, col: 1, row: 2 },
      { ...GREENHOUSE_SANDO, col: 2, row: 3 },
    ],
    structures: () => [],
    warps: { '5,2': { area: 'main', enter: { col: 10, row: 16, facing: 'right' } } },
  },
};

let currentArea = 'main';
const player = { col: 11, row: 23, facing: 'up' };
let currentTarget = null;
let pendingOverlayAction = null;

let collectedClues = []; // { text, isKarolG }
const talkedTo = new Set();

function area() { return AREAS[currentArea]; }

function computeTileSize() {
  const isLandscape = window.innerWidth > window.innerHeight;
  const maxTile = isLandscape ? 100 : 60;
  const viewportW = isLandscape ? window.innerWidth * 0.92 : Math.min(window.innerWidth, 600);
  const viewportH = window.innerHeight * (isLandscape ? 0.88 : 0.8);
  const size = Math.floor(Math.min(maxTile, (viewportW - 16) / VIEW_COLS, viewportH / VIEW_ROWS));
  document.documentElement.style.setProperty('--tile-size', Math.max(32, size) + 'px');
}

function buildMapDOM() {
  const a = area();
  const mapGrid = document.getElementById('map-grid');
  mapGrid.style.setProperty('--map-cols', a.cols);
  mapGrid.style.setProperty('--map-rows', a.rows);
  document.documentElement.style.setProperty('--map-cols', a.cols);
  document.documentElement.style.setProperty('--map-rows', a.rows);
  document.documentElement.style.setProperty('--view-cols', Math.min(VIEW_COLS, a.cols));
  document.documentElement.style.setProperty('--view-rows', Math.min(VIEW_ROWS, a.rows));
  mapGrid.innerHTML = '';
  for (let r = 0; r < a.rows; r++) {
    for (let c = 0; c < a.cols; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile ' + a.tileClass(a.grid[r][c]);
      mapGrid.appendChild(tile);
    }
  }
  renderStructures();
}

function renderStructures() {
  const tileSize = getTileSizePx();
  const container = document.getElementById('map-structures');
  container.innerHTML = '';
  area().structures().forEach(s => {
    const footprintWidth = (s.colEnd - s.colStart + 1) * tileSize;
    const width = s.matchWidth ? footprintWidth * (s.scale != null ? s.scale : 1.18) : footprintWidth;
    const height = width / s.aspect;
    const centerCol = (s.colStart + s.colEnd + 1) / 2;
    const el = document.createElement('div');
    el.className = 'map-structure' + (s.sway ? ' sway' : '');
    el.style.width = width + 'px';
    el.style.height = height + 'px';
    el.style.left = (centerCol * tileSize - width / 2) + 'px';
    el.style.top = (s.bottomRow * tileSize - height) + 'px';
    el.innerHTML = `<img src="${s.src}" alt="">`;
    container.appendChild(el);
  });
}

function renderObjects() {
  const tileSize = getTileSizePx();
  const layer = document.getElementById('map-objects');
  layer.innerHTML = '';
  area().objects().forEach(obj => {
    const el = document.createElement('div');
    el.className = 'map-object';
    el.dataset.id = obj.id;
    el.style.left = obj.col * tileSize + 'px';
    el.style.top = obj.row * tileSize + 'px';

    if (obj.sprite) {
      el.classList.add('character');
      if (obj.tree) el.classList.add('tree');
      else if (obj.small) el.classList.add('small');
      const img = document.createElement('img');
      img.src = `game/cropped/${obj.sprite}.png`;
      img.alt = '';
      el.appendChild(img);
    }
    layer.appendChild(el);
  });
}

function getTileSizePx() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tile-size'));
}

function updateCamera() {
  const a = area();
  const tileSize = getTileSizePx();
  const viewport = document.querySelector('.map-viewport');
  const camera = document.getElementById('map-camera');
  const viewportRect = viewport.getBoundingClientRect();
  const mapW = a.cols * tileSize;
  const mapH = a.rows * tileSize;
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
  updateCamera();
}

function renderPlayerSprite() {
  const img = document.getElementById('player-img');
  const sprite = document.getElementById('player-sprite');
  if (player.facing === 'right') {
    img.src = 'game/cropped/player_left.png';
    sprite.classList.add('mirror');
  } else {
    img.src = `game/cropped/player_${player.facing}.png`;
    sprite.classList.remove('mirror');
  }
}

function isBlocked(col, row) {
  const a = area();
  if (col < 0 || row < 0 || col >= a.cols || row >= a.rows) return true;
  if (a.obstacles.has(a.grid[row][col])) return true;
  return a.objects().some(o => o.col === col && o.row === row);
}

function tryMove(dx, dy, forcedFacing) {
  const targetCol = player.col + dx;
  const targetRow = player.row + dy;
  const newFacing = forcedFacing || (dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down');
  if (newFacing !== player.facing) {
    player.facing = newFacing;
    renderPlayerSprite();
  }

  const key = `${targetCol},${targetRow}`;
  if (currentArea === 'main' && key === HOUSE_DOOR_KEY && !houseUnlocked()) {
    openOverlay('!', `La casa está cerrada.\nVuelve cuando hayas hablado con toda la familia (${collectedClues.length}/${TOTAL_CLUE_GIVERS}).`, 'Vale');
    return;
  }

  if (!isBlocked(targetCol, targetRow)) {
    player.col = targetCol;
    player.row = targetRow;
    const sprite = document.getElementById('player-sprite');
    sprite.classList.remove('stepping');
    void sprite.offsetWidth;
    sprite.classList.add('stepping');

    const warp = area().warps[key];
    if (warp) {
      renderPlayerPosition();
      fadeToArea(warp.area, warp.enter);
      return;
    }
  }
  renderPlayerPosition();
  updateProximity();
}

function fadeToArea(name, enter) {
  const fade = document.getElementById('scene-fade');
  stopMoveLoop();
  fade.classList.add('active');
  setTimeout(() => {
    enterArea(name, enter);
    setTimeout(() => fade.classList.remove('active'), 200);
  }, 420);
}

function enterArea(name, enter) {
  currentArea = name;
  player.col = enter.col;
  player.row = enter.row;
  player.facing = enter.facing;
  buildMapDOM();
  renderObjects();
  renderPlayerSprite();
  renderPlayerPosition();
  updateProximity();
}

function updateProximity() {
  document.querySelectorAll('.map-object').forEach(el => el.classList.remove('near'));
  const neighbors = [
    [player.col, player.row - 1], [player.col, player.row + 1],
    [player.col - 1, player.row], [player.col + 1, player.row],
  ];
  const objects = area().objects();
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
    hint.textContent = currentArea === 'main' ? 'Muévete por la parcela y explora todo lo que puedas.' : '';
    return;
  }
  const el = document.querySelector(`.map-object[data-id="${found.id}"]`);
  if (el) el.classList.add('near');
  btn.style.display = 'inline-block';
  btn.textContent = 'Hablar';
  hint.textContent = 'Hay alguien aquí. Toca "Hablar".';
}

function openOverlay(avatarHtml, text, closeLabel) {
  stopMoveLoop();
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
  if (obj.sprite) return `<img src="game/cropped/${obj.sprite}.png" alt="">`;
  return '!';
}

function handleTalk(obj) {
  if (obj.pabloTrigger) {
    pendingOverlayAction = () => {
      showScene('scene-wheel');
      prepareWheelFromCollectedClues();
    };
    openOverlay(avatarFor(obj), 'Has hablado con toda la familia... ahora toca decidir.\nTira de la ruleta para ver qué regalo te llevas de verdad.', 'Girar la ruleta ▶');
    return;
  }

  const isNew = !talkedTo.has(obj.id);
  talkedTo.add(obj.id);
  document.getElementById('hud-memories').textContent = talkedTo.size;

  let text = `${obj.label}\n\n${obj.text}`;
  if (obj.clue) {
    if (isNew) collectedClues.push({ text: obj.clue, isKarolG: !!obj.isKarolG });
    if (!obj.clueInline) text += `\n\n"${obj.clue}"`;
    document.getElementById('hud-clues').textContent = collectedClues.length;
    if (currentArea === 'main') renderStructures();
  }
  openOverlay(avatarFor(obj), text, 'Cerrar');
}

function handleInteract() {
  if (!currentTarget) return;
  handleTalk(currentTarget);
}

document.getElementById('action-btn').addEventListener('click', handleInteract);

const KEY_DIR = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};
const heldDirs = [];

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('scene-overworld').classList.contains('active')) return;
  if (document.getElementById('interaction-overlay').classList.contains('active')) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleInteract(); return; }
  const dir = KEY_DIR[e.key];
  if (!dir) return;
  e.preventDefault();
  if (e.repeat) return;
  if (!heldDirs.includes(dir)) heldDirs.push(dir);
  startMoveLoop(dir, dir);
});
document.addEventListener('keyup', (e) => {
  const dir = KEY_DIR[e.key];
  if (!dir) return;
  const idx = heldDirs.indexOf(dir);
  if (idx !== -1) heldDirs.splice(idx, 1);
  if (currentDir === dir) {
    const next = heldDirs[heldDirs.length - 1];
    if (next) startMoveLoop(next, next);
    else stopMoveLoop();
  }
});

// ------------------------------------------------------------
// Joystick táctil (mantener pulsado y arrastrar para moverse).
// El movimiento sigue siendo de 4 direcciones (rejilla), pero la
// orientación del personaje usa 8 sectores: si el joystick se inclina en
// diagonal hacia arriba/abajo, el personaje se ve de lateral (no de
// espaldas/frente), como en los juegos clásicos.
// ------------------------------------------------------------

const joystick = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystick-knob');
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let moveInterval = null;
let currentDir = null;
const MOVE_REPEAT_MS = 220;
const JOYSTICK_MOVE_REPEAT_MS = 300;
const JOYSTICK_MAX = 40;
const JOYSTICK_DEADZONE = 12;

function setKnobPosition(x, y) {
  joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}
function resetKnob() {
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}
// Eje dominante: si el joystick apunta más hacia arriba/abajo que hacia un
// lado, se mueve (y se ve) de espaldas/frente; si apunta más hacia un lado,
// de lado. Mismo criterio para movimiento y orientación, sin desajustes.
function moveDirFromAngle(angle) {
  if (angle > -45 && angle <= 45) return 'right';
  if (angle > 45 && angle <= 135) return 'down';
  if (angle > 135 || angle <= -135) return 'left';
  return 'up';
}
function moveForDir(dir, facing) {
  if (dir === 'up') tryMove(0, -1, facing);
  else if (dir === 'down') tryMove(0, 1, facing);
  else if (dir === 'left') tryMove(-1, 0, facing);
  else if (dir === 'right') tryMove(1, 0, facing);
}
function startMoveLoop(dir, facing, repeatMs) {
  if (currentDir === dir) return;
  currentDir = dir;
  clearInterval(moveInterval);
  moveForDir(dir, facing);
  moveInterval = setInterval(() => moveForDir(dir, facing), repeatMs || MOVE_REPEAT_MS);
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
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  setKnobPosition(Math.cos(angle * Math.PI / 180) * dist, Math.sin(angle * Math.PI / 180) * dist);
  if (Math.hypot(dx, dy) < JOYSTICK_DEADZONE) { stopMoveLoop(); return; }
  const dir = moveDirFromAngle(angle);
  startMoveLoop(dir, dir, JOYSTICK_MOVE_REPEAT_MS);
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
  currentArea = 'main';
  player.col = 11; player.row = 23; player.facing = 'up';
  collectedClues = [];
  talkedTo.clear();
  document.getElementById('hud-memories').textContent = '0';
  document.getElementById('hud-clues').textContent = '0';
  buildMapDOM();
  renderObjects();
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
  const labelRadius = radius * 0.68;

  WHEEL_PRIZES.forEach((prize, i) => {
    const label = document.createElement('div');
    label.className = 'wheel-slice-label';
    const angle = sliceAngle * i + sliceAngle / 2;
    const rad = (angle * Math.PI) / 180;
    const x = labelRadius * Math.sin(rad);
    const y = -labelRadius * Math.cos(rad);
    label.style.left = `calc(50% + ${x}px)`;
    label.style.top = `calc(50% + ${y}px)`;
    label.textContent = i + 1;
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
