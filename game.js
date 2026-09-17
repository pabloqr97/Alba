// ============================================================
// CONFIGURACIÓN EDITABLE — cambia aquí el texto sin tocar el resto
// ============================================================

// Diapositivas del "modo historia". Son PLACEHOLDERS en varios puntos:
// edítalas con hitos reales si quieres afinar el recorrido antes de
// mandar la web (fechas, viajes, anécdotas concretas, etc).
const STORY_SLIDES = [
  { avatar: '🌱', text: '27 de septiembre de 1998. Llega al mundo una crack.\n(Nivel 1 desbloqueado: Vivir)' },
  { avatar: '🏝️', text: 'Con el tiempo funda su propia isla: Candeleda.\nDecide pronto que los vecinos sobran — mejor decorar sola, a su gusto.' },
  { avatar: '🛋️', text: 'Descubre su don: decorar cada rincón hasta que quede perfecto.\n(Dato real: hoy es interiorista. Algunas empiezan jugando... ella se lo tomó en serio.)' },
  { avatar: '🐾', text: 'Durante años tuvo a su lado a su compañero más fiel: Sando.\nYa no está, pero sigue siendo parte de su isla y de su corazón.' },
  { avatar: '💛', text: 'Un día un tal Pabolito se coló en su isla...\ny ya no hubo manera de echarlo.' },
  { avatar: '🎉', text: 'Hoy, 27 de septiembre, sube de nivel: ¡28 años desbloqueados!\nToca celebrarlo por todo lo alto.' },
];

// Regalos que aparecen en la ruleta (el último SIEMPRE gana, ver spinWheel)
const WHEEL_PRIZES = [
  '🧦 Calcetines a juego con tu casa',
  '🍓 Fresas infinitas para la granja',
  '🛋️ Vale para redecorar el salón (otra vez)',
  '🎬 Noche de cine en casa',
  '🐾 Un peluche que se parece a Sando',
  '🏝️ Un vecino nuevo para Candeleda',
  '🎫 Entradas para ver a Karol G',
];
const WINNING_PRIZE_INDEX = WHEEL_PRIZES.length - 1;

const MINIGAME_TARGET = 10;
const MINIGAME_SECONDS = 20;

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

// ============================================================
// ESCENA BOOT — barra de carga falsa
// ============================================================

function runBoot() {
  const fill = document.getElementById('loadbar-fill');
  const flavor = document.getElementById('boot-flavor');
  const messages = [
    'Cargando cariño...',
    'Plantando fresas...',
    'Espantando vecinos de la isla...',
    'Puliendo los muebles de Candeleda...',
    'Afinando la voz de Karol G...',
    'Casi está...',
  ];
  let pct = 0;
  let msgIndex = 0;
  flavor.textContent = messages[0];

  const interval = setInterval(() => {
    pct += Math.random() * 18 + 7;
    if (pct >= 100) {
      pct = 100;
      clearInterval(interval);
      setTimeout(() => showScene('scene-menu'), 500);
    }
    fill.style.width = pct + '%';
    const nextIndex = Math.min(messages.length - 1, Math.floor((pct / 100) * messages.length));
    if (nextIndex !== msgIndex) {
      msgIndex = nextIndex;
      flavor.textContent = messages[msgIndex];
    }
  }, 380);
}

// ============================================================
// ESCENA HISTORIA — diálogos estilo Animal Crossing
// ============================================================

let storyIndex = 0;

function renderStorySlide() {
  const slide = STORY_SLIDES[storyIndex];
  document.querySelector('#scene-story-intro .dialogue-avatar').textContent = slide.avatar;
  document.getElementById('story-text').innerHTML = slide.text.replace(/\n/g, '<br>');
  document.getElementById('story-progress').textContent = `${storyIndex + 1} / ${STORY_SLIDES.length}`;
  const btn = document.getElementById('story-next');
  btn.textContent = storyIndex === STORY_SLIDES.length - 1 ? 'Empezar la misión ▶' : 'Continuar ▶';
}

document.getElementById('story-next').addEventListener('click', () => {
  if (storyIndex < STORY_SLIDES.length - 1) {
    storyIndex++;
    renderStorySlide();
  } else {
    storyIndex = 0;
    showScene('scene-minigame');
  }
});

// Re-render slide 1 whenever we enter the story scene fresh from the menu
document.querySelectorAll('.menu-item[data-target="scene-story-intro"]').forEach(btn => {
  btn.addEventListener('click', () => {
    storyIndex = 0;
    renderStorySlide();
  });
});

