// ============================================================
// SONIDO — ambiente, pasos según el terreno, charla y avión de fondo
// ============================================================
// Los pasos van aparte (FOOTSTEP_FILES, más abajo): se reproducen como
// buffers de Web Audio, no como <audio>, para poder cortarlos entre
// zancada y zancada sin el "clic" de rebobinar un <audio> a medio sonar.
const SFX_FILES = {
  ambient: 'game/sfx/ambiente.mp3',
  plane: 'game/sfx/avion.mp3',
  talk: 'game/sfx/charla.mp3',
  // Música estilo Animal Crossing New Horizons (Prologue), recortada ya
  // desde el segundo 11,54 para que el bucle empiece justo ahí sin que
  // haga falta tocar el currentTime cada vez que se repite.
  music: 'game/sfx/musica.m4a',
  // Mismo tema, sin recortar, para el menú y los créditos.
  menuMusic: 'game/sfx/prologo.m4a',
  // Falta el archivo de verdad (el que subiste llegó vacío, 0 bytes) —
  // en cuanto vuelvas a añadir game/sfx/karolg.mp3 sonará solo, sin tocar
  // nada más. Suena una vez, desde el segundo 58, en la revelación.
  karolg: 'game/sfx/karolg.mp3',
};
const SFX = {};
Object.entries(SFX_FILES).forEach(([key, src]) => {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = 'auto';
  SFX[key] = audio;
});
SFX.ambient.volume = 0.32;
SFX.plane.loop = false; // pasa una vez y se reprograma el siguiente sobrevuelo
SFX.plane.volume = 0.55;
SFX.talk.volume = 0.38;
const MUSIC_TARGET_VOLUME = 0.1; // muy de fondo dentro de la parcela
SFX.music.volume = 0;            // arranca en 0; startAmbient() la sube con un fade-in
SFX.menuMusic.volume = 0.22;
SFX.karolg.loop = false;
SFX.karolg.volume = 0.55;
// Las dos pistas largas no hace falta bajarlas enteras nada más cargar la
// página (compiten con el resto de recursos al principio); con
// "metadata" el navegador las trae de verdad en cuanto se reproducen.
SFX.music.preload = 'metadata';
SFX.menuMusic.preload = 'metadata';
SFX.karolg.preload = 'metadata';

function playKarolGSong() {
  const a = SFX.karolg;
  const start = () => { try { a.currentTime = 58; } catch (e) { /* aún sin metadata */ } safePlay(a); };
  if (a.readyState >= 1) start();
  else a.addEventListener('loadedmetadata', start, { once: true });
}

let musicFadeTimer = null;
function fadeInMusic() {
  clearInterval(musicFadeTimer);
  SFX.music.volume = 0;
  safePlay(SFX.music);
  const steps = 30, stepMs = 90; // ~2,7s de fade-in suave
  let i = 0;
  musicFadeTimer = setInterval(() => {
    i++;
    SFX.music.volume = Math.min(MUSIC_TARGET_VOLUME, MUSIC_TARGET_VOLUME * (i / steps));
    if (i >= steps) clearInterval(musicFadeTimer);
  }, stepMs);
}

// ---- Web Audio: contexto compartido para los pasos, la charla y el
// avión (paneo, ganancia por zancada, etc. — ver más abajo) ----
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = Ctx ? new Ctx() : null;
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

// ---- Pasos: un fichero por terreno, decodificado una sola vez a un
// AudioBuffer. Cada zancada dispara una copia nueva (no relanza ni
// rebobina un <audio> que ya estaba sonando, que era lo que se oía como
// un "tijeretazo" al cortar césped a medio clip), con:
//  - un pie por altavoz (paneo alterno izquierda/derecha),
//  - un pie algo más flojo que el otro,
//  - una pizca de variación de tono en cada paso,
// para que no suene todo el rato exactamente al mismo "clac" repetido.
const FOOTSTEP_FILES = {
  cesped: 'game/sfx/pasos_cesped.mp3',
  tierra: 'game/sfx/pasos_tierra.mp3',
  hormigon: 'game/sfx/pasos_hormigon.mp3',
};
// Nivel base por terreno: la grabación de tierra es de por sí mucho más
// floja que la de césped y, sobre todo, que la de hormigón (comprobado
// por amplitud real de cada archivo), así que se compensa aquí.
const FOOTSTEP_GAIN = { cesped: 1.4, tierra: 2.9, hormigon: 0.3 };
const FOOTSTEP_MASTER_LEVEL = 0.55; // volumen general de los pasos (sin tocar el equilibrio entre ellos)
const footstepBuffers = {}; // category -> AudioBuffer (o null mientras carga)
let footstepMasterGain = null;

function ensureFootstepMasterGain() {
  const ctx = getAudioCtx();
  if (!ctx) return null;
  if (!footstepMasterGain) {
    footstepMasterGain = ctx.createGain();
    footstepMasterGain.gain.value = soundMuted ? 0 : FOOTSTEP_MASTER_LEVEL;
    footstepMasterGain.connect(ctx.destination);
  }
  return footstepMasterGain;
}

function ensureFootstepBuffer(category) {
  const ctx = getAudioCtx();
  if (!ctx || category in footstepBuffers) return;
  footstepBuffers[category] = null; // marca "ya pedido" para no duplicar la carga
  fetch(FOOTSTEP_FILES[category])
    .then(r => r.arrayBuffer())
    .then(data => ctx.decodeAudioData(data))
    .then(buf => { footstepBuffers[category] = buf; })
    .catch(() => { delete footstepBuffers[category]; });
}
function preloadFootstepBuffers() { Object.keys(FOOTSTEP_FILES).forEach(ensureFootstepBuffer); }

let planePanner = null;
function routePlaneThroughPanner() {
  const ctx = getAudioCtx();
  if (!ctx || planePanner || !ctx.createStereoPanner) return;
  try {
    const source = ctx.createMediaElementSource(SFX.plane);
    planePanner = ctx.createStereoPanner();
    source.connect(planePanner).connect(ctx.destination);
  } catch (e) { /* sin panorama: sonará centrado, sin más */ }
}

// Qué pasos suenan según el tipo de suelo pisado (mismo mapeo para la
// parcela y los interiores: suelo de tierra del invernadero -> tierra,
// suelo de la casa -> hormigón)
const TERRAIN_SOUND = {
  'tile-grass': 'cesped',
  'tile-crop': 'tierra',
  'tile-dirtplants': 'tierra',
  'tile-curbdirt-r': 'tierra',
  'tile-curbdirt-l': 'tierra',
  'tile-interior-floor-crop': 'tierra',
  'tile-asphalt': 'hormigon',
  'tile-path': 'hormigon',
  'tile-interior-floor': 'hormigon',
};
function terrainSoundFor(col, row) {
  const a = area();
  if (row < 0 || row >= a.rows || col < 0 || col >= a.cols) return null;
  return TERRAIN_SOUND[a.tileClass(a.grid[row][col])] || null;
}

let soundMuted = false;
try { soundMuted = localStorage.getItem('parcelaMuted') === '1'; } catch (e) { /* Safari privado, etc. */ }

function applyMuted() {
  Object.values(SFX).forEach(a => { a.muted = soundMuted; });
  Object.values(barkAudioCache).forEach(a => { a.muted = soundMuted; });
  if (footstepMasterGain) footstepMasterGain.gain.value = soundMuted ? 0 : FOOTSTEP_MASTER_LEVEL;
  document.querySelectorAll('.sound-toggle').forEach(b => {
    b.textContent = soundMuted ? '🔇' : '🔊';
    b.setAttribute('aria-label', soundMuted ? 'Activar sonido' : 'Silenciar');
  });
}

function toggleMuted() {
  soundMuted = !soundMuted;
  try { localStorage.setItem('parcelaMuted', soundMuted ? '1' : '0'); } catch (e) { /* ignorar */ }
  applyMuted();
}

function safePlay(audio) {
  const p = audio.play();
  if (p && p.catch) p.catch(() => { /* el navegador bloqueó el autoplay; se reintentará en el próximo gesto */ });
}

function startAmbient() {
  if (SFX.ambient.paused) safePlay(SFX.ambient);
  if (SFX.music.paused) fadeInMusic();
  if (!planeTimer) schedulePlanePass(PLANE_FIRST_DELAY_MS);
  preloadFootstepBuffers(); // que estén listos antes de que Alba dé el primer paso
}
function pauseAmbient() {
  SFX.ambient.pause();
  clearInterval(musicFadeTimer);
  SFX.music.pause();
  clearTimeout(planeTimer);
  planeTimer = null;
  SFX.plane.pause();
  planeShadowFlying = false;
}

// ---- Avión de fondo: la parcela está cerca de un aeropuerto, así que de
// vez en cuando pasa uno por encima. Cruza de derecha a izquierda, sonido
// incluido (panorama estéreo), y la sombra aparece justo cuando el sonido
// suena más fuerte (medido en el propio archivo: sube desde el segundo 0,
// se mantiene alto entre el 9 y el 20, y decae hasta el final en el 41).
// El siguiente sobrevuelo se programa 60s después de que termine el
// anterior (no 60s entre el inicio de uno y el otro). ----
const PLANE_GAP_AFTER_END_MS = 60000;
const PLANE_FIRST_DELAY_MS = 25000; // el primero tarda un poco en aparecer
const PLANE_SHADOW_DELAY_MS = 5000;  // desde que empieza a notarse el sonido
const PLANE_SHADOW_DURATION_S = 28;  // cruce lento, acorde con todo el tramo audible
let planeTimer = null;
let planeShadowFlying = false;

// Cruce fijo sobre EL MAPA (no sobre la pantalla ni sobre Alba): siempre
// el mismo tramo, de esquina a esquina, para que no "seleccione" dónde
// está el personaje ni se note raro si anda mientras pasa.
function flyPlaneShadowAcrossMap() {
  const shadow = document.getElementById('plane-shadow');
  if (!shadow) return;
  const ts = getTileSizePx();
  const fromX = (MAP_COLS + 3) * ts, fromY = -3 * ts;
  const toX = -5 * ts, toY = (MAP_ROWS + 3) * ts;
  const duration = PLANE_SHADOW_DURATION_S * 1000;
  const start = performance.now();
  const myFlight = planeShadowFlying = {}; // token: si se corta, otra bandera ocupa este sitio
  const step = now => {
    if (planeShadowFlying !== myFlight || currentArea !== 'main') { shadow.style.opacity = '0'; return; }
    const t = Math.min(1, (now - start) / duration);
    shadow.style.left = (fromX + (toX - fromX) * t) + 'px';
    shadow.style.top = (fromY + (toY - fromY) * t) + 'px';
    shadow.style.opacity = (t < 0.12 ? t / 0.12 : t > 0.88 ? (1 - t) / 0.12 : 1) * 0.85;
    if (t < 1) requestAnimationFrame(step);
    else { shadow.style.opacity = '0'; planeShadowFlying = false; }
  };
  requestAnimationFrame(step);
}

