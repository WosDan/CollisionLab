/**
 * CollisionLab - Laboratorio visual de colisiones en 2D
 * Port web nativo en HTML5 Canvas
 */

// Paleta de colores oficial
const FONDO = '#0D1420';
const PANEL = '#151F2E';
const LIENZO = '#111B29';
const BORDE = '#2A394C';
const BLANCO = '#F1F3F5';
const SUAVE = '#AEBAC8';
const CIAN = '#48D6C8';
const ROJO = '#F07170';
const AMBAR = '#FFC66D';
const AZUL = '#5D91F2';
const VERDE = '#8ED6A4';
const LILA = '#B89BEA';

// Dimensiones virtuales de referencia (16:9)
const CW = 1280;
const CH = 720;

// Variables globales de escala y proyección
let escalaVista = 1;
let desfaseX = 0;
let desfaseY = 0;
let mouseCanvasX = CW / 2;
let mouseCanvasY = CH / 2;
let isPointerDown = false;

// Flags de depuración y estado global
let mostrarLimites = false;
let mostrarRayos = false;
let activa = 0;

// ==========================================
// 1. ALGORITMOS MATEMÁTICOS DE COLISIÓN PURA
// ==========================================

class Caja {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
}

class SATResultado {
  constructor(colision, eje, solape) {
    this.colision = colision;
    this.eje = eje;
    this.solape = solape;
  }
}

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy() { return new Vector2(this.x, this.y); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.magSq()); }
  normalize() {
    const m = this.mag();
    if (m > 0.000001) { this.x /= m; this.y /= m; }
    return this;
  }
  mult(n) { this.x *= n; this.y *= n; return this; }
}

// Círculo vs Círculo (compara distancia al cuadrado para evitar raíz cuadrada)
function circleVsCircle(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const s = r1 + r2;
  return (dx * dx + dy * dy) < (s * s);
}

// AABB: solape estricto en X y en Y
function aabbVsAabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// SAT (Separating Axis Theorem) para polígonos convexos
function satPolygons(a, b) {
  let mejor = Infinity;
  let mejorEje = new Vector2(1, 0);

  for (let grupo = 0; grupo < 2; grupo++) {
    const p = (grupo === 0) ? a : b;
    for (let i = 0; i < p.length; i++) {
      const u = p[i];
      const v = p[(i + 1) % p.length];
      const eje = new Vector2(-(v.y - u.y), v.x - u.x);
      if (eje.magSq() < 0.000001) continue;
      eje.normalize();

      let amin = Infinity, amax = -Infinity;
      let bmin = Infinity, bmax = -Infinity;

      for (let k = 0; k < a.length; k++) {
        const q = a[k].dot(eje);
        amin = Math.min(amin, q);
        amax = Math.max(amax, q);
      }
      for (let k = 0; k < b.length; k++) {
        const q = b[k].dot(eje);
        bmin = Math.min(bmin, q);
        bmax = Math.max(bmax, q);
      }

      const sol = Math.min(amax, bmax) - Math.max(amin, bmin);
      if (sol <= 0) {
        return new SATResultado(false, eje, 0);
      }
      if (sol < mejor) {
        mejor = sol;
        mejorEje = eje.copy();
      }
    }
  }

  let ca = 0, cb = 0;
  for (let i = 0; i < a.length; i++) ca += a[i].dot(mejorEje) / a.length;
  for (let i = 0; i < b.length; i++) cb += b[i].dot(mejorEje) / b.length;
  if ((ca - cb) < 0) mejorEje.mult(-1);

  return new SATResultado(true, mejorEje, mejor);
}

// Barrido de un punto contra AABB: devuelve t de primer impacto en [0,1], o -1
function segmentVsAabb(x0, y0, x1, y1, c) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;

  if (Math.abs(dx) < 0.00001) {
    if (x0 <= c.x || x0 >= c.x + c.w) return -1;
  } else {
    const a = (c.x - x0) / dx;
    const b = (c.x + c.w - x0) / dx;
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
  }

  if (Math.abs(dy) < 0.00001) {
    if (y0 <= c.y || y0 >= c.y + c.h) return -1;
  } else {
    const a = (c.y - y0) / dy;
    const b = (c.y + c.h - y0) / dy;
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
  }

  return (t1 > t0 && t0 >= 0 && t0 <= 1) ? t0 : -1;
}

// ==========================================
// 2. HELPERS DE GEOMETRÍA Y RENDER
// ==========================================

function rectVertices(cx, cy, w, h, a) {
  const p = [];
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  for (let i = 0; i < 4; i++) {
    const sx = (i === 0 || i === 3) ? -1 : 1;
    const sy = (i < 2) ? -1 : 1;
    const x = sx * w / 2;
    const y = sy * h / 2;
    p.push(new Vector2(cx + x * cos - y * sin, cy + x * sin + y * cos));
  }
  return p;
}

function poligonoRegular(lados, cx, cy, r, a) {
  const p = [];
  for (let i = 0; i < lados; i++) {
    const t = a + (Math.PI * 2 * i) / lados;
    p.push(new Vector2(cx + Math.cos(t) * r, cy + Math.sin(t) * r));
  }
  return p;
}

function promX(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) s += p[i].x;
  return s / p.length;
}

function promY(p) {
  let s = 0;
  for (let i = 0; i < p.length; i++) s += p[i].y;
  return s / p.length;
}

function constrain(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dibujarContorno(ctx, p) {
  if (p.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length; i++) {
    ctx.lineTo(p[i].x, p[i].y);
  }
  ctx.closePath();
}

function flecha(ctx, x, y, dx, dy, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - dx * 12 - dy * 5, y - dy * 12 + dx * 5);
  ctx.moveTo(x, y);
  ctx.lineTo(x - dx * 12 + dy * 5, y - dy * 12 - dx * 5);
  ctx.stroke();
}

