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

- `index.html` — todas las "escenas" del juego (boot, menú, configuración, créditos, **la parcela** explorable, ruleta, revelación).
- `styles.css` — estilos (paleta pastel Animal Crossing + tonos trigo Hay Day, mapa de rejilla, sprite del personaje).
- `game.js` — lógica y contenido editable.

## Cómo funciona el juego

Al pulsar "Jugar" aparece una parcela (inspirada en la de los abuelos de Alba, estilizada — no es una recreación literal por satélite) que se recorre con las flechas del teclado o el D-pad táctil. Hay dos tipos de cosas con las que interactuar, acercándote y pulsando el botón contextual:

- **8 recuerdos** (objetos/personas): al hablar con ellos desbloquean un texto. Cuentan para el contador "💭 X/8".
- **5 cofres normales + 1 cofre dorado**: cada cofre normal da un "regalo" (casi todos de coña). El cofre dorado se activa solo cuando ya se han abierto 2 cofres normales, y al abrirlo lanza la ruleta con todo lo recogido hasta ese momento.

**Truco importante:** el *segundo* cofre normal que se abra (el que sea, en el orden que Alba elija) da siempre las entradas de Karol G — así el regalo queda garantizado aunque no llegue a abrir los 5. La ruleta final está siempre trucada para caer en esas entradas.

## Qué editar antes de mandarla

Todo el contenido está arriba de todo en `game.js`:

- **`MEMORIES`** — los 8 recuerdos. `abuelo-sando` y `mortero` ya tienen contenido real; el resto (`pozo`, `limonero`, `gallinero`, `mecedora`, `tendedero`, `parra`) están marcados con `(Recuerdo por escribir)` — sustituye el `text` por la anécdota real cuando la tengas. También puedes mover su `col`/`row` si quieres reordenar el mapa (ver `buildGrid()` para entender el plano).
- **`CHESTS` / `DECOY_PRIZES` / `KAROL_G_PRIZE`** — los regalos falsos de los cofres normales. Puedes cambiar los textos/emoji libremente; no hace falta tocar la lógica de "el segundo cofre siempre es Karol G" (`resolveChestPrize()`).
- **`GOLDEN_CHEST`** — posición del cofre final. No cambies su comportamiento salvo que sepas lo que haces.

## Sobre el pixel art

El personaje es un sprite propio dibujado en CSS (no imágenes), y el resto de la parcela usa emoji + colores planos — deliberado para no depender de assets con derechos de Animal Crossing/Hay Day. Si quieres afinar el parecido con la parcela real (forma de la casa, algún elemento concreto), lo mejor es describírselo a Claude o pasarle fotos de referencia en una conversación nueva.

## Publicar en GitHub Pages

```bash
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

Luego, en GitHub: Settings → Pages → Deploy from branch → `main` / `root`. La web quedará en `https://<usuario>.github.io/<repo>/`.