function schedulePlanePass(delayMs) {
  clearTimeout(planeTimer);
  planeTimer = setTimeout(triggerPlanePass, delayMs);
}

function triggerPlanePass() {
  if (!document.getElementById('scene-overworld').classList.contains('active')) return;
  routePlaneThroughPanner();
  SFX.plane.currentTime = 0;
  safePlay(SFX.plane);
  if (planePanner && audioCtx) {
    // Empieza sonando a la derecha y se desplaza a la izquierda justo
    // durante el tramo en que se ve (y se oye más fuerte) la sombra.
    const now = audioCtx.currentTime;
    const panStart = now + PLANE_SHADOW_DELAY_MS / 1000;
    planePanner.pan.cancelScheduledValues(now);
    planePanner.pan.setValueAtTime(1, now);
    planePanner.pan.setValueAtTime(1, panStart);
    planePanner.pan.linearRampToValueAtTime(-1, panStart + PLANE_SHADOW_DURATION_S);
  }
  setTimeout(() => {
    // Solo se ve al aire libre: si para entonces Alba ya está dentro de
    // la casa o el invernadero, no tendría sentido ver pasar la sombra
    // por el techo.
    if (currentArea === 'main') flyPlaneShadowAcrossMap();
  }, PLANE_SHADOW_DELAY_MS);
}
// El siguiente sobrevuelo se arma cuando el sonido termina de verdad
// (no si se corta al salir de la parcela; eso lo controla pauseAmbient).
SFX.plane.addEventListener('ended', () => schedulePlanePass(PLANE_GAP_AFTER_END_MS));

let footstepFoot = 0;             // alterna 0/1 en cada zancada (izquierda/derecha)
let currentFootstepNodes = null;  // { source, gain } del paso que suena ahora mismo

function playFootstep(category) {
  if (!category) { stopFootsteps(); return; }
  const ctx = getAudioCtx();
  ensureFootstepBuffer(category);
  const buffer = footstepBuffers[category];
  const master = ensureFootstepMasterGain();
  if (!ctx || !buffer || !master) return; // aún decodificando (solo el primerísimo paso): se salta éste sin más

  const now = ctx.currentTime;
  // Corta el paso anterior con una salida corta en vez de en seco: cortar
  // el <audio> a medio sonar (como se hacía antes) es lo que se oía como
  // un "tijeretazo", sobre todo en césped.
  if (currentFootstepNodes) {
    const prev = currentFootstepNodes;
    prev.gain.gain.cancelScheduledValues(now);
    prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
    prev.gain.gain.linearRampToValueAtTime(0.0001, now + 0.02);
    try { prev.source.stop(now + 0.025); } catch (e) { /* ya estaba parado */ }
  }

  footstepFoot = footstepFoot ? 0 : 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = 0.95 + Math.random() * 0.1; // pizca de variación, para que no suene siempre igual de clavado
  const panner = ctx.createStereoPanner();
  panner.pan.value = footstepFoot ? 0.32 : -0.32; // un pie por cada altavoz
  const gain = ctx.createGain();
  const target = FOOTSTEP_GAIN[category] * (footstepFoot ? 1 : 0.86); // un pie algo más flojo que el otro
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(target, now + 0.012); // ataque corto: sin clic al empezar tampoco
  source.connect(panner).connect(gain).connect(master);
  source.start(now);
  currentFootstepNodes = { source, gain };
}

function stopFootsteps() {
  if (!currentFootstepNodes) return;
  const ctx = getAudioCtx();
  const { source, gain } = currentFootstepNodes;
  if (ctx) {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.03);
    try { source.stop(now + 0.035); } catch (e) { /* ya estaba parado */ }
  }
  currentFootstepNodes = null;
}

// Ladridos: declarados aquí (antes del applyMuted() de arranque, unas
// líneas más abajo) para que exista barkAudioCache cuando se llame.
let currentBark = null;
const BARK_FILES = {
  perro_turka: 'game/sfx/perro_turka.mp3',
  perro_nuka: 'game/sfx/perro_nuka.mp3',
  perro_sando: 'game/sfx/perro_sando.mp3',
};
const barkAudioCache = {};

applyMuted();
document.querySelectorAll('.sound-toggle').forEach(b => b.addEventListener('click', toggleMuted));

// ---- Charla al estilo Animal Crossing: en vez de un pitido por letra,
// se deja sonando en bucle un clip de charla mientras se escribe el
// texto (con un tono/velocidad propios de cada personaje) y se pausa en
// las pausas largas (final de frase, coma...), para que la cadencia de
// la "voz" respire con la del texto en vez de sonar de corrido sin parar. ----
function hashToRange(str, min, max) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return min + (h % (max - min));
}

function setTalkVoice(speakerKey) {
  SFX.talk.playbackRate = hashToRange(speakerKey || 'default', 85, 128) / 100;
}

function startTalkAudio() {
  if (soundMuted) return;
  SFX.talk.currentTime = 0;
  safePlay(SFX.talk);
}
function resumeTalkAudio() { if (SFX.talk.paused) safePlay(SFX.talk); }
function pauseTalkAudio() { SFX.talk.pause(); }
function stopTalkAudio() { SFX.talk.pause(); }

// ---- Ladridos: Turka, Nuka y Sando tienen su propio sonido grabado, que
// suena una vez al abrir su diálogo en vez de la charla en bucle
// (currentBark/BARK_FILES/barkAudioCache están declarados más arriba). ----
function playBarkSound(id) {
  if (soundMuted || !BARK_FILES[id]) return;
  let a = barkAudioCache[id];
  if (!a) { a = new Audio(BARK_FILES[id]); barkAudioCache[id] = a; }
  a.muted = soundMuted;
  a.currentTime = 0;
  safePlay(a);
}

// ============================================================
// CONFIGURACIÓN EDITABLE — cambia aquí el contenido sin tocar el resto
// ============================================================

// RECUERDOS (se consiguen interactuando con objetos y con los perros; las
// personas NO dan recuerdos, dan pistas). Los que no tienen "sprite" solo
// muestran el brillo hasta que tengan arte propio.
const OBJECT_MEMORIES = [
  { id: 'madrono', col: 8, row: 9, sprite: 'madroño_title', tree: true, label: 'El madroño',
    text: 'El madroño de la parcela, justo donde más fruta cae al suelo.\n«¡Otra vez tengo la suela de la zapatilla pegajosa! Este suelo es un peligro en cuanto maduran los madroños.»' },
  // La mata de patata frente a Hermanita (el bicho NO se ve en el mapa: sale
  // en pantalla, sobre el cuadro de diálogo, mientras se habla). Al tocarla,
  // es Hermanita quien salta, se acerca y habla; luego vuelve a su sitio.
  { id: 'patata', col: 5, row: 20, label: 'Bicho de la patata',
    showcase: 'bicho_title', speaker: 'hermana',
    text: '¡Hermana mira cuántos bichos de la patata he atrapado! Corre, coge los tuyos y vamos al camino a aplastarlos. ¿Te acuerdas de todos los que aplastamos de pequeñas?' },
  { id: 'almendro', col: 9, row: 15, label: 'El almendro', showcase: 'almendra_title',
    text: 'El almendro de la parcela.\n«¡Almendras! Cogeré alguna para partirla con una piedra, ¡espero que no me siente muy mal!»' },
  { id: 'tomatera', col: 5, row: 24, label: 'La tomatera',
    text: 'Una tomatera del huerto de siempre.\n«Estos son, sin duda, los mejores tomates que he comido en mi vida — los mismos que plantaba mi abuelo. Ojalá poder volver a probarlos tal y como sabían entonces.»' },
];

// Personas de la familia: cada una da un recuerdo profundo Y una pista de
// regalo ("Pablo me dijo que estaba pensando regalarte..."). Repartidas
// por la parcela (no todas junto a la casa). Cuando Alba haya hablado con
// TODAS (incluida la del invernadero), la casa se abre.
const HUMAN_CHARACTERS = [
  { id: 'padre', col: 4, row: 7, sprite: 'padre_down', label: 'Papá',
    text: '¡Albita! Dame un abrazo, ¿has visto a Nukita? El otro día me la llevé al campo y agarró su primer conejo, lo tengo ahora en la barbacoa, ¡no se lo digas a tu tío Victor! Anda tráeme una cervecita del congelador. Por cierto, Pabolito está dentro de la casa, pero me ha dicho que no entres hasta que hables con todos, ¿es verdad que te va a regalar a Jeepito?',
    clue: 'Jeepito (un jeep de coche).', clueInline: true, wheelLabel: 'Jeepito' },
  { id: 'madre', col: 3, row: 13, sprite: 'madre_down', label: 'Mamá',
    text: '¡Alba! Por fin llegas, te tengo preparadas unas lentejas que te vas a chupar los dedos, las alitas hoy se las dejamos a Pabolito jejejeje. Por cierto, ¿he escuchado que te va a regalar el nuevo iPhone?',
    clue: 'El nuevo iPhone.', clueInline: true, wheelLabel: 'iPhone' },
  { id: 'abuela2', col: 9, row: 21, sprite: 'abuela2_down', label: 'Abuela Sofi',
    text: '¡Pero bueno qué sorpresa Alba! ¿Cómo están vuestras plantas? Si llego a saber que vienes te hubiese cortado un poquito del helecho que está bárbaro. Pasa pasa, Pablo está dentro, me había dicho que no te dijese nada de lo que te va a regalar por tu cumpleaños, pero yo creo que tiene algo que ver con un Mak? Mac? Uy no sé....',
    clue: 'Un Mac (ordenador).', clueInline: true, wheelLabel: 'Mac' },
  { id: 'abuelo2', col: 10, row: 4, sprite: 'abuelo2_down', label: 'Abuelo Andrés',
    text: '¿Qué pasa chata? (procede a cogerte la nariz) estaba leyendo un poco el periódico. ¿Qué tal te va por Granada? Por cierto, Pablo me ha dicho que te quería regalar una tarde de spa, ¿cuándo os vais?',
    clue: 'Una tarde de spa.', clueInline: true, wheelLabel: 'Spa' },
  { id: 'hermana', col: 5, row: 18, sprite: 'hermana_down', label: 'Hermanita',
    text: '¡Hermana! Como te echaba de menos, por fin llegas, papá se ha puesto ya con la barbacoa y Nuka no para de mordisquear piedras... ¡Pasa pasa, que luego jugamos al Voley! Por cierto, Pablo me ha contado algo de tu regalo, creo que te va a gustar, creo que era algo como de un viaje a... ¿Canadá?',
    clue: 'Un viaje a Canadá.', clueInline: true, wheelLabel: 'Canadá' },
  { id: 'abuela1', col: 7, row: 13, sprite: 'abuela1_down', label: 'Abuela Encarna',
    text: '¡Alba! Te tengo preparado el bocata de fuet. Tu padre me había dicho de hacerlo él, ¡pero sé que luego te pone poca cantidad! Por cierto, Pablo ha mencionado algo de que te iba a regalar ir a cenar en el restaurante de Jordi Cruz. ¿Es verdad?',
    clue: 'Cenar en el restaurante de Jordi Cruz.', clueInline: true, wheelLabel: 'Jordi Cruz' },
];