function miniTarjeta(ctx, x, y, w, h, titulo, acento) {
  ctx.fillStyle = PANEL;
  roundRect(ctx, x, y, w, h, 9);
  ctx.fill();

  ctx.fillStyle = acento;
  roundRect(ctx, x, y, 3, h, 2);
  ctx.fill();

  ctx.fillStyle = SUAVE;
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(titulo, x + 13, y + 22);
}

function detalleLinea(ctx, x, y, n, s, c) {
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillStyle = c;
  ctx.textAlign = 'left';
  ctx.fillText(n, x, y + 17);

  ctx.font = '14px "Inter", sans-serif';
  ctx.fillStyle = SUAVE;
  ctx.fillText(s, x + 31, y + 17);
}

function metric(ctx, x, y, label, value) {
  ctx.fillStyle = SUAVE;
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y + 15);

  ctx.fillStyle = BLANCO;
  ctx.font = 'bold 24px "Inter", sans-serif';
  ctx.fillText(value, x, y + 43);
}

function etiquetaEvento(ctx, s, c) {
  ctx.fillStyle = FONDO;
  roundRect(ctx, 652, 207, 182, 29, 6);
  ctx.fill();

  ctx.fillStyle = c;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, 660, 222);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line.length === 0 ? words[i] : line + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, yy);
      yy += lineHeight;
      line = words[i];
    } else {
      line = testLine;
    }
  }
  if (line.length > 0) {
    ctx.fillText(line, x, yy);
  }
}

// ==========================================
// 3. CLASES DE LAS 6 ESCENAS
// ==========================================

class Escena {
  constructor() {
    this.titulo = '';
    this.etiqueta = '';
    this.resumen = '';
    this.formula = '';
    this.control = '';
  }
  iniciar() {}
  actualizar() {}
  dibujar(ctx) {}
  hayChoque() { return false; }
  detalle(ctx, x, y) {}
  tecla(e) {}
  rueda(d) {}
  clic() {}
}