// ============================================================
// ESCENA MINIJUEGO — cosecha rápida de fresas
// ============================================================

let mgCount = 0;
let mgTimer = MINIGAME_SECONDS;
let mgInterval = null;
let mgSpawnTimeout = null;
let mgActive = false;

document.getElementById('mg-target').textContent = MINIGAME_TARGET;
document.getElementById('mg-total').textContent = MINIGAME_TARGET;
document.getElementById('mg-timer').textContent = MINIGAME_SECONDS;

function spawnCrop() {
  if (!mgActive) return;
  const field = document.getElementById('minigame-field');
  const crop = document.createElement('button');
  crop.className = 'crop';
  crop.textContent = '🍓';
  crop.style.left = (Math.random() * 88 + 6) + '%';
  crop.style.top = (Math.random() * 80 + 8) + '%';
  crop.addEventListener('click', () => {
    if (!mgActive) return;
    mgCount++;
    document.getElementById('mg-count').textContent = mgCount;
    crop.remove();
    if (mgCount >= MINIGAME_TARGET) {
      finishMinigame(true);
    }
  });
  field.appendChild(crop);

  // La fresa desaparece sola si no se recoge a tiempo
  setTimeout(() => crop.remove(), 1800);

  mgSpawnTimeout = setTimeout(spawnCrop, 550);
}

function finishMinigame(success) {
  mgActive = false;
  clearInterval(mgInterval);
  clearTimeout(mgSpawnTimeout);
  document.getElementById('minigame-field').innerHTML = '';
  document.getElementById('minigame-start').style.display = 'none';

  if (success) {
    setTimeout(() => showScene('scene-chest'), 400);
  } else {
    document.getElementById('minigame-retry').style.display = 'inline-block';
  }
}

function startMinigame() {
  mgCount = 0;
  mgTimer = MINIGAME_SECONDS;
  mgActive = true;
  document.getElementById('mg-count').textContent = '0';
  document.getElementById('mg-timer').textContent = mgTimer;
  document.getElementById('minigame-field').innerHTML = '';
  document.getElementById('minigame-start').style.display = 'none';
  document.getElementById('minigame-retry').style.display = 'none';

  spawnCrop();
  mgInterval = setInterval(() => {
    mgTimer--;
    document.getElementById('mg-timer').textContent = mgTimer;
    if (mgTimer <= 0) {
      finishMinigame(mgCount >= MINIGAME_TARGET);
    }
  }, 1000);
}

document.getElementById('minigame-start').addEventListener('click', startMinigame);
document.getElementById('minigame-retry').addEventListener('click', startMinigame);

// ============================================================
// ESCENA COFRE
// ============================================================

document.getElementById('chest').addEventListener('click', function () {
  if (this.classList.contains('opened')) return;
  this.classList.add('opened');
  this.textContent = '🎁';
  document.getElementById('chest-text').textContent = '¡Vaya! Dentro hay una ruleta de posibles regalos...';
  setTimeout(() => {
    showScene('scene-wheel');
    if (!wheelBuilt) buildWheel();
  }, 1400);
});

// ============================================================
// ESCENA RULETA
// ============================================================

let wheelBuilt = false;
let wheelSpun = false;

function buildWheel() {
  const wheel = document.getElementById('wheel');
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

  wheelBuilt = true;
}

function spinWheel() {
  if (wheelSpun) return;
  wheelSpun = true;
  const wheel = document.getElementById('wheel');
  const n = WHEEL_PRIZES.length;
  const sliceAngle = 360 / n;

  // El puntero apunta hacia arriba (0deg). Calculamos el giro final
  // para que el centro de la porción ganadora quede justo ahí,
  // añadiendo varias vueltas completas para dar sensación de suspense.
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
  // Reset de estado para poder volver a jugar desde el menú
  wheelSpun = false;
  document.getElementById('wheel').style.transform = 'rotate(0deg)';
  document.getElementById('wheel-spin').disabled = false;
  document.getElementById('minigame-start').style.display = 'inline-block';
  document.getElementById('chest').classList.remove('opened');
  document.getElementById('chest').textContent = '📦';
  document.getElementById('chest-text').textContent = '¡Cofre desbloqueado! Tócalo para abrirlo.';
});

// ============================================================
// ARRANQUE
// ============================================================

runBoot();