// El abuelo que murió: vive dentro del invernadero, junto a Sando. Su
// "pista" cuenta igual para desbloquear la casa.
const GREENHOUSE_ABUELO = {
  id: 'abuelo', label: 'Abuelo Manolo', sprite: 'abuelo1_down',
  text: '¡Albuchi! ¿Cómo va todo? Cómo me alegro de verte. Me pregunto quién te cogerá el dedo gordo del pie y lo estrujará tan fuerte como hacía yo... ¿Sigues comiendo tanto ajo como comía yo? ¡Sé que eso te viene de mí! Por cierto, he oído que Pablo te iba a regalar algo que tenía algo que ver con música... o un concierto.',
  clue: 'Un concierto.', clueInline: true, wheelLabel: 'Concierto',
  isKarolG: true,
};
const GREENHOUSE_SANDO = {
  id: 'sando', label: 'Sandete', sprite: 'sando_down', small: true, bark: 'perro_sando',
  text: 'Sando, tu compañero más fiel.\nYa no está, pero sigue aquí, jugando con el abuelo.',
};

// Perros de la familia: cuentan como recuerdo, sin pista de regalo. Cada
// uno tiene su propio ladrido grabado (bark) en vez de la charla genérica.
const DOG_MEMORIES = [
  { id: 'turka', col: 5, row: 7, sprite: 'turka_down', label: 'Turka', small: true, bark: 'perro_turka',
    text: 'Pensamiento de Alba: «No le quita ojo a las alitas de la barbacoa».\nTurka se acerca a ti para que la acaricies.' },
  { id: 'nuka', col: 2, row: 3, sprite: 'nuka_down', label: 'Nukita', small: true, bark: 'perro_nuka',
    text: 'Nuka: «¡Guau! ¡Guau!»\nAlba: «¡Nuka, deja de morder!»' },
];

const TOTAL_CLUE_GIVERS = HUMAN_CHARACTERS.length + 1; // +1 = el abuelo del invernadero

const MAP_COLS = 14;
const MAP_ROWS = 26;
const VIEW_COLS = 8;
const VIEW_ROWS = 9;
// La escalera ocupa dos casillas (6 y 7): las dos suben a la puerta
const HOUSE_DOOR_KEYS = ['6,3', '7,3'];
const GREENHOUSE_ROWS = [16];
// La entrada está en el césped de delante (col9), no en la columna del
// invernadero (col8): esa se queda bloqueada como el resto del tejado,
// para que Alba no pueda "subirse" a él antes de entrar.
const GREENHOUSE_DOOR_COL = 9;

// ============================================================
// NAVEGACIÓN ENTRE ESCENAS
// ============================================================

const IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const BACKDROP_SCENES = ['scene-menu', 'scene-settings', 'scene-credits', 'scene-reveal'];

function showScene(id) {
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  document.getElementById('app').classList.toggle('with-backdrop', BACKDROP_SCENES.includes(id));
  if (id === 'scene-overworld') { updateCamera(); }
  else { pauseAmbient(); stopFootsteps(); }
  // Música del menú/créditos, aparte de la de la parcela
  if (id === 'scene-menu' || id === 'scene-credits') { if (SFX.menuMusic.paused) safePlay(SFX.menuMusic); }
  else { SFX.menuMusic.pause(); }
  // La canción de Karol G solo suena en la revelación
  if (id !== 'scene-reveal') SFX.karolg.pause();
}

// El navegador bloquea el primer play() de audio hasta que hay un gesto
// real del usuario. Como la pantalla de carga pasa sola al menú (sin
// clic), la música del menú se quedaba callada hasta el primer clic en
// Configuración/Créditos. Con esto arranca ya en el primerísimo toque o
// tecla en cualquier sitio de la página, sea cual sea.
function unlockMenuMusicOnce() {
  const activeScene = document.querySelector('.scene.active');
  if (activeScene && (activeScene.id === 'scene-menu' || activeScene.id === 'scene-credits') && SFX.menuMusic.paused) {
    safePlay(SFX.menuMusic);
  }
}
document.addEventListener('pointerdown', unlockMenuMusicOnce, { once: true });
document.addEventListener('keydown', unlockMenuMusicOnce, { once: true });

// Jugar: fundido a negro, tarjeta de título y fundido de vuelta al mapa,
// como la pantalla de inicio de un juego (en vez de que todo aparezca de golpe).
let gameTransitioning = false;
let introShown = false;
let introOpen = false;
function showIntro() {
  if (introShown) return;
  introShown = true;
  const key = IS_TOUCH ? 'toca' : 'pulsa Espacio o';
  const lines = [
    IS_TOUCH
      ? 'Arrastra el joystick de abajo a la izquierda para moverte por la parcela.'
      : 'Muévete por la parcela con las flechas del teclado o con WASD.',
    `Acércate a las personas y ${key} "Hablar" para conversar con ellas.`,
    `Los perros y las cosas que brillan guardan recuerdos: ${key} "Interactuar".`,
    'Habla con toda la familia y la casa se abrirá.',
  ];
  document.getElementById('intro-list').innerHTML = lines.map(l => `<li>${l}</li>`).join('');
  inputLocked = true;
  introOpen = true;
  stopMoveLoop();
  document.getElementById('intro-panel').classList.add('on');
  document.getElementById('scene-overworld').classList.add('dialogue-open');
}
function closeIntro() {
  if (!introOpen) return;
  introOpen = false;
  document.getElementById('intro-panel').classList.remove('on');
  document.getElementById('scene-overworld').classList.remove('dialogue-open');
  inputLocked = false;
}
document.getElementById('intro-close').addEventListener('click', closeIntro);

function startGameTransition() {
  if (gameTransitioning) return;
  gameTransitioning = true;
  startAmbient(); // clic = gesto del usuario, momento seguro para arrancar el audio
  const fade = document.getElementById('screen-fade');
  fade.classList.add('on');
  setTimeout(() => {
    showScene('scene-overworld');
    fade.classList.add('card');
  }, 550);
  setTimeout(() => fade.classList.remove('card'), 2000);
  setTimeout(() => {
    fade.classList.remove('on');
    gameTransitioning = false;
    setTimeout(showIntro, 650);
  }, 2350);
}

document.querySelectorAll('[data-target]').forEach(el => {
  el.addEventListener('click', () => {
    if (el.dataset.target === 'scene-overworld') { startGameTransition(); return; }
    showScene(el.dataset.target);
  });
});

document.getElementById('overworld-menu-btn').addEventListener('click', () => { stopMoveLoop(); showScene('scene-menu'); });

// ============================================================
// ESCENA BOOT — barra de carga falsa (con tiempo para disfrutarla)
// ============================================================