// Escena 0: EscenaInicio
class EscenaInicio extends Escena {
  constructor() {
    super();
    this.titulo = 'Ver el choque, entender la regla';
    this.etiqueta = 'EMPEZAR AQUÍ  /  SEIS IDEAS EN DOS MINUTOS';
    this.resumen = 'Un juego convierte las formas en una pregunta simple: ¿se cruzan sus límites? Mueve el cursor y observa la respuesta.';
    this.formula = 'LÍMITES  →  PRUEBA  →  RESPUESTA';
    this.control = 'Mueve el cursor en el diagrama.';
    this.choque = false;
  }
  iniciar() {}
  actualizar() {
    const px = constrain(mouseCanvasX, 130, 800);
    const py = constrain(mouseCanvasY, 440, 535);
    this.choque = circleVsCircle(px, py, 45, 690, 465, 58);
  }
  hayChoque() { return this.choque; }
  dibujar(ctx) {
    // Tarjetas de presentación superiores
    miniTarjeta(ctx, 82, 218, 224, 116, '01   CÍRCULOS', CIAN);
    miniTarjeta(ctx, 322, 218, 224, 116, '02   CAJAS', AMBAR);
    miniTarjeta(ctx, 562, 218, 224, 116, '03   ROTACIÓN', LILA);

    // Ilustraciones de las tarjetas
    ctx.strokeStyle = CIAN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(156, 278, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(183, 278, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = AMBAR;
    ctx.strokeRect(364, 255, 63, 45);
    ctx.strokeRect(411, 273, 63, 45);

    ctx.save();
    ctx.translate(635, 278);
    ctx.rotate(-0.42);
    ctx.strokeStyle = LILA;
    ctx.strokeRect(-36, -13, 72, 26);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(739, 252);
    ctx.lineTo(769, 304);
    ctx.lineTo(709, 304);
    ctx.closePath();
    ctx.strokeStyle = LILA;
    ctx.stroke();

    // Área interactiva
    const px = constrain(mouseCanvasX, 130, 800);
    const py = constrain(mouseCanvasY, 440, 535);
    const cx = 690, cy = 465, r = 58;
    const hit = circleVsCircle(px, py, 45, cx, cy, r);

    ctx.strokeStyle = hit ? ROJO : CIAN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = hit ? ROJO : CIAN;
    ctx.beginPath();
    ctx.arc(px, py, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(241, 243, 245, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    if (mostrarLimites) {
      ctx.strokeStyle = hit ? ROJO : VERDE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 45, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = BLANCO;
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('A', cx - 5, cy - r - 12);
    ctx.fillText('B', px - 4, py + 57);
  }
  detalle(ctx, x, y) {
    detalleLinea(ctx, x, y, '01', 'Círculos', CIAN);
    detalleLinea(ctx, x, y + 37, '02', 'Rectángulos AABB', AMBAR);
    detalleLinea(ctx, x, y + 74, '03', 'Polígonos SAT', LILA);
    ctx.fillStyle = SUAVE;
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText('Después: velocidad y miles de objetos.', x, y + 119);
  }
}

// Escena 1: EscenaCirculos
class EscenaCirculos extends Escena {
  constructor() {
    super();
    this.titulo = 'Círculo contra círculo';
    this.etiqueta = '01  /  DETECCIÓN GEOMÉTRICA';
    this.resumen = 'Cada objeto se aproxima como un círculo. Compara la distancia entre centros con la suma de los radios.';
    this.formula = 'dx² + dy² < (r₁ + r₂)²';
    this.control = 'Mueve el cursor. Rueda: cambia el radio.';
    this.rJugador = 43;
    this.rFijo = 78;
    this.cx = 605;
    this.cy = 375;
    this.d = 0;
    this.hit = false;
  }
  iniciar() {}
  actualizar() {
    const px = constrain(mouseCanvasX, 100, 820);
    const py = constrain(mouseCanvasY, 220, 550);
    const dx = px - this.cx;
    const dy = py - this.cy;
    this.d = Math.sqrt(dx * dx + dy * dy);
    this.hit = circleVsCircle(px, py, this.rJugador, this.cx, this.cy, this.rFijo);
  }
  hayChoque() { return this.hit; }
  dibujar(ctx) {
    const px = constrain(mouseCanvasX, 100, 820);
    const py = constrain(mouseCanvasY, 220, 550);

    // Ejes auxiliares
    ctx.strokeStyle = BORDE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(102, this.cy);
    ctx.lineTo(820, this.cy);
    ctx.moveTo(this.cx, 210);
    ctx.lineTo(this.cx, 555);
    ctx.stroke();

    // Círculo fijo
    ctx.strokeStyle = this.hit ? ROJO : CIAN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.rFijo, 0, Math.PI * 2);
    ctx.stroke();

    // Líneas de radio
    ctx.strokeStyle = AMBAR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.cx, this.cy);
    ctx.lineTo(this.cx + this.rFijo, this.cy);
    ctx.moveTo(px, py);
    ctx.lineTo(px + this.rJugador, py);
    ctx.stroke();

    ctx.fillStyle = AMBAR;
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('r₂', this.cx + this.rFijo / 2, this.cy - 12);
    ctx.fillText('r₁', px + this.rJugador / 2, py - 12);

    // Línea de centros
    ctx.strokeStyle = this.hit ? ROJO : SUAVE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(this.cx, this.cy);
    ctx.stroke();

    // Círculo móvil con rostro
    ctx.fillStyle = this.hit ? ROJO : CIAN;
    ctx.beginPath();
    ctx.arc(px, py, this.rJugador, 0, Math.PI * 2);
    ctx.fill();

    // Ojos
    ctx.fillStyle = FONDO;
    ctx.beginPath();
    ctx.arc(px - 10, py - 6, 4, 0, Math.PI * 2);
    ctx.arc(px + 10, py - 6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = BLANCO;
    ctx.beginPath();
    ctx.arc(px - 9, py - 7, 1.2, 0, Math.PI * 2);
    ctx.arc(px + 11, py - 7, 1.2, 0, Math.PI * 2);
    ctx.fill();

    if (mostrarLimites) {
      ctx.strokeStyle = this.hit ? ROJO : VERDE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.rFijo, 0, Math.PI * 2);
      ctx.arc(px, py, this.rJugador, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  detalle(ctx, x, y) {
    metric(ctx, x, y, 'DISTANCIA', this.d.toFixed(1) + ' px');
    metric(ctx, x, y + 48, 'RADIOS SUMADOS', (this.rJugador + this.rFijo).toFixed(1) + ' px');
    ctx.fillStyle = this.hit ? ROJO : VERDE;
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('COMPARACIÓN DIRECTA · SIN RAÍZ', x, y + 113);
  }
  rueda(d) {
    this.rJugador = constrain(this.rJugador - d * 3, 18, 72);
  }
}

// Escena 2: EscenaAABB
class EscenaAABB extends Escena {
  constructor() {
    super();
    this.titulo = 'Cajas alineadas a los ejes';
    this.etiqueta = '02  /  AABB · CAJA ALINEADA';
    this.resumen = 'Dos cajas chocan si sus intervalos se solapan a la vez en X y en Y.';
    this.formula = 'SOLAPA EN X  Y  SOLAPA EN Y';
    this.control = 'Mueve el cursor. Rueda: tamaño de caja.';
    this.w = 122;
    this.h = 86;
    this.bx = 565;
    this.by = 354;
    this.ax = 0;
    this.ay = 0;
    this.ok = [false, false, false, false];
    this.hit = false;
  }
  iniciar() {}
  actualizar() {
    this.ax = constrain(mouseCanvasX - this.w / 2, 92, 820 - this.w);
    this.ay = constrain(mouseCanvasY - this.h / 2, 210, 490);
    this.ok[0] = this.ax < this.bx + 170;
    this.ok[1] = this.ax + this.w > this.bx;
    this.ok[2] = this.ay < this.by + 116;
    this.ok[3] = this.ay + this.h > this.by;
    this.hit = this.ok[0] && this.ok[1] && this.ok[2] && this.ok[3];
  }
  hayChoque() { return this.hit; }
  dibujar(ctx) {
    // Ejes
    ctx.strokeStyle = BORDE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(104, this.by + 58);
    ctx.lineTo(820, this.by + 58);
    ctx.moveTo(this.bx + 85, 210);
    ctx.lineTo(this.bx + 85, 505);
    ctx.stroke();

    // Caja fija B
    ctx.fillStyle = this.hit ? '#4D2932' : '#1B3543';
    ctx.strokeStyle = this.hit ? ROJO : CIAN;
    ctx.lineWidth = 3;
    roundRect(ctx, this.bx, this.by, 170, 116, 4);
    ctx.fill();
    ctx.stroke();

    // Caja móvil A
    ctx.fillStyle = this.hit ? '#49372B' : '#40392C';
    ctx.strokeStyle = this.hit ? ROJO : AMBAR;
    roundRect(ctx, this.ax, this.ay, this.w, this.h, 4);
    ctx.fill();
    ctx.stroke();

    // Letras identificadoras
    ctx.fillStyle = BLANCO;
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText('A', this.ax + 8, this.ay + 21);
    ctx.fillText('B', this.bx + 8, this.by + 21);

    // Barra de proyección en X
    ctx.fillStyle = SUAVE;
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText('X', 91, 531);

    ctx.strokeStyle = BORDE;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(126, 526);
    ctx.lineTo(815, 526);
    ctx.stroke();

    ctx.strokeStyle = AMBAR;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(this.ax, 526);
    ctx.lineTo(this.ax + this.w, 526);
    ctx.stroke();

    ctx.strokeStyle = CIAN;
    ctx.beginPath();
    ctx.moveTo(this.bx, 538);
    ctx.lineTo(this.bx + 170, 538);
    ctx.stroke();

    // Barra de proyección en Y
    ctx.fillStyle = SUAVE;
    ctx.fillText('Y', 91, 566);

    ctx.strokeStyle = BORDE;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(105, 228);
    ctx.lineTo(105, 492);
    ctx.stroke();

    ctx.strokeStyle = AMBAR;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(105, this.ay);
    ctx.lineTo(105, this.ay + this.h);
    ctx.stroke();

    ctx.strokeStyle = CIAN;
    ctx.beginPath();
    ctx.moveTo(117, this.by);
    ctx.lineTo(117, this.by + 116);
    ctx.stroke();
    ctx.lineCap = 'butt';

    if (mostrarLimites) {
      ctx.strokeStyle = this.hit ? ROJO : VERDE;
      ctx.lineWidth = 1;
      ctx.strokeRect(this.ax, this.ay, this.w, this.h);
      ctx.strokeRect(this.bx, this.by, 170, 116);
    }
  }
  detalle(ctx, x, y) {
    const s = ['A.left < B.right', 'A.right > B.left', 'A.top < B.bottom', 'A.bottom > B.top'];
    ctx.font = '14px "JetBrains Mono", monospace';
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = this.ok[i] ? VERDE : ROJO;
      ctx.fillText(this.ok[i] ? '✓' : '×', x, y + 16 + i * 25);
      ctx.fillStyle = SUAVE;
      ctx.fillText(s[i], x + 22, y + 16 + i * 25);
    }
    ctx.fillStyle = AMBAR;
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText('Desliza: resuelve X e Y por separado.', x, y + 119);
  }
  rueda(d) {
    this.w = constrain(this.w - d * 8, 72, 200);
    this.h = constrain(this.h - d * 5, 54, 150);
  }
}

// Escena 3: EscenaSAT
class EscenaSAT extends Escena {
  constructor() {
    super();
    this.titulo = 'Polígonos rotados · SAT';
    this.etiqueta = '03  /  TEOREMA DEL EJE SEPARADOR';
    this.resumen = 'Proyecta ambos polígonos sobre la normal de cada lado. Si un eje separa sus sombras, no chocan.';
    this.formula = 'UN EJE SEPARADO → NO HAY CHOQUE';
    this.control = 'Mueve cursor. Q/E o rueda: rota la caja.';
    this.ang = 0;
    this.ejeX = 1;
    this.ejeY = 0;
    this.jugador = [];
    this.tri = [];
    this.hex = [];
    this.objetivo = null;
    this.resultado = new SATResultado(false, new Vector2(1, 0), 0);
    this.hit = false;
  }
  iniciar() {
    this.ang = 0;
  }
  actualizar() {
    const px = constrain(mouseCanvasX, 130, 800);
    const py = constrain(mouseCanvasY, 220, 510);
    this.jugador = rectVertices(px, py, 150, 66, this.ang);
    this.tri = poligonoRegular(3, 365, 390, 62, -Math.PI / 2);
    this.hex = poligonoRegular(6, 665, 380, 72, 0.12);

    const rt = satPolygons(this.jugador, this.tri);
    const rh = satPolygons(this.jugador, this.hex);
    this.hit = rt.colision || rh.colision;

    if (rt.colision) {
      this.resultado = rt;
      this.objetivo = this.tri;
    } else {
      this.resultado = rh;
      this.objetivo = this.hex;
    }
    this.ejeX = this.resultado.eje.x;
    this.ejeY = this.resultado.eje.y;
  }
  hayChoque() { return this.hit; }
  dibujar(ctx) {
    this.dibujaPoligono(ctx, this.tri, '#243A4C', AZUL);
    this.dibujaPoligono(ctx, this.hex, this.hit ? '#512B35' : '#243A4C', this.hit ? ROJO : LILA);
    this.dibujaPoligono(ctx, this.jugador, this.hit ? '#512B35' : '#1D414A', this.hit ? ROJO : CIAN);

    if (mostrarRayos || this.hit) {
      const cx = promX(this.jugador);
      const cy = promY(this.jugador);
      ctx.strokeStyle = this.hit ? ROJO : AMBAR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - this.ejeX * 320, cy - this.ejeY * 320);
      ctx.lineTo(cx + this.ejeX * 320, cy + this.ejeY * 320);
      ctx.stroke();

      if (this.objetivo) {
        this.dibujaProyeccion(ctx, this.jugador, this.ejeX, this.ejeY, 520, CIAN);
        this.dibujaProyeccion(ctx, this.objetivo, this.ejeX, this.ejeY, 539, LILA);
      }
    }

    if (this.hit) {
      const cx = promX(this.jugador);
      const cy = promY(this.jugador);
      const tx = cx + this.resultado.eje.x * this.resultado.solape;
      const ty = cy + this.resultado.eje.y * this.resultado.solape;
      ctx.strokeStyle = AMBAR;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      flecha(ctx, tx, ty, this.resultado.eje.x, this.resultado.eje.y, AMBAR);
    }

    if (mostrarLimites) {
      ctx.strokeStyle = VERDE;
      ctx.lineWidth = 1;
      dibujarContorno(ctx, this.jugador);
      ctx.stroke();
      dibujarContorno(ctx, this.tri);
      ctx.stroke();
      dibujarContorno(ctx, this.hex);
      ctx.stroke();
    }
  }
  detalle(ctx, x, y) {
    ctx.fillStyle = this.hit ? ROJO : VERDE;
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText(this.hit ? 'NO HAY EJE SEPARADOR' : 'HAY EJE SEPARADOR', x, y + 17);

    ctx.fillStyle = SUAVE;
    ctx.font = '14px "Inter", sans-serif';
    wrapText(ctx, 'Se prueban las normales de A y B. Todas deben solaparse.', x, y + 47, 292, 19);

    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = AMBAR;
    const info = this.hit
      ? 'MTV: EMPUJE MÍNIMO  ·  ' + this.resultado.solape.toFixed(1) + ' PX'
      : 'SOMBRAS SEPARADAS';
    ctx.fillText(info, x, y + 112);
  }
  tecla(e) {
    if (e.key === 'q' || e.key === 'Q') this.ang -= 0.08;
    if (e.key === 'e' || e.key === 'E') this.ang += 0.08;
  }
  rueda(d) {
    this.ang += d * 0.08;
  }
  dibujaPoligono(ctx, p, fc, sc) {
    ctx.fillStyle = fc;
    ctx.strokeStyle = sc;
    ctx.lineWidth = 3;
    dibujarContorno(ctx, p);
    ctx.fill();
    ctx.stroke();
  }
  dibujaProyeccion(ctx, p, nx, ny, y, c) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < p.length; i++) {
      const q = p[i].x * nx + p[i].y * ny;
      lo = Math.min(lo, q);
      hi = Math.max(hi, q);
    }
    const mid = (lo + hi) * 0.5;
    ctx.strokeStyle = c;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(500 + (lo - mid) * 0.65, y);
    ctx.lineTo(500 + (hi - mid) * 0.65, y);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

// Escena 4: EscenaCCD
class EscenaCCD extends Escena {
  constructor() {
    super();
    this.titulo = 'Velocidad y tunneling';
    this.etiqueta = '04  /  DETECCIÓN CONTINUA · CCD';
    this.resumen = 'Un objeto rápido puede saltar de un lado al otro de una pared entre cuadros. La prueba puntual no alcanza a verlo.';
    this.formula = 'POSICIÓN ANTERIOR → NUEVA';
    this.control = 'TAB: discreta/CCD. Espacio: pausa. N: un cuadro.';
    this.x = 120;
    this.prev = 120;
    this.vel = 27;
    this.impactoX = 0;
    this.paredX = 640;
    this.paredY = 278;
    this.paredW = 7;
    this.paredH = 190;
    this.continuo = true;
    this.pausa = false;
    this.tunel = false;
    this.impacto = false;
    this.pasos = 0;
    this.reloj = 0;
    this.rastro = [0, 0, 0, 0, 0, 0];
    this.edad = [0, 0, 0, 0, 0, 0];
  }
  iniciar() {
    this.x = 120;
    this.prev = this.x;
    this.pasos = 0;
    this.reloj = 0;
    this.tunel = false;
    this.impacto = false;
    this.pausa = false;
    for (let i = 0; i < this.edad.length; i++) this.edad[i] = 0;
  }
  actualizar() {
    if (this.pausa && this.pasos === 0) return;
    this.pasos = 0;

    if (this.impacto || this.tunel) {
      if (++this.reloj > 55) this.iniciar();
      return;
    }

    this.prev = this.x;
    for (let i = this.edad.length - 1; i > 0; i--) {
      this.rastro[i] = this.rastro[i - 1];
      this.edad[i] = this.edad[i - 1];
    }
    this.rastro[0] = this.x;
    this.edad[0] = 1;

    const nuevo = this.x + this.vel;
    const amplia = new Caja(this.paredX - 6, this.paredY - 6, this.paredW + 12, this.paredH + 12);

    if (this.continuo) {
      const t = segmentVsAabb(this.x, 385, nuevo, 385, amplia);
      if (t >= 0) {
        this.x = lerp(this.x, nuevo, t);
        this.impactoX = this.x;
        this.impacto = true;
        return;
      }
    } else if (aabbVsAabb(nuevo - 6, 379, 12, 12, this.paredX, this.paredY, this.paredW, this.paredH)) {
      this.x = nuevo;
      this.impacto = true;
      this.impactoX = this.x;
      return;
    }

    this.x = nuevo;
    if (this.x > 845 && this.x > this.paredX + this.paredW) {
      this.tunel = true;
    }
  }
  hayChoque() { return this.impacto; }
  dibujar(ctx) {
    // Guías de trayectoria
    ctx.strokeStyle = BORDE;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(120 + i * 90, 228);
      ctx.lineTo(120 + i * 90, 520);
      ctx.stroke();
    }

    // Pared delgada
    ctx.fillStyle = '#5A4935';
    ctx.strokeStyle = AMBAR;
    ctx.lineWidth = 2;
    roundRect(ctx, this.paredX - 5, this.paredY, this.paredW + 10, this.paredH, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = AMBAR;
    roundRect(ctx, this.paredX - 2, this.paredY + 14, this.paredW + 4, 4, 1);
    ctx.fill();

    // Rastro de posiciones anteriores
    for (let i = this.edad.length - 1; i >= 0; i--) {
      if (this.edad[i] > 0) {
        ctx.fillStyle = `rgba(72, 214, 200, ${(55 - i * 7) / 255})`;
        ctx.beginPath();
        ctx.arc(this.rastro[i], 385, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Vector de movimiento del frame actual
    ctx.strokeStyle = this.continuo ? AMBAR : ROJO;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.prev, 385);
    ctx.lineTo(this.x, 385);
    ctx.stroke();

    // Proyectil
    ctx.fillStyle = this.continuo ? CIAN : ROJO;
    ctx.beginPath();
    ctx.arc(this.x, 385, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = BLANCO;
    ctx.beginPath();
    ctx.arc(this.x + 2, 383, 2, 0, Math.PI * 2);
    ctx.fill();

    if (mostrarRayos) {
      ctx.strokeStyle = AMBAR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.prev, 385);
      ctx.lineTo(this.x, 385);
      ctx.stroke();
    }

    if (mostrarLimites) {
      ctx.strokeStyle = this.impacto ? ROJO : VERDE;
      ctx.lineWidth = 1;
      ctx.strokeRect(this.paredX - 6, this.paredY - 6, this.paredW + 12, this.paredH + 12);
      ctx.beginPath();
      ctx.arc(this.x, 385, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.tunel) {
      etiquetaEvento(ctx, 'TUNNELING · NO LO DETECTÓ', ROJO);
    }
    if (this.impacto) {
      etiquetaEvento(ctx, 'IMPACTO EN EL PUNTO', VERDE);
      ctx.strokeStyle = AMBAR;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const rad = (i * Math.PI * 2) / 6;
        ctx.beginPath();
        ctx.moveTo(this.impactoX, 385);
        ctx.lineTo(this.impactoX + Math.cos(rad) * 18, 385 + Math.sin(rad) * 18);
        ctx.stroke();
      }
    }
  }
  detalle(ctx, x, y) {
    metric(ctx, x, y, 'VELOCIDAD / CUADRO', this.vel.toFixed(0) + ' PX');
    metric(ctx, x, y + 48, 'GROSOR DE PARED', this.paredW.toFixed(0) + ' PX');
    ctx.fillStyle = this.tunel ? ROJO : (this.continuo ? VERDE : ROJO);
    ctx.font = '12px "JetBrains Mono", monospace';
    const msg = this.tunel
      ? 'TUNNELING · LA PRUEBA FALLÓ'
      : (this.continuo ? 'REVISA TODO EL SEGMENTO' : 'REVISA SOLO EL PUNTO');
    ctx.fillText(msg, x, y + 114);
  }
  tecla(e) {
    if (e.key === 'Tab') {
      this.continuo = !this.continuo;
    } else if (e.key === ' ') {
      this.pausa = !this.pausa;
    } else if ((e.key === 'n' || e.key === 'N') && this.pausa) {
      this.pasos = 1;
    }
  }
  clic() {
    this.iniciar();
  }
}

// Escena 5: EscenaBroadPhase
class EscenaBroadPhase extends Escena {
  constructor() {
    super();
    this.titulo = 'Filtrar antes de comprobar';
    this.etiqueta = '05  /  FILTRADO ESPACIAL → PRUEBA EXACTA';
    this.resumen = 'La fuerza bruta compara cada pareja. La rejilla descarta a los objetos que están lejos y deja menos pruebas exactas.';
    this.formula = 'MENOS PAREJAS → MENOS CÁLCULO';
    this.control = 'Rueda o ↑/↓: cantidad. TAB: fuerza bruta/rejilla.';

    this.MAX = 1500;
    this.COLS = 10;
    this.ROWS = 6;
    this.CELDAS = this.COLS * this.ROWS;

    this.x = new Float32Array(this.MAX);
    this.y = new Float32Array(this.MAX);
    this.vx = new Float32Array(this.MAX);
    this.vy = new Float32Array(this.MAX);
    this.marcados = new Uint8Array(this.MAX);

    this.celdas = Array.from({ length: this.CELDAS }, () => new Int32Array(this.MAX));
    this.totalCelda = new Int32Array(this.CELDAS);

    this.n = 760;
    this.comparaciones = 0;
    this.grid = true;
    this.hit = false;
  }
  iniciar() {
    for (let i = 0; i < this.n; i++) this.nuevo(i);
  }
  nuevo(i) {
    this.x[i] = 78 + Math.random() * (828 - 78);
    this.y[i] = 214 + Math.random() * (570 - 214);
    this.vx[i] = (Math.random() - 0.5) * 0.96;
    this.vy[i] = (Math.random() - 0.5) * 0.76;
  }
  actualizar() {
    for (let i = 0; i < this.n; i++) {
      this.marcados[i] = 0;
      this.x[i] += this.vx[i];
      this.y[i] += this.vy[i];
      if (this.x[i] < 78 || this.x[i] > 828) this.vx[i] *= -1;
      if (this.y[i] < 214 || this.y[i] > 570) this.vy[i] *= -1;
    }

    this.comparaciones = 0;
    this.hit = false;

    if (!this.grid) {
      // Fuerza bruta O(N^2)
      for (let a = 0; a < this.n; a++) {
        for (let b = a + 1; b < this.n; b++) {
          this.probar(a, b);
        }
      }
    } else {
      // Rejilla espacial regular O(N)
      for (let c = 0; c < this.CELDAS; c++) this.totalCelda[c] = 0;

      for (let i = 0; i < this.n; i++) {
        const c = this.celda(i);
        this.celdas[c][this.totalCelda[c]++] = i;
      }

      for (let cy = 0; cy < this.ROWS; cy++) {
        for (let cx = 0; cx < this.COLS; cx++) {
          const c = cy * this.COLS + cx;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx < 0 || nx >= this.COLS || ny < 0 || ny >= this.ROWS) continue;
              const v = ny * this.COLS + nx;
              if (v < c) continue;

              const countC = this.totalCelda[c];
              const countV = this.totalCelda[v];
              for (let a = 0; a < countC; a++) {
                for (let b = 0; b < countV; b++) {
                  const ia = this.celdas[c][a];
                  const ib = this.celdas[v][b];
                  if (v === c && ib <= ia) continue;
                  this.probar(ia, ib);
                }
              }
            }
          }
        }
      }
    }
  }
  celda(i) {
    const cx = constrain(Math.floor((this.x[i] - 78) / 75), 0, this.COLS - 1);
    const cy = constrain(Math.floor((this.y[i] - 210) / 61), 0, this.ROWS - 1);
    return cy * this.COLS + cx;
  }
  probar(a, b) {
    this.comparaciones++;
    if (circleVsCircle(this.x[a], this.y[a], 3.2, this.x[b], this.y[b], 3.2)) {
      this.marcados[a] = 1;
      this.marcados[b] = 1;
      this.hit = true;
    }
  }
  hayChoque() { return this.hit; }
  dibujar(ctx) {
    if (this.grid) {
      if (mostrarRayos) {
        ctx.fillStyle = 'rgba(184, 155, 234, 0.14)';
        for (let c = 0; c < this.CELDAS; c++) {
          if (this.totalCelda[c] > 0) {
            const cx = c % this.COLS;
            const cy = Math.floor(c / this.COLS);
            ctx.fillRect(78 + cx * 75, 210 + cy * 61, 75, 61);
          }
        }
      }
      ctx.strokeStyle = BORDE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= this.COLS; i++) {
        ctx.moveTo(78 + i * 75, 210);
        ctx.lineTo(78 + i * 75, 576);
      }
      for (let i = 0; i <= this.ROWS; i++) {
        ctx.moveTo(78, 210 + i * 61);
        ctx.lineTo(828, 210 + i * 61);
      }
      ctx.stroke();
    }

    // Partículas
    for (let i = 0; i < this.n; i++) {
      const marcado = this.marcados[i] === 1;
      ctx.fillStyle = marcado ? ROJO : (i % 5 === 0 ? LILA : CIAN);
      const rad = marcado ? 4.5 : 3;
      ctx.beginPath();
      ctx.arc(this.x[i], this.y[i], rad, 0, Math.PI * 2);
      ctx.fill();

      if (mostrarLimites) {
        ctx.strokeStyle = marcado ? ROJO : VERDE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x[i], this.y[i], 3.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  detalle(ctx, x, y) {
    metric(ctx, x, y, 'OBJETOS', this.n.toLocaleString());
    metric(ctx, x, y + 48, 'COMPARACIONES', this.comparaciones.toLocaleString());
    ctx.fillStyle = this.grid ? VERDE : ROJO;
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText(this.grid ? 'MODO B · REJILLA' : 'MODO A · FUERZA BRUTA', x, y + 114);
  }
  tecla(e) {
    if (e.key === 'Tab') this.grid = !this.grid;
    if (e.key === 'ArrowUp') this.cambiarCantidad(50);
    if (e.key === 'ArrowDown') this.cambiarCantidad(-50);
  }
  rueda(d) {
    this.cambiarCantidad(Math.floor(-d * 50));
  }
  cambiarCantidad(d) {
    const antes = this.n;
    this.n = constrain(this.n + d, 100, this.MAX);
    for (let i = antes; i < this.n; i++) this.nuevo(i);
  }
}

// ==========================================
// 4. MOTOR PRINCIPAL, RENDER Y EVENTOS
// ==========================================

const canvas = document.getElementById('collision-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const escenas = [
  new EscenaInicio(),
  new EscenaCirculos(),
  new EscenaAABB(),
  new EscenaSAT(),
  new EscenaCCD(),
  new EscenaBroadPhase()
];

// Iniciar todas las escenas
for (let i = 0; i < escenas.length; i++) {
  escenas[i].iniciar();
}

function cambiar(n) {
  if (n >= 0 && n < escenas.length) {
    activa = n;
  }
}

function ajustarCanvas() {
  const contenedorW = window.innerWidth;
  const contenedorH = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  escalaVista = Math.min(contenedorW / CW, contenedorH / CH);
  const displayW = Math.round(CW * escalaVista);
  const displayH = Math.round(CH * escalaVista);

  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';

  canvas.width = Math.round(CW * dpr);
  canvas.height = Math.round(CH * dpr);

  desfaseX = (contenedorW - displayW) * 0.5;
  desfaseY = (contenedorH - displayH) * 0.5;
}

window.addEventListener('resize', ajustarCanvas);
ajustarCanvas();

// Dibujo de interfaz general (Header, Paneles, Explicación, Pestañas)
function dibujarFondo(ctx) {
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, CW, CH);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.027)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < CW; x += 48) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CH);
  }
  for (let y = 0; y < CH; y += 48) {
    ctx.moveTo(0, y);
    ctx.lineTo(CW, y);
  }
  ctx.stroke();
}

