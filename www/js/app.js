// app.js — navegación, ajustes, bucle de análisis y permisos.

import { audio } from './audio.js';
import { PitchDetector, Smoother } from './pitch.js';
import { settings } from './store.js';
import { TunerScreen } from './tuner.js';
import { ManualScreen } from './manual.js';
import { MetronomeScreen } from './metronome.js';

const THEMES = [
  { id: 'noche', name: 'Noche', bg: '#0b0e14', panel: '#161c27', brand: '#56a8ff', accent: '#29d98c' },
  { id: 'madera', name: 'Madera', bg: '#14100c', panel: '#1e1813', brand: '#e8a33d', accent: '#8fc93a' },
  { id: 'dia', name: 'Día', bg: '#f6f4f0', panel: '#ffffff', brand: '#2f6fd0', accent: '#12965a' },
  { id: 'grafito', name: 'Grafito', bg: '#121212', panel: '#262626', brand: '#b8e62e', accent: '#ff6b4a' },
];

const ANALYSIS_INTERVAL_MS = 55;
const SILENT_FRAMES_TO_RESET = 6;

const screens = {};
let active = null;
let detector = null;
const smoother = new Smoother(5, 0.4);
let silentFrames = 0;
let lastAnalysis = 0;
let wakeLock = null;

/* -------------------------------------------------------------------- temas */

function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  document.documentElement.dataset.theme = t.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.bg);
  // En tema claro la barra de estado de iOS debe ir oscura sobre fondo claro.
  const bar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (bar) bar.setAttribute('content', t.id === 'dia' ? 'default' : 'black-translucent');
}

/* ---------------------------------------------------------------- pantallas */

function showMicBar(show) {
  document.getElementById('micBar').classList.toggle('is-hidden', !show);
  document.body.classList.toggle('mic-visible', show);
}

function setTab(name) {
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('is-active', v.dataset.view === name);
  });
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-on', on);
    t.setAttribute('aria-current', on ? 'page' : 'false');
  });

  active = name === 'tuner' ? screens.tuner : name === 'manual' ? screens.manual : null;
  smoother.reset();
  silentFrames = 0;

  const needsMic = name === 'tuner' || name === 'manual';
  showMicBar(needsMic && !audio.running);
  if (needsMic) requestWakeLock();
}

/* ------------------------------------------------------------------- ajustes */

function buildSettings(root) {
  root.innerHTML = `
    <h2 class="sec-title">Apariencia</h2>
    <div class="card">
      <div class="themes" id="sThemes">
        ${THEMES.map(
          (t) => `<button class="theme-card" data-theme="${t.id}">
            <span class="swatch">
              <i style="background:${t.bg}"></i>
              <i style="background:${t.panel}"></i>
              <i style="background:${t.brand}"></i>
              <i style="background:${t.accent}"></i>
            </span>
            <span class="theme-name">${t.name}</span>
          </button>`
        ).join('')}
      </div>
    </div>

    <h2 class="sec-title">Frecuencia de referencia</h2>
    <div class="card">
      <div class="a4-box">
        <button class="round-btn big" id="sA4Down" aria-label="Bajar frecuencia">−</button>
        <div class="a4-value"><span id="sA4">440.0</span><small>Hz</small></div>
        <button class="round-btn big" id="sA4Up" aria-label="Subir frecuencia">+</button>
      </div>
      <input class="slider" id="sA4Slider" type="range" min="415" max="466" step="0.1" value="440" aria-label="Frecuencia de referencia La4">
      <div class="row-between">
        <span class="muted">La4 · afecta a todas las notas</span>
        <button class="btn-ghost sm" id="sA4Reset">Volver a 440.0</button>
      </div>
      <div class="chips" id="sA4Presets">
        <button class="chip" data-a4="432">432</button>
        <button class="chip" data-a4="435">435</button>
        <button class="chip" data-a4="440">440</button>
        <button class="chip" data-a4="442">442</button>
        <button class="chip" data-a4="444">444</button>
      </div>
    </div>

    <h2 class="sec-title">Precisión</h2>
    <div class="card">
      <div class="row-between">
        <span>Margen de afinado</span>
        <div class="seg sm" id="sTol">
          <button class="seg-btn" data-tol="3">±3</button>
          <button class="seg-btn" data-tol="5">±5</button>
          <button class="seg-btn" data-tol="10">±10</button>
        </div>
      </div>
      <p class="muted sm-text">Cents de tolerancia para dar la cuerda por afinada.</p>
    </div>

    <h2 class="sec-title">Preferencias</h2>
    <div class="card">
      <div class="row-between">
        <span>Nombres de notas</span>
        <div class="seg sm" id="sNotation">
          <button class="seg-btn" data-not="es">Do Re Mi</button>
          <button class="seg-btn" data-not="en">C D E</button>
        </div>
      </div>
      <label class="switch row-between">
        <span>Sonido al quedar afinada</span>
        <input type="checkbox" id="sSound">
      </label>
      <label class="switch row-between">
        <span>Vibración</span>
        <input type="checkbox" id="sVibrate">
      </label>
    </div>

    <h2 class="sec-title">Afinaciones</h2>
    <div class="card tunings">
      <div><strong>Guitarra</strong><span>Mi2 · La2 · Re3 · Sol3 · Si3 · Mi4</span></div>
      <div><strong>Ukelele</strong><span>Sol4 · Do4 · Mi4 · La4</span></div>
      <div><strong>Charango</strong><span>Sol4 · Do5 · Mi5+Mi4 · La4 · Mi5</span></div>
    </div>

    <p class="muted sm-text center">Afinador · funciona sin conexión</p>
  `;

  const elA4 = root.querySelector('#sA4');
  const slider = root.querySelector('#sA4Slider');

  const applyA4 = (v) => {
    const a4 = Math.max(415, Math.min(466, Math.round(v * 10) / 10));
    settings.set('a4', a4);
  };

  const syncA4 = () => {
    const a4 = settings.get('a4');
    elA4.textContent = a4.toFixed(1);
    if (slider.value !== String(a4)) slider.value = String(a4);
    root.querySelectorAll('[data-a4]').forEach((c) => {
      c.classList.toggle('is-on', Number(c.dataset.a4) === a4);
    });
  };

  slider.addEventListener('input', () => applyA4(Number(slider.value)));
  root.querySelector('#sA4Down').addEventListener('click', () => applyA4(settings.get('a4') - 0.1));
  root.querySelector('#sA4Up').addEventListener('click', () => applyA4(settings.get('a4') + 0.1));
  root.querySelector('#sA4Reset').addEventListener('click', () => applyA4(440));
  root.querySelector('#sA4Presets').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-a4]');
    if (chip) applyA4(Number(chip.dataset.a4));
  });

  root.querySelector('#sThemes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme]');
    if (b) settings.set('theme', b.dataset.theme);
  });

  root.querySelector('#sTol').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tol]');
    if (b) settings.set('tolerance', Number(b.dataset.tol));
  });
  root.querySelector('#sNotation').addEventListener('click', (e) => {
    const b = e.target.closest('[data-not]');
    if (b) settings.set('notation', b.dataset.not);
  });

  const chkSound = root.querySelector('#sSound');
  const chkVib = root.querySelector('#sVibrate');
  chkSound.addEventListener('change', () => settings.set('sound', chkSound.checked));
  chkVib.addEventListener('change', () => settings.set('vibrate', chkVib.checked));

  const syncAll = () => {
    syncA4();
    chkSound.checked = settings.get('sound');
    chkVib.checked = settings.get('vibrate');
    root.querySelectorAll('[data-tol]').forEach((b) => {
      b.classList.toggle('is-on', Number(b.dataset.tol) === settings.get('tolerance'));
    });
    root.querySelectorAll('[data-not]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.not === settings.get('notation'));
    });
    root.querySelectorAll('[data-theme]').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.theme === settings.get('theme'));
    });
  };

  settings.onChange(syncAll);
  syncAll();
}

