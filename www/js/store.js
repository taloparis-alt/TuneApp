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
  instalado: null,     // cuándo se abrió la app por primera vez (ver más abajo)
};

// ---------------------------------------------------------------- TuneApp Pro
//
// La primera versión publicada sale **gratis y completa**: el cobro todavía no
// se puede activar porque falta la cuenta de cobro en Play Console.
//
// Para encenderlo después alcanza con poner PRO_ACTIVO en true y INICIO_DE_PRO
// en la fecha en que empieza a regir. Nada más cambia.
const PRO_ACTIVO = false;

// Fecha (ms) desde la cual las funciones pasan a ser de pago. Quien ya tenía la
// app instalada antes de ese momento **las conserva para siempre**: le fueron
// dadas y sacárselas sería un robo de funciones, que es justo lo que llena de
// malas valoraciones a las apps que empiezan gratis. Sólo paga el que llega
// después. Por eso la fecha de instalación se guarda desde la versión gratuita:
// si no se registrara ahora, más adelante no habría forma de distinguirlos.
const INICIO_DE_PRO = null;

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

/** true si Pro ya rige y además esta app se instaló antes de que existiera. */
function esVeterano() {
  return INICIO_DE_PRO !== null && state.instalado !== null && state.instalado < INICIO_DE_PRO;
}

/** true si en este momento hay algo bloqueado para este usuario. */
function hayBloqueo() {
  return PRO_ACTIVO && state.premium !== true && !esVeterano();
}

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

const state = load();
const listeners = new Set();

// Se sella la fecha de instalación la primera vez que se abre la app, pase lo
// que pase después. Si el guardado falla (modo privado) queda en memoria: en el
// peor caso el usuario cuenta como nuevo, que es el estado con el que ya venía.
if (state.instalado === null) {
  state.instalado = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin almacenamiento: se sigue igual */
  }
}

export const settings = {
  /** Valor vigente: respeta los bloqueos si corresponde. */
  get(k) {
    if (hayBloqueo() && k in GRATIS) return GRATIS[k];
    return state[k];
  },

  /** Valor realmente guardado, ignorando bloqueos. Lo usa la pantalla de ajustes. */
  getRaw(k) {
    return state[k];
  },

  /** true si ese ajuste está bloqueado en este momento. */
  isLocked(k) {
    return hayBloqueo() && k in GRATIS;
  },

  get premium() {
    return state.premium === true;
  },

  /** false mientras la app sea enteramente gratis: las pantallas no ofrecen comprar. */
  get proDisponible() {
    return PRO_ACTIVO;
  },

  /** true si conserva las funciones por haber instalado antes de que Pro existiera. */
  get veterano() {
    return esVeterano();
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