function runBoot() {
  const fill = document.getElementById('loadbar-fill');
  const flavor = document.getElementById('boot-flavor');
  const messages = [
    'Plantando tomates...',
    'Recogiendo patatas...',
    'Aplastando bicho de la patata...',
    'Preparando la barbacoa...',
    'Llenando la piscina...',
    'Partiendo almendras...',
    'Regando el huerto...',
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
// CONFIGURACIÓN — sliders de broma que siempre vuelven a su sitio
// ============================================================

// 3 niveles por ajuste. `initial` es el nivel al que vuelve al soltar.
const SETTINGS = [
  {
    label: 'Topillos en el huerto', initial: 0,
    levels: [
      '0 — ni uno, el huerto respira tranquilo',
      '12 — alguno asoma la cabeza entre las patatas',
      '300 — han montado una comunidad de vecinos',
    ],
  },
  {
    label: 'Kg de carne para la barbacoa', initial: 1,
    levels: [
      '5 kg — un picoteo, casi un aperitivo',
      '30 kg — lo justo para que nadie pase hambre',
      '120 kg — hay que avisar a todo el pueblo',
    ],
  },
  {
    label: 'Nivel de sorpresa', initial: 2,
    levels: [
      '0% — cero sorpresa, qué aburrimiento',
      '50% — hay algo, pero no sabes qué',
      '100% — al máximo, como siempre',
    ],
  },
  {
    label: 'Modo seguro', initial: 2,
    levels: [
      'Desactivado — el rifle de perdigones está encima de la mesa (mala idea)',
      'Vigilado — el rifle está en el armario, pero con la llave puesta',
      'Activo — rifle de perdigones guardado bajo llave',
    ],
  },
];

function buildSettings() {
  const list = document.getElementById('settings-list');
  list.innerHTML = '';
  SETTINGS.forEach(setting => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'setting-label';
    label.textContent = setting.label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'setting-slider';
    slider.min = 0; slider.max = 2; slider.step = 'any';
    slider.setAttribute('aria-label', setting.label);
    const value = document.createElement('span');
    value.className = 'setting-value';

    const paint = () => {
      slider.style.setProperty('--fill', (slider.value / 2 * 100) + '%');
      value.textContent = setting.levels[Math.round(slider.value)];
    };
    let raf = null;
    const springBack = () => {
      cancelAnimationFrame(raf);
      const from = parseFloat(slider.value);
      const start = performance.now();
      const step = now => {
        const t = Math.min(1, (now - start) / 220);
        const eased = 1 - Math.pow(1 - t, 3);
        slider.value = from + (setting.initial - from) * eased;
        paint();
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    let dragging = false;
    slider.addEventListener('pointerdown', () => { dragging = true; cancelAnimationFrame(raf); });
    slider.addEventListener('input', paint);
    const release = () => { if (dragging) { dragging = false; springBack(); } };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    slider.addEventListener('keydown', () => cancelAnimationFrame(raf));
    slider.addEventListener('keyup', springBack);

    slider.value = setting.initial;
    paint();
    li.append(label, slider, value);
    list.appendChild(li);
  });
}

buildSettings();

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

  // Bordes: murito de piedra arriba, arizónica abajo (todo el lateral
  // inferior salvo la puerta), arizónica a la izquierda, valla de
  // delimitación a la derecha (un cuadrado más afuera que antes: la
  // columna donde iba la valla ahora es tierra-plantas).
  for (let c = 0; c < cols; c++) { g[0][c] = 'S'; g[rows - 1][c] = 'Q'; }
  for (let r = 0; r < rows; r++) { g[r][0] = 'X'; g[r][cols - 1] = 'Y'; }
  g[rows - 1][cols - 1] = 'Q';
  g[0][cols - 1] = 'S';
  // Bordillo (tierra + piedra) junto al camino, en el lado derecho del
  // todo (mirando hacia el camino, o sea con el bordillo a la izquierda)
  for (let r = 1; r < rows - 1; r++) g[r][cols - 2] = 'L';

  // Franjas de césped/tierra alrededor de la piscina y zona de cultivo
  for (let c = 3; c <= 8; c++) { g[7][c] = 'G'; g[8][c] = 'G'; }
  for (let c = 7; c <= 8; c++) { g[9][c] = 'G'; g[10][c] = 'G'; g[11][c] = 'G'; g[12][c] = 'G'; }
  for (let c = 1; c <= 9; c++) { g[13][c] = 'G'; g[17][c] = 'G'; g[18][c] = 'G'; }
  for (let c = 1; c <= 8; c++) for (let r = 19; r <= 24; r++) g[r][c] = 'C';
  // Tierra normal para delimitar el huerto por el lado que da a la arizónica
  for (let r = 19; r <= 24; r++) g[r][1] = 'D';
  // Franja reservada para la futura caseta de los perros, entre la
  // piscina y el invernadero, y césped junto al invernadero
  for (let c = 1; c <= 9; c++) g[14][c] = 'G';
  for (let r = 15; r <= 17; r++) g[r][2] = 'G';

  // Casa: cuerpo (la imagen real ya trae su propio porche y escalera
  // dibujados, así que el suelo debajo se deja en asfalto normal)
  // La colisión sigue el relieve: filas 1-3 bloqueadas en todo el ancho
  // (salvo las puertas); se puede pisar la fila 4: la base, la escalera y,
  // en los extremos sin porche (cols 4, 9, 10), el pie de la pared.
  for (let r = 1; r <= 2; r++) for (let c = 4; c <= 10; c++) g[r][c] = 'H';
  // (extremos sin porche: solo hasta la fila 4, si no parece que se sube a la casa)
  for (let c = 4; c <= 10; c++) g[3][c] = 'H';
  g[3][6] = 'O'; g[3][7] = 'O';   // puertas (una por cada escalón)

  // Caseta de barbacoa + alacena (una sola estructura, imagen real
  // encima); césped al otro lado, en vez del asfalto suelto que quedaba
  for (let r = 5; r <= 9; r++) for (let c = 1; c <= 2; c++) g[r][c] = 'K';
  g[10][2] = 'G'; g[11][2] = 'G'; g[12][2] = 'G';

  // Piscina: solo agua, sin bordillo, 6 cuadrados (2x3), un poco elevada
  // (la imagen de la piscina cubre las filas 11 y 12; la 10 queda de césped)
  for (let c = 4; c <= 6; c++) { g[10][c] = 'G'; g[11][c] = 'W'; }
  // Césped donde antes había piscina (fila de arriba y columna de la izquierda)
  for (let c = 3; c <= 6; c++) g[9][c] = 'G';
  g[10][3] = 'G'; g[11][3] = 'G'; g[12][3] = 'G';
  // Bordillo elevado justo bajo el agua (no se puede pisar desde ningún lado)
  for (let c = 4; c <= 6; c++) g[12][c] = 'B';

  // Invernadero (imagen real encima, reducido, bajado un bloque); solo se
  // entra por la fila central de su lado derecho, las dos esquinas quedan
  // cerradas (si no, parece que se accede "por arte de magia" por ellas).
  for (let r = 15; r <= 17; r++) for (let c = 3; c <= 8; c++) g[r][c] = 'I';
  [12, 13, 14, 15, 16, 17].forEach(r => { g[r][9] = 'G'; });

  // Camino largo (asfalto) a lo largo de todo el lateral derecho
  for (let r = 1; r <= 24; r++) { g[r][10] = 'P'; g[r][11] = 'P'; }
  // La casa invade la primera columna del camino, arriba del todo
  for (let r = 1; r <= 3; r++) g[r][10] = 'H';

  // Franja de tierra-plantas junto a la valla izquierda (se salta la caseta
  // y el hueco de césped justo debajo de ella)
  [1, 2, 3, 4, 10, 11, 12, 13, 14, 15, 16, 17, 18].forEach(r => { g[r][1] = 'D'; });
  // Bordillo (tierra + piedra) junto al camino, en el lado izquierdo,
  // en toda su longitud (con el bordillo mirando hacia el camino, a la
  // derecha de la tierra)
  for (let r = 7; r <= 24; r++) g[r][9] = 'R';

  // Entrada: verja metálica abierta de 2 casillas, abajo
  g[rows - 1][10] = 'Z';
  g[rows - 1][11] = 'Z';

  return g;
}

function mainTileClass(type) {
  switch (type) {
    case 'S': return 'tile-stonewall';
    case 'X': return 'tile-fence-hedge';
    case 'Q': return 'tile-fence-hedge-h';
    case 'Y': return 'tile-fence-vine';
    case 'Z': return 'tile-asphalt';   // bajo la verja: el mismo suelo que alrededor
    case 'H': return 'tile-asphalt';   // bajo la casa: el mismo suelo que alrededor
    case 'O': return 'tile-asphalt';
    case 'K': return 'tile-asphalt';   // bajo la caseta: idem
    case 'I': return 'tile-grass';   // bajo el invernadero: el mismo suelo que alrededor
    case 'W': return 'tile-grass';   // el suelo real lo dibuja la imagen de la piscina
    case 'B': return 'tile-grass';
    case 'P': return 'tile-path';
    case 'C': return 'tile-crop';
    case 'G': return 'tile-grass';
    case 'D': return 'tile-dirtplants';
    case 'R': return 'tile-curbdirt-r';
    case 'L': return 'tile-curbdirt-l';
    default: return 'tile-asphalt';
  }
}

const MAIN_OBSTACLES = new Set(['H', 'K', 'I', 'W', 'S', 'X', 'Y', 'B', 'Q', 'Z']); // Z = verja cerrada

// Aviso informativo: solo se ve cerca de la puerta mientras la casa está cerrada
function nearClosedDoor() {
  if (currentArea !== 'main' || houseUnlocked()) return false;
  return HOUSE_DOOR_KEYS.some(k => {
    const [dc, dr] = k.split(',').map(Number);
    return Math.abs(player.col - dc) + Math.abs(player.row - dr) <= 3;
  });
}

function houseUnlocked() { return collectedClues.length >= TOTAL_CLUE_GIVERS; }

function mainStructures() {
  return [
    // Verja de entrada a la parcela (cerrada, con colisión), en la fila inferior
    { src: 'game/cropped/puerta_title.png', aspect: 1200 / 498,
      colStart: 10, colEnd: 11, bottomRow: 26, matchWidth: true, scale: 1.3 },
    // Casa nueva (ancha, 7 casillas): las dos versiones comparten lienzo, así
    // que al abrirse no se mueve nada. Escaleras en las casillas (6,4) y (7,4), puertas en (6,3) y (7,3).
    { src: houseUnlocked() ? 'game/cropped/casa_abierta.png' : 'game/cropped/casa.png',
      aspect: 1408 / 996, colStart: 4, colEnd: 10, bottomRow: 5, matchWidth: true, scale: 1.0 },
    { src: 'game/cropped/invernadero_title.png', aspect: 1400 / 525,
      colStart: 3, colEnd: 8, bottomRow: 18, matchWidth: true, scale: 1.1 },
    { src: 'game/cropped/caseta_title.png', aspect: 1121 / 2338,
      colStart: 1, colEnd: 2, bottomRow: 10, matchWidth: true, scale: 1.25,
      smoke: { x: 24.5, y: 2 } }, // humo por la chimenea (posición en % de la imagen)
    // Piscina elevada (imagen real): ocupa las filas 11-12, cols 4-6
    { src: 'game/cropped/pool_title.png', aspect: 1200 / 548,
      colStart: 4, colEnd: 6, bottomRow: 13, matchWidth: true, scale: 1.3 },
    // Árboles decorativos (sin diálogo, solo ambientación —
    // el único árbol interactuable por ahora es el madroño).
    // Parras junto a la valla derecha, cada 2 bloques desde la entrada.
    ...([21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1].map(row => ({
      src: 'game/cropped/parra_title.png', aspect: 700 / 544,
      colStart: 12, colEnd: 12, bottomRow: row + 1, blockRow: row, matchWidth: true, scale: 1.66, sway: true,
    }))),
    // Almendros flanqueando la entrada del invernadero, un poco más
    // separados (uno un bloque más arriba, el otro un bloque más abajo).
    { src: 'game/cropped/almendro_title.png', aspect: 700 / 620,
      colStart: 9, colEnd: 9, bottomRow: 16, blockRow: 15, matchWidth: true, scale: 2.0, sway: true },
    { src: 'game/cropped/almendro_title.png', aspect: 700 / 620,
      colStart: 9, colEnd: 9, bottomRow: 19, blockRow: 18, matchWidth: true, scale: 2.0, sway: true },
    // Olivo en el lado izquierdo del campo de cultivo
    { src: 'game/cropped/olivo_title.png', aspect: 700 / 619,
      colStart: 1, colEnd: 1, bottomRow: 22, blockRow: 21, matchWidth: true, scale: 2.0, sway: true },
    // Plantas de cultivo en el huerto, repartidas con espacio de por
    // medio (tamaño acorde a una planta real, no a un árbol)
    { src: 'game/cropped/tomatera_title.png', aspect: 500 / 638, colStart: 3, colEnd: 3, bottomRow: 21, matchWidth: true, scale: 0.78, sway: true },
    { src: 'game/cropped/patatas_title.png', aspect: 500 / 633, colStart: 5, colEnd: 5, bottomRow: 21, matchWidth: true, scale: 0.48, sway: true },
    { src: 'game/cropped/esparraguera_title.png', aspect: 500 / 593, colStart: 7, colEnd: 7, bottomRow: 21, matchWidth: true, scale: 0.76, sway: true },
    { src: 'game/cropped/patatas_title.png', aspect: 500 / 633, colStart: 2, colEnd: 2, bottomRow: 23, matchWidth: true, scale: 0.48, sway: true },
    { src: 'game/cropped/esparraguera_title.png', aspect: 500 / 593, colStart: 4, colEnd: 4, bottomRow: 23, matchWidth: true, scale: 0.76, sway: true },
    { src: 'game/cropped/tomatera_title.png', aspect: 500 / 638, colStart: 6, colEnd: 6, bottomRow: 23, matchWidth: true, scale: 0.78, sway: true },
    { src: 'game/cropped/esparraguera_title.png', aspect: 500 / 593, colStart: 3, colEnd: 3, bottomRow: 25, matchWidth: true, scale: 0.76, sway: true },
    { src: 'game/cropped/tomatera_title.png', aspect: 500 / 638, colStart: 5, colEnd: 5, bottomRow: 25, matchWidth: true, scale: 0.78, sway: true },
    { src: 'game/cropped/patatas_title.png', aspect: 500 / 633, colStart: 7, colEnd: 7, bottomRow: 25, matchWidth: true, scale: 0.48, sway: true },
  ];
}

function mainObjects() {
  return [...OBJECT_MEMORIES, ...HUMAN_CHARACTERS, ...DOG_MEMORIES];
}

const MAIN_WARPS = {};
HOUSE_DOOR_KEYS.forEach(k => { MAIN_WARPS[k] = { area: 'house', enter: { col: 2, row: 3, facing: 'up' } }; });
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
    blocked: mainBlockedPoints,
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
      { ...GREENHOUSE_SANDO, col: 2, row: 1 },
    ],
    structures: () => [],
    warps: { '5,2': { area: 'main', enter: { col: 10, row: 16, facing: 'right' } } },
  },
};

