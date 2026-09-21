// store.js — ajustes persistentes en el dispositivo y control de lo que está bloqueado.

const KEY = 'afinador.v1';

const DEFAULTS = {
  a4: 440.0,
  theme: 'noche',      // noche | madera | dia | grafito
  instrument: 'guitarra',
  notation: 'es',      // 'es' = Do Re Mi · 'en' = C D E
  accidentals: 'sharp', // 'sharp' = Do♯ · 'flat' = Re♭
  tolerance: 5,        // cents que se consideran "afinado"
  sound: true,         // pitido al quedar afinada
  vibrate: true,
  bpm: 90,
  beats: 4,
  accent: true,
  premium: false,      // compra única "sin publicidad + extras"
};

// Valores que rigen mientras no se haya comprado. Lo que el usuario haya elegido
// antes NO se borra: sigue guardado y vuelve a aplicarse apenas compra.
const GRATIS = {
  theme: 'noche',
  a4: 440.0,
  tolerance: 5,
  beats: 4,
  accent: true,
};

/** Ajustes que sólo están disponibles con la compra. */
export const BLOQUEADOS = Object.keys(GRATIS);

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

const state = load();
const listeners = new Set();

export const settings = {
  /** Valor vigente: respeta los bloqueos si no se compró. */
  get(k) {
    if (!state.premium && k in GRATIS) return GRATIS[k];
    return state[k];
  },

  /** Valor realmente guardado, ignorando bloqueos. Lo usa la pantalla de ajustes. */
  getRaw(k) {
    return state[k];
  },

  /** true si ese ajuste está bloqueado en este momento. */
  isLocked(k) {
    return !state.premium && k in GRATIS;
  },

  get premium() {
    return state.premium === true;
  },

  all() {
    return { ...state };
  },

  set(k, v) {
    if (state[k] === v) return;
    state[k] = v;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* modo privado: seguimos en memoria */
    }
    listeners.forEach((fn) => fn(k, v));
    // Comprar o perder la compra cambia de golpe todos los valores vigentes,
    // así que se avisa de cada uno para que las pantallas se rearmen.
    if (k === 'premium') BLOQUEADOS.forEach((b) => listeners.forEach((fn) => fn(b, this.get(b))));
  },

  reset(k) {
    this.set(k, DEFAULTS[k]);
  },

  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  DEFAULTS,
};