/* ------------------------------------------------------------ bucle de audio */

function loop(now) {
  requestAnimationFrame(loop);
  if (!audio.running || !active || document.hidden) return;
  if (now - lastAnalysis < ANALYSIS_INTERVAL_MS) return;
  lastAnalysis = now;

  const buf = audio.read();
  if (!buf) return;

  const { fmin, fmax, globalMax } = active.range();
  const res = detector.detect(buf, fmin, fmax, globalMax);

  if (res.freq > 0) {
    silentFrames = 0;
    const smoothed = smoother.push(res.freq);
    active.onPitch(smoother.ready ? smoothed : 0);
  } else {
    silentFrames++;
    if (silentFrames > SILENT_FRAMES_TO_RESET) smoother.reset();
    active.onPitch(0);
  }
}

/* ------------------------------------------------------------------ permisos */

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {
    /* no es crítico */
  }
}

async function enableMic() {
  const btn = document.getElementById('micBtn');
  const msg = document.getElementById('micMsg');
  btn.disabled = true;
  btn.textContent = 'Activando…';
  try {
    await audio.startMic();
    detector = new PitchDetector(audio.sampleRate, 2048);
    smoother.reset();
    showMicBar(false);
    btn.disabled = false;
    btn.textContent = 'Activar micrófono';
    requestWakeLock();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Reintentar';
    msg.textContent =
      err && err.name === 'NotAllowedError'
        ? 'Permiso denegado. Habilitá el micrófono para este sitio y volvé a intentar.'
        : 'No se pudo abrir el micrófono: ' + (err && err.message ? err.message : 'error desconocido');
    msg.classList.remove('is-hidden');
  }
}

/* --------------------------------------------------------------------- init */

function init() {
  applyTheme(settings.get('theme'));
  settings.onChange((k, v) => {
    if (k === 'theme') applyTheme(v);
  });

  screens.tuner = new TunerScreen(document.querySelector('[data-view="tuner"]'));
  screens.manual = new ManualScreen(document.querySelector('[data-view="manual"]'));
  screens.metro = new MetronomeScreen(document.querySelector('[data-view="metro"]'));
  buildSettings(document.querySelector('[data-view="settings"]'));

  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) setTab(tab.dataset.tab);
  });

  document.getElementById('micBtn').addEventListener('click', enableMic);

  const badge = document.getElementById('a4Badge');
  const syncBadge = () => {
    badge.textContent = `${settings.get('a4').toFixed(1)} Hz`;
  };
  badge.addEventListener('click', () => setTab('settings'));
  settings.onChange(syncBadge);
  syncBadge();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
      requestWakeLock();
    } else {
      smoother.reset();
    }
  });

  setTab('tuner');
  requestAnimationFrame(loop);

  const isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !isLocalDev) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

init();