let currentArea = 'main';
const player = { col: 11, row: 23, facing: 'up', walkFrame: 0 };
let currentTarget = null;
let pendingOverlayAction = null;

let collectedClues = []; // { text, isKarolG }
let houseWasUnlocked = false; // para no reconstruir la casa/parras salvo cuando de verdad cambie
const talkedTo = new Set();
const memoriesFound = new Set(); // recuerdos (objetos y perros), no personas
let inputLocked = false;      // durante escenas guiadas (p. ej. la de la patata)
let houseInterceptDone = false;    // Pablo ya salió a cortarle el paso a Alba
let houseInterceptRunning = false;
let pendingPabloHouseReveal = false; // dentro de casa: Pablo habla solo, sin que le hables tú

function area() { return AREAS[currentArea]; }

// El mapa ocupa toda la ventana. Apaisado (ordenador): ~8,5 casillas de
// alto; vertical (móvil): 8 casillas de ancho.
function computeTileSize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const isLandscape = vw > vh;
  const raw = isLandscape ? vh / 8.5 : vw / VIEW_COLS;
  const size = Math.floor(Math.min(raw, isLandscape ? 140 : 100));
  document.documentElement.style.setProperty('--tile-size', Math.max(36, size) + 'px');
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
  const container = document.getElementById('map-structures');
  fillStructures(container, getTileSizePx(), area().structures());
}

function fillStructures(container, tileSize, structures) {
  container.innerHTML = '';
  structures.forEach(s => {
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
    if (s.smoke) {
      const smoke = document.createElement('div');
      smoke.className = 'smoke';
      smoke.style.left = s.smoke.x + '%';
      smoke.style.top = s.smoke.y + '%';
      smoke.innerHTML = '<i></i><i></i><i></i>';
      el.appendChild(smoke);
    }
    container.appendChild(el);
  });
}

// Fondo del menú: el mapa real de la parcela (sin personajes) recorrido
// despacio de arriba abajo, al estilo del pueblo en Animal Crossing.
function buildMenuBackdrop() {
  const bg = document.getElementById('menu-bg');
  const a = AREAS.main;
  const vw = window.innerWidth, vh = window.innerHeight;
  const tileSize = Math.max(40, Math.ceil(vw / a.cols));
  const mapW = tileSize * a.cols, mapH = tileSize * a.rows;
  bg.innerHTML = '';
  const map = document.createElement('div');
  map.className = 'menu-bg-map';
  map.style.setProperty('--tile-size', tileSize + 'px');
  map.style.setProperty('--map-cols', a.cols);
  map.style.setProperty('--map-rows', a.rows);
  map.style.width = mapW + 'px';
  map.style.height = mapH + 'px';
  map.style.left = ((vw - mapW) / 2) + 'px';
  map.style.setProperty('--pan-dist', -Math.max(0, mapH - vh) + 'px');
  const grid = document.createElement('div');
  grid.className = 'map-grid';
  for (let r = 0; r < a.rows; r++) {
    for (let c = 0; c < a.cols; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile ' + a.tileClass(a.grid[r][c]);
      grid.appendChild(tile);
    }
  }
  const structs = document.createElement('div');
  structs.className = 'map-structures';
  map.appendChild(grid);
  map.appendChild(structs);
  bg.appendChild(map);
  fillStructures(structs, tileSize, a.structures());
}