function dibujarCabecera(ctx, e) {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, CW, 124);

  // Barra de acento
  ctx.fillStyle = CIAN;
  ctx.fillRect(48, 28, 7, 52);

  ctx.font = '15px "JetBrains Mono", monospace';
  ctx.fillStyle = CIAN;
  ctx.textAlign = 'left';
  ctx.fillText('LABORATORIO VISUAL   /   FÍSICA 2D', 70, 48);

  ctx.font = 'bold 33px "Inter", sans-serif';
  ctx.fillStyle = BLANCO;
  ctx.fillText(e.titulo, 70, 88);

  // Indicador de escena (derecha)
  ctx.font = '15px "JetBrains Mono", monospace';
  ctx.fillStyle = SUAVE;
  const numEscena = (activa + 1).toString().padStart(2, '0');
  ctx.fillText('ESCENA  ' + numEscena + ' / 06', 1002, 48);

  // Barra de progreso
  ctx.fillStyle = BORDE;
  ctx.fillRect(1002, 58, 220, 4);
  ctx.fillStyle = CIAN;
  ctx.fillRect(1002, 58, 220 * (activa + 1) / 6.0, 4);

  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = SUAVE;
  ctx.fillText('1–6  /  CAMBIAR ESCENA', 1002, 85);
}

