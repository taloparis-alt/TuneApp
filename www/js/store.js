// store.js — ajustes persistentes en el dispositivo.

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
};

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
  get(k) {
    return state[k];
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
