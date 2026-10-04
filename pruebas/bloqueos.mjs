// Ninguna pantalla puede decidir por su cuenta si algo está bloqueado.
//
// Este test existe porque el error se coló dos veces: se publicó una versión
// gratis donde el metrónomo tenía compás y acento deshabilitados y la nota fija
// forzada a cromático, porque esas pantallas miraban `settings.premium` en vez
// de preguntar si había bloqueos vigentes. Son cosas distintas: cuando Pro no
// está activo, o el usuario es veterano, `premium` es false y sin embargo no
// hay nada que bloquear.

import fs from 'node:fs';
import path from 'node:path';

const AQUI = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname.slice(1)));
const JS = path.join(AQUI, '..', 'www', 'js');

// billing.js sí tiene que mirar `premium`: es quien lo concede.
// app.js lo usa para elegir entre la tarjeta de compra y el cartel de "Pro activo",
// que es una pregunta sobre la compra, no sobre los bloqueos.
const PERMITIDOS = new Set(['billing.js', 'app.js']);

let fallos = 0;
function ok(nombre, cond, detalle) {
  console.log((cond ? '  ok    ' : '  FALLA ') + nombre + (cond || !detalle ? '' : '  -> ' + detalle));
  if (!cond) fallos++;
}

console.log('ninguna pantalla decide los bloqueos por su cuenta');
for (const archivo of fs.readdirSync(JS).filter((f) => f.endsWith('.js'))) {
  if (PERMITIDOS.has(archivo)) continue;
  const texto = fs.readFileSync(path.join(JS, archivo), 'utf8');
  const lineas = texto.split('\n');
  const malas = [];
  lineas.forEach((l, i) => {
    if (/settings\.premium/.test(l)) malas.push(i + 1 + ': ' + l.trim().slice(0, 60));
  });
  ok(archivo + ' pregunta por bloqueosActivos, no por premium', malas.length === 0, malas.join(' | '));
}

console.log();
console.log('con la app gratis no queda nada bloqueado');
{
  const store = fs.readFileSync(path.join(JS, 'store.js'), 'utf8');
  ok('PRO_ACTIVO está en false', /const PRO_ACTIVO = false;/.test(store));
  ok('store.js expone bloqueosActivos', /get bloqueosActivos\(\)/.test(store));

  const almacen = {};
  globalThis.localStorage = {
    getItem: (k) => (k in almacen ? almacen[k] : null),
    setItem: (k, v) => { almacen[k] = String(v); },
  };
  const { settings } = await import(new URL('../www/js/store.js', import.meta.url).href);
  ok('bloqueosActivos es false', settings.bloqueosActivos === false);
  for (const k of ['theme', 'a4', 'tolerance', 'beats', 'accent']) {
    ok('no se bloquea ' + k, settings.isLocked(k) === false);
  }
}

console.log(fallos === 0 ? '\nTODO BIEN' : '\n' + fallos + ' FALLAS');
process.exit(fallos ? 1 : 0);