function renderObjects() {
  const tileSize = getTileSizePx();
  const layer = document.getElementById('map-objects');
  layer.innerHTML = '';
  area().objects().forEach(obj => {
    const el = document.createElement('div');
    el.className = 'map-object';
    el.dataset.id = obj.id;
    if (obj.clue) el.classList.add('person');
    else if (isMemoryObj(obj) && !memoriesFound.has(obj.id)) el.classList.add('memory');
    el.style.left = obj.col * tileSize + 'px';
    el.style.top = obj.row * tileSize + 'px';

    if (obj.sprite) {
      el.classList.add('character');
      if (obj.item) el.classList.add('item');
      if (obj.tree) el.classList.add('tree');
      else {
        if (obj.small) el.classList.add('small');
        // respiración suave, desfasada para que no se muevan todos a la vez
        el.style.animationDuration = (2.9 + Math.random() * 1.2).toFixed(2) + 's';
        el.style.animationDelay = (-Math.random() * 4).toFixed(2) + 's';
        // sombra en el suelo (personas y animales; los árboles no la llevan)
        const shadow = document.createElement('div');
        shadow.className = 'sprite-shadow';
        el.appendChild(shadow);
      }
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

// Al subir la escalera de la casa (abierta) la cámara se acerca, como si
// acompañara a Alba al entrar
function stairsZoomActive() {
  if (currentArea !== 'main' || !houseUnlocked()) return false;
  return HOUSE_DOOR_KEYS.some(k => {
    const [dc, dr] = k.split(',').map(Number);
    return player.col === dc && (player.row === dr || player.row === dr + 1);
  });
}

let stairsZoomOn = false;
function updateCamera() {
  const a = area();
  const tileSize = getTileSizePx();
  const viewport = document.querySelector('.map-viewport');
  const camera = document.getElementById('map-camera');
  const viewportRect = viewport.getBoundingClientRect();
  const zoomed = stairsZoomActive();
  const s = zoomed ? 1.4 : 1;
  const mapW = a.cols * tileSize * s;
  const mapH = a.rows * tileSize * s;
  const px = (player.col * tileSize + tileSize / 2) * s;
  const py = (player.row * tileSize + tileSize / 2) * s;
  let camX = px - viewportRect.width / 2;
  let camY = py - viewportRect.height / 2;
  // Si el mapa cabe entero en pantalla, se centra en vez de pegarse al borde
  camX = mapW <= viewportRect.width ? (mapW - viewportRect.width) / 2 : Math.max(0, Math.min(camX, mapW - viewportRect.width));
  camY = mapH <= viewportRect.height ? (mapH - viewportRect.height) / 2 : Math.max(0, Math.min(camY, mapH - viewportRect.height));
  if (zoomed !== stairsZoomOn) {
    stairsZoomOn = zoomed;
    camera.classList.add('zoom');
    setTimeout(() => { if (!cameraZoomed && stairsZoomOn === zoomed) camera.classList.remove('zoom'); }, 600);
  }
  camera.style.transform = `translate(${-camX}px, ${-camY}px) scale(${s})`;
}

function renderPlayerPosition() {
  const tileSize = getTileSizePx();
  const sprite = document.getElementById('player-sprite');
  sprite.style.left = player.col * tileSize + 'px';
  sprite.style.top = player.row * tileSize + 'px';
  updateCamera();
}

// Precarga las imágenes del jugador (quieto y 2 fotogramas de andar por
// dirección) para que al girar no se vea un fotograma equivocado.
['down', 'up', 'left'].forEach(f => {
  ['', '_walk1', '_walk2'].forEach(s => { new Image().src = `game/cropped/player_${f}${s}.png`; });
});

// Precarga el resto de imágenes reales del juego (personajes, edificios,
// árboles con colisión, lo que aparece sobre el cuadro de diálogo...).
// Sin esto, la primera vez que hacía falta una imagen (p. ej. la casa
// abierta, la primera vez que se desbloqueaba) se desmontaba la anterior
// antes de que la nueva terminase de cargar, y la casa "desaparecía" un
// instante. Se listan a mano porque muchas se referencian con plantillas
// (`${obj.sprite}`), no como texto literal que se pueda buscar solo.
[
  'abuela1_down', 'abuela2_down', 'abuelo1_down', 'abuelo2_down', 'hermana_down',
  'madre_down', 'nuka_down', 'pablo_down', 'padre_down', 'sando_down', 'turka_down',
  'madroño_title', 'almendra_title', 'bicho_title',
  'casa', 'casa_abierta', 'caseta_title', 'invernadero_title', 'pool_title', 'puerta_title',
  'parra_title', 'almendro_title', 'olivo_title', 'tomatera_title', 'patatas_title', 'esparraguera_title',
].forEach(name => { new Image().src = `game/cropped/${name}.png`; });

// walkFrame: 0 = quieta; 1/2 = fotogramas de andar (un pie por delante y luego el otro)
function renderPlayerSprite() {
  const img = document.getElementById('player-img');
  const sprite = document.getElementById('player-sprite');
  const base = player.facing === 'right' ? 'left' : player.facing;
  const suffix = player.walkFrame ? `_walk${player.walkFrame}` : '';
  img.src = `game/cropped/player_${base}${suffix}.png`;
  sprite.classList.toggle('mirror', player.facing === 'right');
}

let walkTimer = null;
let stepMs = 300;
function stepWalkFrame() {
  player.walkFrame = player.walkFrame === 1 ? 2 : 1;
  renderPlayerSprite();
  clearTimeout(walkTimer);
  walkTimer = setTimeout(() => { player.walkFrame = 0; renderPlayerSprite(); }, stepMs + 120);
}

function isBlocked(col, row) {
  const a = area();
  if (col < 0 || row < 0 || col >= a.cols || row >= a.rows) return true;
  if (a.obstacles.has(a.grid[row][col])) return true;
  if (a.blocked && a.blocked().some(p => p.col === col && p.row === row)) return true;
  return a.objects().some(o => o.col === col && o.row === row);
}

// Puntos bloqueados por árboles/plantas decorativas (parras, almendros,
// olivo) que no son "objects" interactuables pero sí deben colisionar;
// se derivan de mainStructures() para no duplicar coordenadas.
function mainBlockedPoints() {
  return mainStructures()
    .filter(s => s.blockRow != null)
    .map(s => ({ col: s.colStart, row: s.blockRow }));
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
  if (currentArea === 'main' && HOUSE_DOOR_KEYS.includes(key)) {
    if (!houseUnlocked()) {
      // Puerta cerrada: no se entra, pero sin cuadro que cerrar (el aviso
      // informativo aparece solo, junto a la puerta; ver updateProximity)
      stopFootsteps();
      renderPlayerPosition();
      updateProximity();
      return;
    }
    if (!houseInterceptDone) {
      // Primera vez con todas las pistas: Pablo sale a cortarle el paso
      // antes de dejarla entrar (ver runHouseIntercept). Ella no llega a
      // pisar la puerta; el resto de la entrada la lleva ese guion.
      stopFootsteps();
      renderPlayerPosition();
      runHouseIntercept(targetCol, targetRow);
      return;
    }
  }

  if (!isBlocked(targetCol, targetRow)) {
    player.col = targetCol;
    player.row = targetRow;
    stepWalkFrame();
    playFootstep(terrainSoundFor(player.col, player.row));
    const sprite = document.getElementById('player-sprite');
    sprite.classList.remove('stepping');
    void sprite.offsetWidth;
    sprite.classList.add('stepping');

    const warp = area().warps[key];
    if (warp) {
      renderPlayerPosition();
      // Deja ver a Alba llegar del todo a la puerta (con sus pasos)
      // antes de fundir a negro, en vez de fundir a mitad del paso.
      inputLocked = true;
      setTimeout(() => fadeToArea(warp.area, warp.enter), stepMs + 90);
      return;
    }
  } else {
    stopFootsteps();
  }
  renderPlayerPosition();
  updateProximity();
}

function fadeToArea(name, enter) {
  const fade = document.getElementById('scene-fade');
  // Sin movimiento mientras dura todo el fundido (salida, cambio y entrada)
  inputLocked = true;
  stopMoveLoop();
  fade.classList.add('active');
  setTimeout(() => {
    enterArea(name, enter);
    setTimeout(() => fade.classList.remove('active'), 200);
    setTimeout(() => { inputLocked = false; }, 200 + 450); // 0,4s del fundido de vuelta
  }, 420);
}

function enterArea(name, enter) {
  currentArea = name;
  player.col = enter.col;
  player.row = enter.row;
  player.facing = enter.facing;
  // (el propio bucle de flyPlaneShadowAcrossMap comprueba currentArea en
  // cada fotograma y se esconde solo si Alba entra en un interior)
  // El cambio de sitio ocurre en negro: sin deslizar cámara ni jugador
  const camera = document.getElementById('map-camera');
  const sprite = document.getElementById('player-sprite');
  camera.style.transition = 'none';
  sprite.style.transition = 'none';
  buildMapDOM();
  renderObjects();
  renderPlayerSprite();
  renderPlayerPosition();
  updateProximity();
  void camera.offsetWidth;
  camera.style.transition = '';
  sprite.style.transition = '';

  // Pablo la esperaba ahí dentro: habla él solo, sin que Alba tenga que
  // acercarse ni pulsar nada.
  if (name === 'house' && pendingPabloHouseReveal) {
    pendingPabloHouseReveal = false;
    const pabloObj = AREAS.house.objects().find(o => o.pabloTrigger);
    if (pabloObj) setTimeout(() => handleTalk(pabloObj), 550);
  }
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
    hint.textContent = nearClosedDoor()
      ? `La casa está cerrada. Habla primero con toda la familia (${collectedClues.length}/${TOTAL_CLUE_GIVERS}).`
      : '';
    return;
  }
  const el = document.querySelector(`.map-object[data-id="${found.id}"]`);
  if (el) el.classList.add('near');
  btn.style.display = 'inline-block';
  // Personas: "Hablar". Objetos y perros: "Interactuar".
  const verb = isMemoryObj(found) ? 'Interactuar' : 'Hablar';
  btn.textContent = verb;
  const what = isMemoryObj(found) ? 'Hay algo aquí' : 'Hay alguien aquí';
  hint.textContent = IS_TOUCH ? `${what}. Toca "${verb}".` : `${what}. Pulsa Espacio o "${verb}".`;
}

// ---- Cuadro de diálogo: escritura letra a letra + zoom de cámara ----
const TYPE_START_DELAY = 450; // deja ver el saltito y el zoom antes de hablar
let typing = null; // { full, i, timer }
let dialoguePages = [];
let dialoguePageIndex = 0;
let dialogueCloseLabel = 'Cerrar';

// Trocea un texto largo en "páginas" cortas (por frases) para que el cuadro
// se quede bajo y rectangular, como en Animal Crossing.
function paginateDialogue(text) {
  const maxChars = window.innerWidth < 600 ? 110 : 190;
  const pages = [];
  let cur = '';
  text.split(/\n+/).forEach(par => {
    par = par.trim();
    if (!par) return;
    const sentences = par.match(/[^.!?]+[.!?]+["”»]?\s*|[^.!?]+$/g) || [par];
    sentences.forEach((s, idx) => {
      s = s.trim();
      const sep = idx === 0 ? '\n' : ' ';
      if (cur && (cur + sep + s).length > maxChars) { pages.push(cur); cur = s; }
      else cur = cur ? cur + sep + s : s;
    });
  });
  if (cur) pages.push(cur);
  return pages.length ? pages : [text];
}

function showDialoguePage() {
  const last = dialoguePageIndex >= dialoguePages.length - 1;
  document.getElementById('interaction-close').textContent = last ? dialogueCloseLabel : 'Siguiente ▶';
  typeText(dialoguePages[dialoguePageIndex]);
}

function renderTyped(full, i) {
  const el = document.getElementById('interaction-text');
  el.innerHTML = '';
  // La parte aún sin escribir se mantiene (invisible) para que el cuadro no cambie de tamaño
  const shown = document.createElement('span');
  shown.textContent = full.slice(0, i);
  const rest = document.createElement('span');
  rest.textContent = full.slice(i);
  rest.style.visibility = 'hidden';
  el.append(shown, rest);
}

function setDialogueDone(done) {
  document.getElementById('dialogue-box').classList.toggle('typing', !done);
}

function finishTyping() {
  if (!typing) return;
  clearTimeout(typing.timer);
  renderTyped(typing.full, typing.full.length);
  typing = null;
  setDialogueDone(true);
  stopTalkAudio();
}

function typeText(full) {
  clearTimeout(typing && typing.timer);
  typing = { full, i: 0, timer: null };
  setDialogueDone(false);
  renderTyped(full, 0);
  // Los perros ladran (una vez, ver openOverlay) en vez de "hablar" en bucle
  if (!currentBark) startTalkAudio();
  const tick = () => {
    if (!typing) return;
    if (!currentBark) resumeTalkAudio(); // por si la pausa anterior era de coma/punto
    typing.i++;
    renderTyped(full, typing.i);
    if (typing.i >= full.length) { typing = null; setDialogueDone(true); stopTalkAudio(); return; }
    const ch = full[typing.i - 1];
    const pause = '.!?'.includes(ch) ? 260 : (ch === ',' || ch === ':') ? 120 : ch === '\n' ? 200 : 24;
    if (!currentBark && pause > 60) pauseTalkAudio(); // respira en los puntos, comas y saltos de línea
    typing.timer = setTimeout(tick, pause);
  };
  typing.timer = setTimeout(tick, TYPE_START_DELAY);
}

let cameraZoomed = false;
function zoomCameraTo(obj) {
  const camera = document.getElementById('map-camera');
  const vp = document.querySelector('.map-viewport').getBoundingClientRect();
  const a = area();
  const ts = getTileSizePx();
  const s = 1.45;
  const cx = (obj.col + 0.5) * ts;
  const cy = (obj.row + 0.15) * ts;
  let tx = vp.width / 2 - cx * s;
  let ty = vp.height * 0.36 - cy * s;
  const mapW = a.cols * ts * s, mapH = a.rows * ts * s;
  tx = mapW <= vp.width ? (vp.width - mapW) / 2 : Math.max(vp.width - mapW, Math.min(0, tx));
  ty = mapH <= vp.height ? (vp.height - mapH) / 2 : Math.max(vp.height - mapH, Math.min(0, ty));
  // que el personaje quede siempre por encima del cuadro de diálogo
  const maxY = vp.height - 230;
  if (cy * s + ty > maxY) ty = maxY - cy * s;
  camera.classList.add('zoom');
  camera.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  cameraZoomed = true;
}

function zoomCameraOut() {
  if (!cameraZoomed) return;
  cameraZoomed = false;
  const camera = document.getElementById('map-camera');
  updateCamera();
  setTimeout(() => { if (!cameraZoomed) camera.classList.remove('zoom'); }, 550);
}

function openOverlay(text, closeLabel, name, showcase, bark) {
  stopMoveLoop();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  currentBark = bark || null;
  if (bark) playBarkSound(bark); else setTalkVoice(name);
  document.getElementById('interaction-name').textContent = name || '';
  const showEl = document.getElementById('dialogue-showcase');
  showEl.classList.toggle('on', !!showcase);
  if (showcase) document.getElementById('dialogue-showcase-img').src = `game/cropped/${showcase}.png`;
  dialogueCloseLabel = closeLabel || 'Cerrar';
  dialoguePages = paginateDialogue(text);
  dialoguePageIndex = 0;
  document.getElementById('interaction-overlay').classList.add('active');
  document.getElementById('scene-overworld').classList.add('dialogue-open');
  showDialoguePage();
}

function closeOverlay() {
  if (typing) { clearTimeout(typing.timer); typing = null; }
  stopTalkAudio();
  document.getElementById('interaction-overlay').classList.remove('active');
  document.getElementById('dialogue-showcase').classList.remove('on');
  document.getElementById('scene-overworld').classList.remove('dialogue-open');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  zoomCameraOut();
}

function overlayActive() {
  return document.getElementById('interaction-overlay').classList.contains('active');
}

// Enter/Espacio/clic: primero completa el texto, luego cierra
function advanceDialogue() {
  if (typing) { finishTyping(); return; }
  document.getElementById('interaction-close').click();
}

document.getElementById('interaction-close').addEventListener('click', () => {
  if (typing) { finishTyping(); return; }
  if (dialoguePageIndex < dialoguePages.length - 1) { dialoguePageIndex++; showDialoguePage(); return; }
  closeOverlay();
  if (pendingOverlayAction) {
    const fn = pendingOverlayAction;
    pendingOverlayAction = null;
    fn();
  }
});

document.getElementById('dialogue-box').addEventListener('click', (e) => {
  if (typing && e.target.id !== 'interaction-close') finishTyping();
});

function handleTalk(obj) {
  if (obj.pabloTrigger) {
    pendingOverlayAction = () => {
      prepareWheelFromCollectedClues();
      openWheelOverlay();
    };
    reactToTalk(obj);
    openOverlay('Veo que todos en tu familia te han dado pistas de cosas que te iba a regalar... jummm, mira que les dije que guardasen el secreto. Bueno, como se han ido todos de la lengua, tendrá que ser a suertes. Menos mal que he traído esta ruleta jejejeje, venga, tira.', 'Tirar la ruleta ▶', obj.label);
    return;
  }

  const isNew = !talkedTo.has(obj.id);
  talkedTo.add(obj.id);

  // Recuerdo (objeto o perro): cuenta para "Recuerdos" y deja de brillar
  if (isMemoryObj(obj)) markMemoryFound(obj);

  if (obj.speaker) { runSpeakerScene(obj); return; }

  let text = obj.text;
  if (obj.clue) {
    // Persona: cuenta para "Pistas", no para "Recuerdos"
    if (isNew) collectedClues.push({ text: obj.clue, isKarolG: !!obj.isKarolG, label: obj.wheelLabel || obj.label });
    if (!obj.clueInline) text += `\n\n"${obj.clue}"`;
    document.getElementById('hud-clues').textContent = collectedClues.length;
    // Solo se reconstruyen los ~25 elementos del mapa (casa, parras,
    // invernadero...) cuando de verdad cambia algo visible (la casa se
    // abre), no en cada conversación — evita tirones y el parpadeo que
    // daba al desmontar la imagen de la casa antes de que cargase la nueva.
    const unlockedNow = houseUnlocked();
    if (currentArea === 'main' && unlockedNow !== houseWasUnlocked) renderStructures();
    houseWasUnlocked = unlockedNow;
  }
  reactToTalk(obj);
  openOverlay(text, 'Cerrar', obj.label, obj.showcase, obj.bark);
}

function isMemoryObj(obj) { return !obj.clue && !obj.pabloTrigger; }

function markMemoryFound(obj) {
  memoriesFound.add(obj.id);
  document.getElementById('hud-memories').textContent = memoriesFound.size;
  const el = document.querySelector(`.map-object[data-id="${obj.id}"]`);
  if (el) el.classList.remove('memory');
}

// ---- Escena guiada: otro personaje habla por el objeto (el bicho de la
// patata -> Hermanita salta, se acerca, habla y luego vuelve a su sitio) ----
const STEP_WALK_MS = 300;

function findPath(from, to, isFree) {
  const key = (c, r) => `${c},${r}`;
  const prev = new Map([[key(from.col, from.row), null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur.col === to.col && cur.row === to.row) break;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
      const n = { col: cur.col + dc, row: cur.row + dr };
      const k = key(n.col, n.row);
      if (prev.has(k) || !isFree(n.col, n.row)) return;
      prev.set(k, cur);
      queue.push(n);
    });
  }
  const tk = key(to.col, to.row);
  if (!prev.has(tk)) return null;
  const path = [];
  for (let n = to; n; n = prev.get(key(n.col, n.row))) path.unshift(n);
  return path.slice(1);
}

function walkElement(el, path, done) {
  const ts = getTileSizePx();
  el.classList.add('walking');
  let i = 0;
  const next = () => {
    if (i >= path.length) { stopFootsteps(); done(); return; }
    el.style.left = path[i].col * ts + 'px';
    el.style.top = path[i].row * ts + 'px';
    playFootstep(terrainSoundFor(path[i].col, path[i].row));
    i++;
    setTimeout(next, STEP_WALK_MS);
  };
  next();
}

function hopElement(el) {
  if (!el || el.classList.contains('tree')) return;
  // Si se retriggerea antes de que termine el salto anterior, quitar la
  // clase a medias cancela esa animación sin disparar 'animationend', y
  // el listener { once:true } de esa vez se quedaría colgado para
  // siempre. Se guarda y se retira a mano para no acumularlos.
  if (el._hopEndHandler) el.removeEventListener('animationend', el._hopEndHandler);
  el.classList.remove('hop');
  void el.offsetWidth;
  el.classList.add('hop');
  el._hopEndHandler = () => el.classList.remove('hop');
  el.addEventListener('animationend', el._hopEndHandler, { once: true });
}

function runSpeakerScene(obj) {
  const speaker = HUMAN_CHARACTERS.find(h => h.id === obj.speaker);
  const speakerEl = document.querySelector(`.map-object[data-id="${speaker.id}"]`);
  const origin = { col: speaker.col, row: speaker.row };
  inputLocked = true;
  stopMoveLoop();
  document.getElementById('action-btn').style.display = 'none';
  // Alba mira hacia el bicho; este y Hermanita saltan de alegría
  const dx = obj.col - player.col, dy = obj.row - player.row;
  player.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  renderPlayerSprite();
  hopElement(document.querySelector(`.map-object[data-id="${obj.id}"]`));
  hopElement(speakerEl);

  setTimeout(() => {
    // casilla libre junto a Alba, la más cercana a Hermanita
    const free = (c, r) => (c === origin.col && r === origin.row) ||
      (!isBlocked(c, r) && !(c === player.col && r === player.row));
    const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dc, dr]) => ({ col: player.col + dc, row: player.row + dr }))
      .filter(p => free(p.col, p.row))
      .map(p => ({ p, path: findPath(origin, p, free) }))
      .filter(x => x.path)
      .sort((a, b) => a.path.length - b.path.length);
    const best = spots[0];
    const goal = best ? best.p : origin;
    const arrive = () => {
      speakerEl.classList.remove('walking');
      inputLocked = false;
      zoomCameraTo(goal);
      pendingOverlayAction = () => returnSpeakerHome(speakerEl, goal, origin, free);
      openOverlay(obj.text, 'Cerrar', speaker.label, obj.showcase);
    };
    if (best && best.path.length) walkElement(speakerEl, best.path, arrive);
    else arrive();
  }, 750);
}

function returnSpeakerHome(el, from, origin, free) {
  const path = findPath(from, origin, free) || [];
  if (!path.length) return;
  walkElement(el, path, () => {
    el.classList.remove('walking');
    el.style.left = origin.col * getTileSizePx() + 'px';
    el.style.top = origin.row * getTileSizePx() + 'px';
  });
}

// Pablo temporal para la escena de fuera: no forma parte de mainObjects()
// (no debe bloquear ni contar como recuerdo), solo un actor de attrezzo
// para este momento concreto.
function spawnTempPablo(col, row) {
  const layer = document.getElementById('map-objects');
  const el = document.createElement('div');
  el.className = 'map-object character';
  el.dataset.id = 'pablo-temp';
  const ts = getTileSizePx();
  el.style.left = col * ts + 'px';
  el.style.top = row * ts + 'px';
  el.style.animationDuration = '3.1s';
  const shadow = document.createElement('div');
  shadow.className = 'sprite-shadow';
  el.appendChild(shadow);
  const img = document.createElement('img');
  img.src = 'game/cropped/pablo_down.png';
  img.alt = '';
  el.appendChild(img);
  layer.appendChild(el);
  return el;
}

// Pablo corta el paso justo antes de la puerta, una vez que Alba ya tiene
// todas las pistas: ella retrocede un bloque del susto, él ocupa el
// bloque que ella deja (delante, entre Alba y la puerta) y habla. Al
// cerrar su diálogo, entran los dos juntos a la casa.
function runHouseIntercept(doorCol, doorRow) {
  if (houseInterceptDone || houseInterceptRunning) return;
  houseInterceptRunning = true;
  inputLocked = true;
  stopMoveLoop();
  document.getElementById('action-btn').style.display = 'none';
  const stepCol = player.col, stepRow = player.row; // donde estaba Alba, justo bajo la puerta

  player.facing = 'up';
  renderPlayerSprite();
  hopElement(document.getElementById('player-sprite'));

  setTimeout(() => {
    // Alba retrocede un bloque, sin dejar de mirar hacia la puerta
    player.row = stepRow + 1;
    stepWalkFrame();
    playFootstep(terrainSoundFor(player.col, player.row));
    renderPlayerPosition();

    setTimeout(() => {
      const pablo = spawnTempPablo(stepCol, stepRow);
      hopElement(pablo);

      setTimeout(() => {
        houseInterceptDone = true;
        houseInterceptRunning = false;
        pendingPabloHouseReveal = true;
        pendingOverlayAction = () => fadeToArea('house', { col: 2, row: 3, facing: 'up' });
        zoomCameraTo({ col: stepCol, row: stepRow });
        openOverlay('¡Albuchi! Por fin llegas, ¡corre que tengo que darte tu regalo!', 'Vale ▶', 'Pablo');
      }, 650);
    }, 380);
  }, 600);
}

// Alba mira al personaje, este da un saltito de alegría y la cámara se acerca
function reactToTalk(obj) {
  const dx = obj.col - player.col, dy = obj.row - player.row;
  player.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  renderPlayerSprite();
  hopElement(document.querySelector(`.map-object[data-id="${obj.id}"]`));
  zoomCameraTo(obj);
}

function handleInteract() {
  if (inputLocked || !currentTarget) return;
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
let running = false; // Shift mantenido: Alba corre

// Si ya está andando, cambia de velocidad sin cortar el movimiento (se
// salta la guarda de startMoveLoop de "misma dirección" a propósito).
function restartMoveLoopSpeed() {
  if (!currentDir) return;
  const dir = currentDir;
  currentDir = null;
  startMoveLoop(dir, dir, running ? RUN_REPEAT_MS : undefined);
}

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('scene-overworld').classList.contains('active')) return;
  if (introOpen) {
    if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); if (!e.repeat) closeIntro(); }
    return;
  }
  if (inputLocked) { e.preventDefault(); return; }
  if (overlayActive()) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) advanceDialogue(); }
    else if (e.key === 'Escape') { e.preventDefault(); dialoguePageIndex = dialoguePages.length - 1; finishTyping(); document.getElementById('interaction-close').click(); }
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) handleInteract(); return; }
  if (e.key === 'Shift') { if (!running) { running = true; restartMoveLoopSpeed(); } return; }
  const dir = KEY_DIR[e.key];
  if (!dir) return;
  e.preventDefault();
  if (e.repeat) return;
  if (!heldDirs.includes(dir)) heldDirs.push(dir);
  startMoveLoop(dir, dir, running ? RUN_REPEAT_MS : undefined);
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') { running = false; restartMoveLoopSpeed(); return; }
  const dir = KEY_DIR[e.key];
  if (!dir) return;
  const idx = heldDirs.indexOf(dir);
  if (idx !== -1) heldDirs.splice(idx, 1);
  if (currentDir === dir) {
    const next = heldDirs[heldDirs.length - 1];
    if (next) startMoveLoop(next, next, running ? RUN_REPEAT_MS : undefined);
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
const MOVE_REPEAT_MS = 300;
const RUN_REPEAT_MS = 150; // con Shift mantenido, Alba corre al doble de velocidad
const JOYSTICK_MOVE_REPEAT_MS = 360;
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
  if (inputLocked) return;
  if (dir === 'up') tryMove(0, -1, facing);
  else if (dir === 'down') tryMove(0, 1, facing);
  else if (dir === 'left') tryMove(-1, 0, facing);
  else if (dir === 'right') tryMove(1, 0, facing);
}
function startMoveLoop(dir, facing, repeatMs) {
  if (inputLocked || currentDir === dir) return;
  currentDir = dir;
  clearInterval(moveInterval);
  // el deslizamiento dura lo que un paso, para caminar fluido y sin tirones
  stepMs = repeatMs || MOVE_REPEAT_MS;
  document.documentElement.style.setProperty('--step-ms', stepMs + 'ms');
  moveForDir(dir, facing);
  // si ese primer paso disparó un fundido (puerta), no arrancar el bucle
  if (inputLocked) { currentDir = null; return; }
  moveInterval = setInterval(() => moveForDir(dir, facing), repeatMs || MOVE_REPEAT_MS);
}
function stopMoveLoop() {
  clearInterval(moveInterval);
  moveInterval = null;
  currentDir = null;
  stopFootsteps();
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
    OBJECT_MEMORIES.length + DOG_MEMORIES.length + 1; // +1 = Sando (invernadero)
  document.getElementById('hud-clues-total').textContent = TOTAL_CLUE_GIVERS;
}

