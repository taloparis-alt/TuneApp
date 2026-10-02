// Prueba la lógica de billing.js contra una tienda simulada con la misma forma
// que la real (verificada leyendo node_modules/cordova-plugin-purchase/www/store.js).
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const RAIZ = pathToFileURL(path.join(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname.slice(1))), '..', 'www', 'js') + path.sep).href;

const almacen = {};
globalThis.localStorage = {
  getItem: (k) => (k in almacen ? almacen[k] : null),
  setItem: (k, v) => { almacen[k] = String(v); },
};
globalThis.document = { addEventListener: () => {} };
globalThis.window = { Capacitor: { isNativePlatform: () => true } };

function tiendaFalsa({ yaComprado = false, fallaOrden = null } = {}) {
  const cbs = { approved: [], finished: [], productUpdated: [], receiptsReady: [] };
  let comprado = yaComprado;
  const producto = {
    id: 'tuneapp_pro',
    get owned() { return comprado; },
    pricing: { price: '$ 1.900,00' },
    getOffer: () => ({ productId: 'tuneapp_pro', platform: 'android-playstore' }),
  };
  const store = {
    verbosity: 0,
    register() {},
    when() {
      const ret = {};
      for (const k of Object.keys(cbs)) ret[k] = (fn) => (cbs[k].push(fn), ret);
      return ret;
    },
    error() {},
    async initialize() { setTimeout(() => cbs.receiptsReady.forEach((f) => f()), 10); },
    get: () => producto,
    owned: (id) => id === 'tuneapp_pro' && comprado,
    async order() {
      if (fallaOrden) return fallaOrden;
      setTimeout(() => {
        comprado = true;
        const t = { products: [{ id: 'tuneapp_pro' }], finish: () => cbs.finished.forEach((f) => f(t)) };
        cbs.approved.forEach((f) => f(t));
      }, 30);
      return undefined;
    },
    async restorePurchases() { comprado = yaComprado; return undefined; },
  };
  return {
    store,
    LogLevel: { WARNING: 1 },
    ProductType: { NON_CONSUMABLE: 'non consumable' },
    Platform: { GOOGLE_PLAY: 'android-playstore' },
    ErrorCode: { PAYMENT_CANCELLED: 6777006, PAYMENT_NOT_ALLOWED: 6777008, PRODUCT_NOT_AVAILABLE: 6777023 },
  };
}

let fallos = 0;
function ok(nombre, cond) {
  console.log((cond ? '  ok    ' : '  FALLA ') + nombre);
  if (!cond) fallos++;
}

const { settings } = await import(RAIZ + 'store.js');

let n = 0;
async function caso(nombre, cfg, fn) {
  console.log('\n' + nombre);
  for (const k of Object.keys(almacen)) delete almacen[k];
  settings.set('premium', false);
  globalThis.window.Capacitor = { isNativePlatform: () => true };
  globalThis.window.CdvPurchase = cfg === null ? undefined : tiendaFalsa(cfg);
  if (cfg === null) {
    delete globalThis.window.CdvPurchase;
    globalThis.window.Capacitor = { isNativePlatform: () => false };
  }
  const mod = await import(RAIZ + 'billing.js?v=' + ++n);
  await fn(mod.billing, settings);
}

await caso('compra nueva', {}, async (billing, settings) => {
  let avisos = 0;
  billing.onChange(() => avisos++);
  await billing.init();
  ok('la tienda queda disponible', billing.disponible === true);
  ok('trae el precio que da Play', billing.precio === '$ 1.900,00');
  ok('arranca sin Pro', settings.premium === false);
  const r = await billing.comprar();
  ok('comprar() devuelve true', r === true);
  ok('Pro queda activo', settings.premium === true);
  ok('avisó a la pantalla de ajustes', avisos > 0);
});

await caso('ya comprado en otro teléfono', { yaComprado: true }, async (billing, settings) => {
  await billing.init();
  await new Promise((r) => setTimeout(r, 60));
  ok('Pro se concede solo al iniciar', settings.premium === true);
});

await caso('el usuario cancela', { fallaOrden: { isError: true, code: 6777006, message: 'cancelled' } }, async (billing, settings) => {
  await billing.init();
  const r = await billing.comprar();
  ok('comprar() devuelve false', r === false);
  ok('no concede Pro', settings.premium === false);
  ok('reconoce la cancelación', billing.cancelada === true);
  ok('el mensaje no acusa a nadie', billing.mensajeDeError() === 'Compra cancelada.');
});

await caso('compras no habilitadas en la cuenta', { fallaOrden: { isError: true, code: 6777008, message: 'nope' } }, async (billing, settings) => {
  await billing.init();
  await billing.comprar();
  ok('mensaje específico', billing.mensajeDeError().includes('no tiene habilitadas'));
  ok('no lo toma por cancelación', billing.cancelada === false);
  ok('no concede Pro', settings.premium === false);
});

await caso('sin tienda (navegador o APK de prueba)', null, async (billing, settings) => {
  await billing.init();
  ok('no queda disponible', billing.disponible === false);
  ok('comprar() no rompe', (await billing.comprar()) === false);
  ok('restaurar() no rompe', (await billing.restaurar()) === false);
  ok('no concede Pro de prepo', settings.premium === false);
});

console.log(fallos === 0 ? '\nTODO BIEN' : '\n' + fallos + ' FALLAS');
process.exit(fallos ? 1 : 0);
