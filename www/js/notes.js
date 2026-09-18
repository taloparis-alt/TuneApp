// notes.js — matemática de notas y conversión de frecuencias.

// Cifrado latino y anglosajón, cada uno con sostenidos o bemoles.
// La nota es la misma; sólo cambia cómo se la nombra.
const NAMES = {
  es: {
    sharp: ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'],
    flat: ['Do', 'Re♭', 'Re', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si'],
  },
  en: {
    sharp: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'],
    flat: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'],
  },
};

/** Los doce nombres del cifrado elegido, en orden cromático desde Do. */
export function noteNames(notation = 'es', accidentals = 'sharp') {
  return (NAMES[notation] || NAMES.es)[accidentals === 'flat' ? 'flat' : 'sharp'];
}

/** true si el nombre lleva alteración (para diferenciarlas en la grilla). */
export function isAltered(name) {
  return name.includes('♯') || name.includes('♭');
}

/** Frecuencia (Hz) de un número MIDI, según la referencia A4 elegida. */
export function midiToFreq(midi, a4 = 440) {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/** Número MIDI fraccionario de una frecuencia. */
export function freqToMidi(freq, a4 = 440) {
  return 69 + 12 * Math.log2(freq / a4);
}

/** Desviación en cents de `freq` respecto de `target`. */
export function cents(freq, target) {
  return 1200 * Math.log2(freq / target);
}

/** Nombre y octava de una nota: { name, octave, midi } */
export function noteInfo(midi, notation = 'es', accidentals = 'sharp') {
  const m = Math.round(midi);
  return {
    name: noteNames(notation, accidentals)[((m % 12) + 12) % 12],
    octave: Math.floor(m / 12) - 1,
    midi: m,
  };
}

/** Nota cromática más cercana a una frecuencia, con su desviación. */
export function nearestNote(freq, a4 = 440) {
  const midiFloat = freqToMidi(freq, a4);
  const midi = Math.round(midiFloat);
  const target = midiToFreq(midi, a4);
  return { midi, target, cents: cents(freq, target) };
}
