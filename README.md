# La Isla de Candeleda — Edición Cumpleaños

Web-juego de cumpleaños para Alba, mezclando Animal Crossing + Hay Day, que termina revelando un regalo sorpresa (entradas para Karol G).

## Cómo verla

Es HTML/CSS/JS puro, sin build ni dependencias. Dos formas de verla:

1. Abrir `index.html` directamente en el navegador.
2. O levantar un servidor local rápido (recomendado para evitar restricciones de `file://`):
   ```bash
   python3 -m http.server 8765
   ```
   y entrar a `http://localhost:8765`.

## Estructura

- `index.html` — todas las "escenas" del juego (boot, menú, configuración, créditos, historia, minijuego, cofre, ruleta, revelación).
- `styles.css` — estilos (paleta pastel Animal Crossing + tonos trigo Hay Day).
- `game.js` — lógica y contenido editable.

## Qué editar antes de mandarla

Todo el contenido de texto está arriba de todo en `game.js`, en `STORY_SLIDES` y `WHEEL_PRIZES`. Ahora mismo `STORY_SLIDES` tiene el recorrido de su historia con lo que Pablo contó (nacimiento, isla Candeleda, su vena de interiorista, Sando, cómo se conocieron, cumpleaños). Si quieres afinar fechas o anécdotas concretas, edita solo ese array — no hace falta tocar nada más del código.

El regalo ganador de la ruleta es siempre el último elemento de `WHEEL_PRIZES` (`WINNING_PRIZE_INDEX`), así que si añades/quitas regalos falsos, deja las entradas de Karol G en último lugar del array.

## Publicar en GitHub Pages

```bash
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

Luego, en GitHub: Settings → Pages → Deploy from branch → `main` / `root`. La web quedará en `https://<usuario>.github.io/<repo>/`.
