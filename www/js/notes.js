// notes.js — matemática de notas y conversión de frecuencias

export const NOTES_ES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const NOTES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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

/** Nombre de nota: { name, octave, label } */
export function noteInfo(midi, notation = 'es') {
  const m = Math.round(midi);
  const names = notation === 'en' ? NOTES_EN : NOTES_ES;
  return {
    name: names[((m % 12) + 12) % 12],
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
