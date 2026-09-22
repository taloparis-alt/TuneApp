// Capturas de pantalla para la ficha de Play Store.
//
//   npm install --no-save puppeteer-core
//   python devserver.py 5200     (en otra terminal)
//   node tools/mkcapturas.mjs                  telefono  (1080x1920)
//   DISPOSITIVO=tablet7  node tools/mkcapturas.mjs       tablet 7"  (1200x1920)
//   DISPOSITIVO=tablet10 node tools/mkcapturas.mjs       tablet 10" (1600x2560)
//
// Play pide capturas de tablet ademas de las de telefono para publicar la ficha.
//
// puppeteer-core se instala con --no-save a propósito: sólo hace falta para generar
// estas imágenes, y agregarlo a package.json haría que CI lo baje en cada build.
//
// Usa el Chrome ya instalado en el sistema, sin bajar uno aparte. Genera 1080x1920,
// medida habitual de teléfono, holgada dentro de los límites de Play (320 a 3840 px).
//
// Las pantallas se muestran EN USO y no recién abiertas: sin micrófono activo las
// lecturas están vacías y se ve un botón enorme, que no representa cómo se usa la
// app. Los estados que se preparan acá son los que la app produce realmente al
// escuchar una cuerda.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Cada preset da el tamaño final multiplicando por deviceScaleFactor.
const DISPOSITIVOS = {
  telefono: { carpeta: 'capturas', width: 360, height: 640, escala: 3 },
  tablet7: { carpeta: 'capturas-tablet7', width: 600, height: 960, escala: 2 },
  tablet10: { carpeta: 'capturas-tablet10', width: 800, height: 1280, escala: 2 },
};
const DISPOSITIVO = DISPOSITIVOS[process.env.DISPOSITIVO || 'telefono'];
if (!DISPOSITIVO) throw new Error('DISPOSITIVO debe ser: ' + Object.keys(DISPOSITIVOS).join(', '));
const SALIDA = path.join(RAIZ, 'store', DISPOSITIVO.carpeta);
const BASE = process.env.BASE || 'http://localhost:5200';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** Deja el afinador como si estuviera escuchando una cuerda. */
function montarAfinador(vista, datos) {
  const raiz = document.querySelector(`[data-view="${vista}"]`);
  const set = (id, txt) => {
    const el = raiz.querySelector('#' + id);
    if (el) el.textContent = txt;
  };
  set(datos.idNota, datos.nota);
  if (datos.idCuerda) set(datos.idCuerda, datos.cuerda);
  set(datos.idHz, datos.hz);
  set(datos.idObjetivo, datos.objetivo);

  const cents = raiz.querySelector('#' + datos.idCents);
  cents.textContent = datos.cents;
  cents.dataset.state = datos.estado;

  const gauge = raiz.querySelector('.gauge');
  gauge.dataset.state = datos.estado;
  raiz.querySelector('.needle-wrap').style.transform = `rotate(${datos.aguja}deg)`;

  if (datos.pista) {
    const pista = raiz.querySelector('#' + datos.pista);
    if (pista) pista.classList.add('is-on');
  }
  (datos.clavijas || []).forEach((id) => {
    const peg = raiz.querySelector(`.peg[data-peg="${id}"]`);
    if (peg) peg.classList.add('is-active', datos.estado === 'ok' ? 'is-ok' : 'is-active');
    const str = raiz.querySelector(`.str[data-peg="${id}"]`);
    if (str) str.classList.add('is-lit');
  });
}

