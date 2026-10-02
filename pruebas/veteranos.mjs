// Prueba el bloqueo de funciones y el trato a los veteranos.
//
// PRO_ACTIVO e INICIO_DE_PRO son constantes de módulo, así que para probar los
// tres escenarios se generan copias de store.js con esos valores cambiados. Es
// el mismo código que se publica, sólo con las constantes que se van a tocar el
// día que se encienda el cobro.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname.slice(1)));
const ORIGEN = path.join(AQUI, '..', 'www', 'js', 'store.js');
const TMP = path.join(AQUI, '.tmp');
fs.mkdirSync(TMP, { recursive: true });
const fuente = fs.readFileSync(ORIGEN, 'utf8');

const almacen = {};
globalThis.localStorage = {
  getItem: (k) => (k in almacen ? almacen[k] : null),
  setItem: (k, v) => { almacen[k] = String(v); },
};

let fallos = 0;
function ok(nombre, cond) {
  console.log((cond ? '  ok    ' : '  FALLA ') + nombre);
  if (!cond) fallos++;
}

let n = 0;
/** Carga store.js con esas constantes y con ese estado guardado de antemano. */
async function cargar({ proActivo, inicioDePro, guardado }) {
  for (const k of Object.keys(almacen)) delete almacen[k];
  if (guardado) almacen['afinador.v1'] = JSON.stringify(guardado);

  let txt = fuente
    .replace('const PRO_ACTIVO = false;', 'const PRO_ACTIVO = ' + proActivo + ';')
    .replace('const INICIO_DE_PRO = null;', 'const INICIO_DE_PRO = ' + inicioDePro + ';');
  const destino = path.join(TMP, 'store-variante-' + ++n + '.mjs');
  fs.writeFileSync(destino, txt);
  return (await import(pathToFileURL(destino).href)).settings;
}

const PRO_DESDE = Date.parse('2026-12-01T00:00:00Z');
const ANTES = Date.parse('2026-10-15T00:00:00Z');
const DESPUES = Date.parse('2027-01-20T00:00:00Z');

console.log('\nhoy: la app es gratis y completa (PRO_ACTIVO = false)');
{
  const s = await cargar({ proActivo: false, inicioDePro: null });
  ok('no hay nada bloqueado', s.isLocked('theme') === false && s.isLocked('a4') === false);
  ok('las pantallas no ofrecen comprar', s.proDisponible === false);
  s.set('theme', 'madera');
  s.set('a4', 432);
  ok('el tema elegido se aplica de verdad', s.get('theme') === 'madera');
  ok('la referencia elegida se aplica', s.get('a4') === 432);
  ok('queda sellada la fecha de instalación', typeof s.getRaw('instalado') === 'number');
}

console.log('\nmañana se enciende Pro: el que ya la tenía conserva todo');
{
  const s = await cargar({
    proActivo: true,
    inicioDePro: PRO_DESDE,
    guardado: { instalado: ANTES, theme: 'madera', a4: 432, premium: false },
  });
  ok('se lo reconoce como veterano', s.veterano === true);
  ok('nada le queda bloqueado', s.isLocked('theme') === false && s.isLocked('tolerance') === false);
  ok('conserva su tema', s.get('theme') === 'madera');
  ok('conserva su referencia', s.get('a4') === 432);
}

console.log('\nmañana se enciende Pro: el que llega después sí paga');
{
  const s = await cargar({
    proActivo: true,
    inicioDePro: PRO_DESDE,
    guardado: { instalado: DESPUES, theme: 'madera', a4: 432, premium: false },
  });
  ok('no es veterano', s.veterano === false);
  ok('las funciones le quedan bloqueadas', s.isLocked('theme') === true && s.isLocked('a4') === true);
  ok('rige el valor gratuito', s.get('theme') === 'noche' && s.get('a4') === 440);
  ok('pero lo suyo no se borra', s.getRaw('theme') === 'madera' && s.getRaw('a4') === 432);
  s.set('premium', true);
  ok('al comprar recupera lo que había elegido', s.get('theme') === 'madera' && s.get('a4') === 432);
}

// Sin fecha guardada, lo que decide es CUANDO se abre la app: antes de que Pro
// empiece a regir sigue siendo veterano, y despues cuenta como instalacion nueva.
// Es lo unico que se puede hacer sin un servidor que recuerde quien es quien.
const RELOJ = Date.now;
async function conElRelojEn(t, fn) {
  Date.now = () => t;
  try { return await fn(); } finally { Date.now = RELOJ; }
}

console.log();
console.log('borde: sin fecha guardada, abriendo ANTES de que Pro rija');
{
  const s = await conElRelojEn(ANTES, () => cargar({
    proActivo: true,
    inicioDePro: PRO_DESDE,
    guardado: { theme: 'madera', premium: false },
  }));
  ok('se le sella la fecha al abrir', s.getRaw('instalado') === ANTES);
  ok('sigue siendo veterano', s.veterano === true);
  ok('no se le bloquea nada', s.isLocked('theme') === false);
}

console.log();
console.log('borde: sin fecha guardada, abriendo DESPUES (borro los datos)');
{
  const s = await conElRelojEn(DESPUES, () => cargar({
    proActivo: true,
    inicioDePro: PRO_DESDE,
    guardado: { theme: 'madera', premium: false },
  }));
  ok('se le sella la fecha al abrir', s.getRaw('instalado') === DESPUES);
  ok('cuenta como instalacion nueva', s.veterano === false);
  ok('y por lo tanto queda bloqueado', s.isLocked('theme') === true);
}

console.log(fallos === 0 ? '\nTODO BIEN' : '\n' + fallos + ' FALLAS');
process.exit(fallos ? 1 : 0);
