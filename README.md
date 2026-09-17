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

Al pulsar "Jugar" aparece una parcela (inspirada en la de los abuelos de Alba — entrada por la derecha, camino largo con parras, campo de cultivo, invernadero, piscina, césped con caseta y barbacoa, casa centrada con paso por detrás; estilizada, no una recreación literal por satélite) que se recorre con las flechas del teclado o el joystick táctil (mantener pulsado y arrastrar). Una cámara sigue al personaje en vez de mostrar todo el mapa a la vez, al estilo Pokémon/Zelda. Hay dos tipos de cosas con las que interactuar, acercándote y pulsando el botón contextual:

- **10 recuerdos** (objetos/personas): al hablar con ellos desbloquean un texto. Cuentan para el contador "💭 X/X". El abuelo y Sando se ven como personajes en pixel-art (no emoji), con animación de reposo.
- **5 cofres normales + 1 cofre dorado**: cada cofre normal da un "regalo" (casi todos de coña). El cofre dorado se activa solo cuando ya se han abierto 2 cofres normales, y al abrirlo lanza la ruleta con todo lo recogido hasta ese momento.

**Truco importante:** el *segundo* cofre normal que se abra (el que sea, en el orden que Alba elija) da siempre las entradas de Karol G — así el regalo queda garantizado aunque no llegue a abrir los 5. La ruleta final está siempre trucada para caer en esas entradas.

**Sin spoilers:** Karol G no se menciona en ningún sitio antes de que Alba abra el cofre que le toque — ni en la carga, ni en Configuración, ni en Créditos. Si añades contenido nuevo (recuerdos, ajustes de broma...), no la nombres ahí para no chafar la sorpresa.

## Qué editar antes de mandarla

Todo el contenido está arriba de todo en `game.js`:

- **`MEMORIES`** — los 10 recuerdos. `abuelo`, `sando` y `mortero` ya tienen contenido real; el resto (`limonero`, `barbacoa`, `invernadero`, `piscina`, `pozo`, `gallinero`, `mecedora`) están marcados con `(Recuerdo por escribir)` — sustituye el `text` por la anécdota real cuando la tengas. También puedes mover su `col`/`row` si quieres reordenar el mapa (ver `buildGrid()` para entender el plano). El total del HUD se calcula solo (`MEMORIES.length`), así que añadir o quitar recuerdos no rompe nada.
- **`CHESTS` / `DECOY_PRIZES` / `KAROL_G_PRIZE`** — los regalos falsos de los cofres normales. Puedes cambiar los textos/emoji libremente; no hace falta tocar la lógica de "el segundo cofre siempre es Karol G" (`resolveChestPrize()`).
- **`GOLDEN_CHEST`** — posición del cofre final. No cambies su comportamiento salvo que sepas lo que haces.

## Sobre el pixel art y los personajes

El jugador, el abuelo y Sando son sprites propios dibujados en CSS con `box-shadow` (técnica de "pixel art sin imágenes"), definidos en `game.js` como `PLAYER_MATRIX`/`ABUELO_MATRIX`/`SANDO_MATRIX` + su paleta de colores — cambia los colores del objeto `_PALETTE` correspondiente si quieres otro look. El resto de objetos de la parcela usa emoji + colores planos. Todo esto es deliberado para no depender de assets con derechos de Animal Crossing/Hay Day. Si quieres afinar el parecido con la parcela real (forma de la casa, algún elemento concreto), lo mejor es describírselo a Claude o pasarle fotos de referencia en una conversación nueva.

## Publicar en GitHub Pages

```bash
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

Luego, en GitHub: Settings → Pages → Deploy from branch → `main` / `root`. La web quedará en `https://<usuario>.github.io/<repo>/`.