function dibujarPanelPrincipal(ctx, e) {
  // Lienzo interactivo izquierdo
  ctx.fillStyle = LIENZO;
  roundRect(ctx, 48, 146, 812, 458, 16);
  ctx.fill();

  ctx.strokeStyle = BORDE;
  ctx.lineWidth = 1;
  roundRect(ctx, 48, 146, 812, 458, 16);
  ctx.stroke();

  ctx.fillStyle = AMBAR;
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(e.etiqueta, 72, 174);

  ctx.fillStyle = BORDE;
  ctx.fillRect(72, 190, 764, 1);

  // Panel lateral derecho
  ctx.fillStyle = PANEL;
  roundRect(ctx, 884, 146, 348, 458, 16);
  ctx.fill();

  ctx.strokeStyle = BORDE;
  roundRect(ctx, 884, 146, 348, 458, 16);
  ctx.stroke();
}

function dibujarExplicacion(ctx, e) {
  const x = 910;
  const y = 180;

  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = CIAN;
  ctx.textAlign = 'left';
  ctx.fillText('IDEA CLAVE', x, y);

  ctx.font = '18px "Inter", sans-serif';
  ctx.fillStyle = BLANCO;
  wrapText(ctx, e.resumen, x, y + 30, 294, 25);

  ctx.fillStyle = BORDE;
  ctx.fillRect(x, y + 112, 296, 1);

  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = AMBAR;
  ctx.fillText('REGLA', x, y + 139);

  ctx.fillStyle = FONDO;
  roundRect(ctx, x, y + 153, 296, 64, 8);
  ctx.fill();

  ctx.font = '16px "JetBrains Mono", monospace';
  ctx.fillStyle = BLANCO;
  wrapText(ctx, e.formula, x + 12, y + 185, 272, 22);

  ctx.fillStyle = BORDE;
  ctx.fillRect(x, y + 233, 296, 1);

  e.detalle(ctx, x, y + 258);

  const hayChoque = e.hayChoque();
  const c = hayChoque ? ROJO : VERDE;
  ctx.fillStyle = hayChoque ? '#492D38' : '#20392F';
  roundRect(ctx, x, y + 389, 296, 32, 9);
  ctx.fill();

  ctx.fillStyle = c;
  ctx.font = 'bold 14px "JetBrains Mono", monospace';
  ctx.fillText(hayChoque ? 'CONTACTO  ·  SÍ' : 'CONTACTO  ·  NO', x + 14, y + 410);
}

