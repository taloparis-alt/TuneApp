// instruments.js — afinaciones estándar y geometría del clavijero de cada instrumento.
//
// Cada "peg" (clavija) tiene:
//   id        identificador único
//   course    etiqueta de cuerda/orden que se muestra al usuario ("6ª", "3ª 8va"...)
//   midi      nota objetivo en número MIDI
//   side      'L' | 'R'  → de qué lado del clavijero está
//   row       fila (0 = arriba)
//   nut       índice de la cuerda en la cejuela, de izquierda a derecha
//   gauge     grosor relativo de la cuerda (para dibujarla)

const G = {
  viewBox: '40 0 280 340',  // recortado al contenido real
  cx: 180, // eje de simetría
  h: 340, // alto del lienzo
};

export const INSTRUMENTS = {
  guitarra: {
    id: 'guitarra',
    name: 'Guitarra',
    short: 'Guit.',
    strings: 6,
    ...G,
    // Contorno de clavijero de acústica, 3+3
    outline:
      'M 132 302 C 130 294 128 288 124 284 L 108 108 ' +
      'C 108 70 120 42 142 24 C 153 16 166 12 180 9 ' +
      'C 194 12 207 16 218 24 C 240 42 252 70 252 108 L 236 284 ' +
      'C 232 288 230 294 228 302 Z',
    grainX: [110, 250],
    rows: [86, 168, 250],
    postX: { L: 150, R: 210 },
    buttonX: { L: 62, R: 298 },
    nut: { y: 300, x0: 142, x1: 218 },
    // El orden sigue el recorrido real del clavijero: arranca en la 1ª abajo a la
    // derecha, sube hasta la 3ª, da la vuelta arriba y baja por la izquierda.
    pegs: [
      { id: '1', course: '1ª', midi: 64, side: 'R', row: 2, nut: 5, gauge: 1.1 },
      { id: '2', course: '2ª', midi: 59, side: 'R', row: 1, nut: 4, gauge: 1.3 },
      { id: '3', course: '3ª', midi: 55, side: 'R', row: 0, nut: 3, gauge: 1.6 },
      { id: '4', course: '4ª', midi: 50, side: 'L', row: 0, nut: 2, gauge: 1.9 },
      { id: '5', course: '5ª', midi: 45, side: 'L', row: 1, nut: 1, gauge: 2.2 },
      { id: '6', course: '6ª', midi: 40, side: 'L', row: 2, nut: 0, gauge: 2.6 },
    ],
  },

  ukelele: {
    id: 'ukelele',
    name: 'Ukelele',
    short: 'Uke',
    strings: 4,
    ...G,
    // Afinación soprano/concierto Sol-Do-Mi-La (reentrante)
    outline:
      'M 134 302 C 132 294 130 288 126 284 L 112 138 ' +
      'C 112 96 130 56 180 32 C 230 56 248 96 248 138 L 234 284 ' +
      'C 230 288 228 294 226 302 Z',
    grainX: [114, 246],
    rows: [112, 222],
    postX: { L: 150, R: 210 },
    buttonX: { L: 62, R: 298 },
    nut: { y: 300, x0: 146, x1: 214 },
    pegs: [
      { id: '1', course: '1ª', midi: 69, side: 'R', row: 1, nut: 3, gauge: 1.4 },
      { id: '2', course: '2ª', midi: 64, side: 'R', row: 0, nut: 2, gauge: 1.7 },
      { id: '3', course: '3ª', midi: 60, side: 'L', row: 0, nut: 1, gauge: 2.1 },
      { id: '4', course: '4ª', midi: 67, side: 'L', row: 1, nut: 0, gauge: 1.8 },
    ],
  },

  charango: {
    id: 'charango',
    name: 'Charango',
    short: 'Char.',
    strings: 10,
    ...G,
    // Temple estándar: 5ª Sol · 4ª Do · 3ª Mi (con octava grave) · 2ª La · 1ª Mi
    outline:
      'M 134 302 C 132 294 130 288 126 284 L 114 74 ' +
      'C 114 46 126 26 146 14 C 156 8 168 5 180 3 ' +
      'C 192 5 204 8 214 14 C 234 26 246 46 246 74 L 234 284 ' +
      'C 230 288 228 294 226 302 Z',
    grainX: [116, 244],
    rows: [54, 108, 162, 216, 270],
    postX: { L: 152, R: 208 },
    buttonX: { L: 64, R: 296 },
    nut: { y: 300, x0: 140, x1: 220 },
    // Mismo criterio que la guitarra, con las 10 cuerdas numeradas de la 1 a la 10:
    // la 1 abajo a la derecha, se sube hasta la 5, se da la vuelta arriba y se baja
    // por la izquierda hasta la 10. Las dos cuerdas de cada orden quedan contiguas,
    // salvo el 3er orden, que es el que cae justo en la vuelta.
    pegs: [
      { id: '1a', course: '1ª', midi: 76, side: 'R', row: 4, nut: 9, gauge: 1.2 },
      { id: '1b', course: '1ª', midi: 76, side: 'R', row: 3, nut: 8, gauge: 1.2 },
      { id: '2a', course: '2ª', midi: 69, side: 'R', row: 2, nut: 7, gauge: 1.4 },
      { id: '2b', course: '2ª', midi: 69, side: 'R', row: 1, nut: 6, gauge: 1.4 },
      { id: '3a', course: '3ª', midi: 76, side: 'R', row: 0, nut: 5, gauge: 1.2 },
      { id: '3b', course: '3ª 8va', midi: 64, side: 'L', row: 0, nut: 4, gauge: 2.1, octave: true },
      { id: '4a', course: '4ª', midi: 72, side: 'L', row: 1, nut: 3, gauge: 1.5 },
      { id: '4b', course: '4ª', midi: 72, side: 'L', row: 2, nut: 2, gauge: 1.5 },
      { id: '5a', course: '5ª', midi: 67, side: 'L', row: 3, nut: 1, gauge: 1.8 },
      { id: '5b', course: '5ª', midi: 67, side: 'L', row: 4, nut: 0, gauge: 1.8 },
    ],
  },
};

export const INSTRUMENT_IDS = ['guitarra', 'ukelele', 'charango'];

/** Notas MIDI distintas que puede tener un instrumento (para la detección automática). */
export function uniqueMidis(inst) {
  return [...new Set(inst.pegs.map((p) => p.midi))].sort((a, b) => a - b);
}