const ESCENAS = [
  {
    archivo: '1-guitarra-afinando.png',
    preparar: (p) =>
      p.evaluate((fn) => {
        document.querySelector('.tab[data-tab="tuner"]').click();
        document.querySelector('[data-inst="guitarra"]').click();
        eval('(' + fn + ')')('tuner', {
          idNota: 'tNote', nota: 'Mi2',
          idCuerda: 'tString', cuerda: '6ª',
          idHz: 'tHz', hz: '81.84 Hz',
          idObjetivo: 'tTarget', objetivo: 'objetivo 82.41 Hz',
          idCents: 'tCents', cents: '-12.0',
          estado: 'near', aguja: -14.9, pista: 'tHintUp', clavijas: ['6'],
        });
      }, montarAfinador.toString()),
  },
  {
    archivo: '2-guitarra-afinada.png',
    preparar: (p) =>
      p.evaluate((fn) => {
        document.querySelector('[data-inst="guitarra"]').click();
        eval('(' + fn + ')')('tuner', {
          idNota: 'tNote', nota: 'La2',
          idCuerda: 'tString', cuerda: '5ª',
          idHz: 'tHz', hz: '110.00 Hz',
          idObjetivo: 'tTarget', objetivo: 'objetivo 110.00 Hz',
          idCents: 'tCents', cents: '0.0',
          estado: 'ok', aguja: 0, clavijas: ['5'],
        });
      }, montarAfinador.toString()),
  },
  {
    archivo: '3-charango.png',
    preparar: (p) =>
      p.evaluate((fn) => {
        document.querySelector('[data-inst="charango"]').click();
        eval('(' + fn + ')')('tuner', {
          idNota: 'tNote', nota: 'Mi5',
          idCuerda: 'tString', cuerda: '1ª / 3ª',
          idHz: 'tHz', hz: '659.26 Hz',
          idObjetivo: 'tTarget', objetivo: 'objetivo 659.26 Hz',
          idCents: 'tCents', cents: '0.0',
          estado: 'ok', aguja: 0, clavijas: ['1a', '1b', '3b'],
        });
      }, montarAfinador.toString()),
  },
  {
    archivo: '4-ukelele.png',
    preparar: (p) =>
      p.evaluate((fn) => {
        document.querySelector('[data-inst="ukelele"]').click();
        eval('(' + fn + ')')('tuner', {
          idNota: 'tNote', nota: 'Do4',
          idCuerda: 'tString', cuerda: '3ª',
          idHz: 'tHz', hz: '263.1 Hz',
          idObjetivo: 'tTarget', objetivo: 'objetivo 261.63 Hz',
          idCents: 'tCents', cents: '+9.7',
          estado: 'near', aguja: 12.1, pista: 'tHintDown', clavijas: ['3'],
        });
      }, montarAfinador.toString()),
  },
  {
    archivo: '5-manual.png',
    preparar: (p) =>
      p.evaluate((fn) => {
        document.querySelector('.tab[data-tab="manual"]').click();
        eval('(' + fn + ')')('manual', {
          idNota: 'mNote', nota: 'Sol3',
          idHz: 'mHz', hz: '196.00 Hz',
          idObjetivo: 'mTarget', objetivo: 'objetivo 196.00 Hz',
          idCents: 'mCents', cents: '0.0',
          estado: 'ok', aguja: 0,
        });
        // En cromático la grilla marca la nota que suena.
        document.querySelector('[data-view="manual"] [data-pc="7"]').classList.add('is-on');
      }, montarAfinador.toString()),
  },
  {
    archivo: '6-metronomo.png',
    preparar: (p) =>
      p.evaluate(() => {
        document.querySelector('.tab[data-tab="metro"]').click();
        const dots = document.querySelectorAll('[data-view="metro"] .dot');
        if (dots[0]) dots[0].classList.add('is-on');
      }),
  },
  {
    archivo: '7-ajustes.png',
    preparar: (p) =>
      p.evaluate(() => {
        document.querySelector('.tab[data-tab="settings"]').click();
        document.querySelector('main').scrollTop = 0;
      }),
  },
];

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
});

const pagina = await navegador.newPage();
await pagina.setViewport({
  width: DISPOSITIVO.width,
  height: DISPOSITIVO.height,
  deviceScaleFactor: DISPOSITIVO.escala,
  isMobile: true,
});

fs.mkdirSync(SALIDA, { recursive: true });
await pagina.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });

// Se muestra la app sin comprar, que es lo que ve quien la instala, y con el
// micrófono ya concedido para que no aparezca la barra que tapa media pantalla.
await pagina.evaluate(async () => {
  const { settings } = await import('/js/store.js');
  settings.set('premium', false);
  settings.set('theme', 'noche');
  document.getElementById('micBar').classList.add('is-hidden');
  document.body.classList.remove('mic-visible');
});

for (const escena of ESCENAS) {
  await escena.preparar(pagina);
  // Cada cambio de pestaña vuelve a mostrar la barra del micrófono, así que se
  // oculta después de preparar la escena y no una sola vez al principio.
  await pagina.evaluate(() => {
    document.getElementById('micBar').classList.add('is-hidden');
    document.body.classList.remove('mic-visible');
  });
  await new Promise((r) => setTimeout(r, 300));
  const destino = path.join(SALIDA, escena.archivo);
  await pagina.screenshot({ path: destino });
  console.log('capturado:', escena.archivo);
}

await navegador.close();
console.log('\nlistas en store/' + DISPOSITIVO.carpeta + '/');