function dibujarControles(ctx, e) {
  ctx.fillStyle = SUAVE;
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('PRUEBA  ' + e.control, 52, 628);
  ctx.fillText('TECLAS  H: LÍMITES    X: EXPLICACIÓN    R: REINICIAR    F: PANTALLA', 638, 628);
}

function dibujarNavegacion(ctx) {
  const nombres = ['VISTA GENERAL', 'CÍRCULOS', 'AABB', 'SAT / OBB', 'CCD', 'FILTRADO'];
  const x0 = 48;
  const w = 1184.0 / 6;

  for (let i = 0; i < 6; i++) {
    const x = x0 + i * w;
    const esActiva = (i === activa);

    ctx.fillStyle = esActiva ? '#203344' : PANEL;
    roundRect(ctx, x + 2, 650, w - 4, 48, 9);
    ctx.fill();

    if (esActiva) {
      ctx.fillStyle = CIAN;
      roundRect(ctx, x + 2, 650, w - 4, 3, 2);
      ctx.fill();
    }

    ctx.fillStyle = esActiva ? CIAN : SUAVE;
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText((i + 1).toString().padStart(2, '0'), x + 13, 680);

    ctx.fillStyle = esActiva ? BLANCO : SUAVE;
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText(nombres[i], x + 43, 680);
  }
}