function resetOverworld() {
  currentArea = 'main';
  player.col = 11; player.row = 23; player.facing = 'up';
  collectedClues = [];
  talkedTo.clear();
  memoriesFound.clear();
  houseWasUnlocked = false;
  houseInterceptDone = false;
  houseInterceptRunning = false;
  pendingPabloHouseReveal = false;
  closeWheelOverlay();
  document.getElementById('hud-memories').textContent = '0';
  document.getElementById('hud-clues').textContent = '0';
  buildMapDOM();
  renderObjects();
  renderPlayerSprite();
  renderPlayerPosition();
  updateProximity();
}

// Sin agrupar, un simple giro de móvil dispara varios "resize" seguidos
// (barra de direcciones, teclado...) y cada uno reconstruía la rejilla
// entera (300+ casillas) — se nota como un tirón justo al girar.
let overworldResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(overworldResizeTimer);
  overworldResizeTimer = setTimeout(() => {
    computeTileSize();
    buildMapDOM();
    renderObjects();
    renderPlayerPosition();
  }, 150);
});

// ============================================================
// RULETA — overlay dentro de la parcela, se gira arrastrando (ratón o
// dedo), con pistas de verdad en cada gajo en vez de números. Sigue
// trucada para caer siempre en "Concierto" (Karol G), pero el giro en
// sí es un arrastre real con inercia, no un botón.
// ============================================================

