# CollisionLab

Laboratorio visual interactivo para explorar algoritmos de colisión 2D.

## Versión Web (HTML5 Canvas)
Abre directamente **[index.html](file:///c:/Users/danie/Desktop/CollisionLab/index.html)** en cualquier navegador web moderno (doble clic o mediante cualquier servidor estático local).

- `index.html`: estructura de la página y barra de herramientas.
- `style.css`: diseño adaptativo, tipografías y centrado automático con letterboxing.
- `app.js`: lógica matemática pura, renderizado Canvas 2D en alta resolución y control de las 6 escenas.

## Versión Processing 4 (Java)
Abre esta carpeta en Processing 4, modo Java, y ejecuta **[CollisionLab.pde](file:///c:/Users/danie/Desktop/CollisionLab/CollisionLab.pde)**.

- `CollisionLab.pde`: arranque, diseño común y controles globales.
- `Escenas.pde`: seis escenas interactivas.
- `Colisiones.pde`: pruebas matemáticas puras.
- `UI.pde`: formas, proyecciones y ayudas de dibujo.

## Controles e Interacción
- **Cursor / Touch**: interactúa con las formas en el área grande de cada escena.
- **`1`–`6`** o **`←` / `→`** (o clic en pestañas inferiores): cambia de escena.
- **`H`**: muestra/oculta hitboxes y límites geométricos.
- **`X`**: activa/desactiva rayos auxiliares, sombras y proyecciones.
- **`R`**: reinicia la escena activa.
- **`F`**: alterna pantalla completa.
- **`TAB`**: alterna modos en CCD (Continuo vs Discreto) y Broad Phase (Rejilla vs Fuerza Bruta).
- **`Q` / `E`** o **Rueda del ratón**: rotar figuras en SAT, escalar radios o ajustar objetos.