// Bucle principal de animación (60 FPS desacoplado)
function frame() {
  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);

  dibujarFondo(ctx);

  const e = escenas[activa];
  e.actualizar();

  dibujarCabecera(ctx, e);
  dibujarPanelPrincipal(ctx, e);
  e.dibujar(ctx);
  dibujarExplicacion(ctx, e);
  dibujarControles(ctx, e);
  dibujarNavegacion(ctx);

  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ==========================================
// 5. GESTIÓN DE ENTRADA (RATÓN, TECLADO, TOUCH)
// ==========================================

function actualizarCoordenadasPuntero(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const rawX = clientX - rect.left;
  const rawY = clientY - rect.top;
  mouseCanvasX = constrain((rawX / rect.width) * CW, 0, CW);
  mouseCanvasY = constrain((rawY / rect.height) * CH, 0, CH);
}

canvas.addEventListener('pointermove', (e) => {
  actualizarCoordenadasPuntero(e.clientX, e.clientY);
});

canvas.addEventListener('pointerdown', (e) => {
  actualizarCoordenadasPuntero(e.clientX, e.clientY);
  isPointerDown = true;

  // Clic en la barra de navegación inferior
  if (mouseCanvasY >= 650 && mouseCanvasY <= 700 && mouseCanvasX >= 48 && mouseCanvasX <= 1232) {
    const tabIndex = Math.floor((mouseCanvasX - 48) / (1184.0 / 6));
    cambiar(constrain(tabIndex, 0, 5));
    return;
  }

  escenas[activa].clic();
});