let WHEEL_ITEMS = [];       // [{ label, isKarolG }]
let WINNING_PRIZE_INDEX = 0;
let wheelSpun = false;
let wheelAngle = 0;         // rotación acumulada (sin acotar a 360)
let wheelSliceAngle = 60;
let wheelDragging = false;
let wheelDragStartAngle = 0;
let wheelDragStartRotation = 0;
let wheelLastAngle = 0;
let wheelLastMoveTime = 0;
let wheelVelocity = 0;      // deg/ms, del último tramo de arrastre
let wheelAnimFrame = null;

function prepareWheelFromCollectedClues() {
  // Un gajo por pista (con nombre corto), evitando duplicados de label
  const seen = new Set();
  WHEEL_ITEMS = collectedClues.filter(c => {
    if (seen.has(c.label)) return false;
    seen.add(c.label);
    return true;
  }).map(c => ({ label: c.label, isKarolG: !!c.isKarolG }));
  WINNING_PRIZE_INDEX = WHEEL_ITEMS.findIndex(p => p.isKarolG);
  if (WINNING_PRIZE_INDEX === -1) WINNING_PRIZE_INDEX = 0; // salvaguarda, no debería pasar
  wheelSpun = false;
  wheelAngle = 0;
  wheelSliceAngle = 360 / WHEEL_ITEMS.length;
}

function openWheelOverlay() {
  inputLocked = true;
  stopMoveLoop();
  // El disco debe estar visible (display:flex) antes de medirlo para
  // colocar las etiquetas, si no getBoundingClientRect() da 0 y quedan
  // todas amontonadas en el centro.
  document.getElementById('wheel-overlay').classList.add('active');
  buildWheelDisc();
}

function closeWheelOverlay() {
  document.getElementById('wheel-overlay').classList.remove('active');
}

function buildWheelDisc() {
  const disc = document.getElementById('wheel-disc');
  const pegsLayer = document.getElementById('wheel-pegs');
  disc.innerHTML = '';
  pegsLayer.innerHTML = '';
  disc.style.transform = 'rotate(0deg)';
  const n = WHEEL_ITEMS.length;
  const colors = ['#f4c26b', '#bfe8d9', '#f2a6b8', '#dcb96a', '#a9d8b4', '#e8c9e0', '#f6d98c'];

  const gradientParts = WHEEL_ITEMS.map((_, i) => {
    const start = i * wheelSliceAngle, end = start + wheelSliceAngle;
    return `${colors[i % colors.length]} ${start}deg ${end}deg`;
  });
  disc.style.background = `conic-gradient(${gradientParts.join(', ')})`;

  const labelRadius = disc.getBoundingClientRect().width * 0.32;
  WHEEL_ITEMS.forEach((item, i) => {
    const label = document.createElement('div');
    label.className = 'wheel-slice-label';
    const angle = wheelSliceAngle * i + wheelSliceAngle / 2;
    const rad = (angle * Math.PI) / 180;
    label.style.left = `calc(50% + ${labelRadius * Math.sin(rad)}px)`;
    label.style.top = `calc(50% + ${-labelRadius * Math.cos(rad)}px)`;
    label.textContent = item.label;
    disc.appendChild(label);

    const peg = document.createElement('div');
    peg.className = 'wheel-peg';
    peg.style.transform = `rotate(${i * wheelSliceAngle}deg)`;
    pegsLayer.appendChild(peg);
  });
}

function wheelPointerAngle(clientX, clientY) {
  const rect = document.getElementById('wheel-disc').getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  return Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
}

function applyWheelAngle(angle) {
  document.getElementById('wheel-disc').style.transform = `rotate(${angle}deg)`;
}

// Un "palo" pasa por la flecha fija cada vez que el ángulo cruza un
// múltiplo del tamaño de gajo: un tic visual + un chasquido de sonido.
function checkWheelPegTicks(prevAngle, newAngle) {
  if (Math.floor(prevAngle / wheelSliceAngle) === Math.floor(newAngle / wheelSliceAngle)) return;
  const pointer = document.getElementById('wheel-pointer');
  pointer.classList.remove('tick');
  void pointer.offsetWidth;
  pointer.classList.add('tick');
  playWheelTick();
}

function playWheelTick() {
  if (soundMuted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1500, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) { /* sin Web Audio: sin chasquido, sin más */ }
}

function onWheelPointerDown(e) {
  if (wheelSpun || !document.getElementById('wheel-overlay').classList.contains('active')) return;
  cancelAnimationFrame(wheelAnimFrame);
  wheelDragging = true;
  document.getElementById('wheel-table').classList.remove('spinning');
  document.getElementById('wheel-disc').setPointerCapture(e.pointerId);
  wheelDragStartAngle = wheelPointerAngle(e.clientX, e.clientY);
  wheelDragStartRotation = wheelAngle;
  wheelLastAngle = wheelAngle;
  wheelLastMoveTime = performance.now();
  wheelVelocity = 0;
}

function onWheelPointerMove(e) {
  if (!wheelDragging) return;
  const now = performance.now();
  const pointerAngle = wheelPointerAngle(e.clientX, e.clientY);
  let delta = pointerAngle - wheelDragStartAngle;
  const prevAngle = wheelAngle;
  wheelAngle = wheelDragStartRotation + delta;
  const dt = Math.max(1, now - wheelLastMoveTime);
  wheelVelocity = (wheelAngle - wheelLastAngle) / dt;
  wheelLastAngle = wheelAngle;
  wheelLastMoveTime = now;
  applyWheelAngle(wheelAngle);
  checkWheelPegTicks(prevAngle, wheelAngle);
}

function onWheelPointerUp() {
  if (!wheelDragging) return;
  wheelDragging = false;
  resolveWheelSpin();
}

function resolveWheelSpin() {
  if (wheelSpun) return;
  wheelSpun = true;
  document.getElementById('wheel-table').classList.add('spinning');

  const targetCenter = WINNING_PRIZE_INDEX * wheelSliceAngle + wheelSliceAngle / 2;
  const targetMod = ((-targetCenter) % 360 + 360) % 360;
  const currentMod = ((wheelAngle % 360) + 360) % 360;
  const direction = wheelVelocity < 0 ? -1 : 1;
  const extraTurns = 4;
  let finalAngle;
  if (direction === 1) {
    const diff = ((targetMod - currentMod) % 360 + 360) % 360;
    finalAngle = wheelAngle + diff + extraTurns * 360;
  } else {
    const diffBack = ((currentMod - targetMod) % 360 + 360) % 360;
    finalAngle = wheelAngle - diffBack - extraTurns * 360;
  }

  const fromAngle = wheelAngle;
  const total = finalAngle - fromAngle;
  const duration = 3200;
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 5); // deceleración larga, como si frenase por rozamiento
    const prevAngle = wheelAngle;
    wheelAngle = fromAngle + total * eased;
    applyWheelAngle(wheelAngle);
    checkWheelPegTicks(prevAngle, wheelAngle);
    if (t < 1) {
      wheelAnimFrame = requestAnimationFrame(step);
    } else {
      setTimeout(() => {
        launchConfetti();
        closeWheelOverlay();
        showScene('scene-reveal');
        playKarolGSong();
      }, 500);
    }
  };
  wheelAnimFrame = requestAnimationFrame(step);
}

const wheelDiscEl = document.getElementById('wheel-disc');
wheelDiscEl.addEventListener('pointerdown', onWheelPointerDown);
wheelDiscEl.addEventListener('pointermove', onWheelPointerMove);
wheelDiscEl.addEventListener('pointerup', onWheelPointerUp);
wheelDiscEl.addEventListener('pointercancel', onWheelPointerUp);

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

document.getElementById('reveal-credits').addEventListener('click', () => {
  showScene('scene-credits');
});

document.getElementById('reveal-replay').addEventListener('click', () => {
  resetOverworld();
  showScene('scene-menu');
});

// ============================================================
// ARRANQUE
// ============================================================

runBoot();
initOverworld();
buildMenuBackdrop();
{
  let menuBgTimer;
  window.addEventListener('resize', () => {
    clearTimeout(menuBgTimer);
    menuBgTimer = setTimeout(buildMenuBackdrop, 200);
  });
}