window.addEventListener('pointerup', () => {
  isPointerDown = false;
});

// Desplazamiento de rueda (rueda / pinch)
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = Math.sign(e.deltaY);
  escenas[activa].rueda(delta);
}, { passive: false });

// Atajos de teclado idénticos a Processing
window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '6') {
    cambiar(parseInt(e.key, 10) - 1);
  } else if (e.key === 'ArrowRight') {
    cambiar((activa + 1) % 6);
  } else if (e.key === 'ArrowLeft') {
    cambiar((activa + 5) % 6);
  } else if (e.key === 'h' || e.key === 'H') {
    mostrarLimites = !mostrarLimites;
    actualizarBotonLimites();
  } else if (e.key === 'x' || e.key === 'X') {
    mostrarRayos = !mostrarRayos;
    actualizarBotonRayos();
  } else if (e.key === 'r' || e.key === 'R') {
    escenas[activa].iniciar();
  } else if (e.key === 'f' || e.key === 'F') {
    alternarPantallaCompleta();
  } else {
    escenas[activa].tecla(e);
  }
});

// ==========================================
// 6. BOTONES FLOTANTES DE ACCESO RÁPIDO
// ==========================================

const btnHitbox = document.getElementById('btn-hitbox');
const btnRays = document.getElementById('btn-rays');
const btnToggleMode = document.getElementById('btn-toggle-mode');
const btnReset = document.getElementById('btn-reset');
const btnFullscreen = document.getElementById('btn-fullscreen');

function actualizarBotonLimites() {
  btnHitbox.classList.toggle('active', mostrarLimites);
}

function actualizarBotonRayos() {
  btnRays.classList.toggle('active', mostrarRayos);
}

btnHitbox.addEventListener('click', () => {
  mostrarLimites = !mostrarLimites;
  actualizarBotonLimites();
});

btnRays.addEventListener('click', () => {
  mostrarRayos = !mostrarRayos;
  actualizarBotonRayos();
});

btnToggleMode.addEventListener('click', () => {
  escenas[activa].tecla({ key: 'Tab' });
});

btnReset.addEventListener('click', () => {
  escenas[activa].iniciar();
});

function alternarPantallaCompleta() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

btnFullscreen.addEventListener('click', alternarPantallaCompleta);
