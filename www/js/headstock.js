// headstock.js — dibuja el clavijero del instrumento en SVG (vista frontal, estilo realista).

import { midiToFreq, noteInfo } from './notes.js';

/** PRNG determinista: la veta de la madera queda igual en cada render. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function woodGrain(inst, uid) {
  const rnd = seeded(inst.id.length * 7919 + inst.pegs.length * 104729);
  let out = '';
  for (let i = 0; i < 26; i++) {
    const x = inst.grainX[0] + rnd() * (inst.grainX[1] - inst.grainX[0]);
    const w = 6 + rnd() * 26;
    const op = (0.05 + rnd() * 0.16).toFixed(3);
    const sw = (0.6 + rnd() * 1.6).toFixed(2);
    out +=
      `<path d="M ${x.toFixed(1)} 0 C ${(x + w).toFixed(1)} 110, ${(x - w).toFixed(1)} 230, ${(x + w * 0.4).toFixed(1)} ${inst.h}" ` +
      `fill="none" stroke="#1b0d06" stroke-opacity="${op}" stroke-width="${sw}"/>`;
  }
  return `<g clip-path="url(#clip-${uid})">${out}</g>`;
}

/** Posición x de la cuerda `nutIndex` sobre la cejuela. */
function nutX(inst, idx) {
  const n = inst.strings;
  const { x0, x1 } = inst.nut;
  return n === 1 ? (x0 + x1) / 2 : x0 + (idx * (x1 - x0)) / (n - 1);
}

function tunerHardware(inst, peg, y) {
  const dir = peg.side === 'L' ? -1 : 1;
  const edge = peg.side === 'L' ? inst.postX.L - 28 : inst.postX.R + 28;
  const bx = inst.buttonX[peg.side];
  const stemFrom = edge + dir * 4;
  const stemTo = bx + dir * 2;
  const x0 = Math.min(stemFrom, stemTo);
  const w = Math.abs(stemTo - stemFrom);
  return (
    `<g class="hw">` +
    `<rect x="${x0}" y="${y - 3.5}" width="${w}" height="7" rx="3" fill="url(#chrome-h)"/>` +
    `<rect x="${bx - 16}" y="${y - 9}" width="32" height="18" rx="7" fill="url(#chrome-v)" stroke="#8d97a4" stroke-width="0.7"/>` +
    `<rect x="${bx - 11}" y="${y - 5.5}" width="22" height="4" rx="2" fill="#ffffff" fill-opacity="0.55"/>` +
    `</g>`
  );
}

function pegGroup(inst, peg, a4, notation) {
  const y = inst.rows[peg.row];
  const x = inst.postX[peg.side];
  const info = noteInfo(peg.midi, notation);
  const freq = midiToFreq(peg.midi, a4);
  const nameSize = info.name.length >= 3 ? 9 : 12;
  const labelY = inst.rows[peg.row] - 16;
  const bx = inst.buttonX[peg.side];

  return (
    `<g class="peg" data-peg="${peg.id}" data-midi="${peg.midi}" data-freq="${freq.toFixed(2)}" ` +
    `role="button" tabindex="0" aria-label="${peg.course} — ${info.name}${info.octave}">` +
    tunerHardware(inst, peg, y) +
    `<text class="peg-course" x="${bx}" y="${labelY}">${peg.course}</text>` +
    `<circle class="peg-glow" cx="${x}" cy="${y}" r="24"/>` +
    `<circle class="peg-washer" cx="${x}" cy="${y}" r="20" fill="url(#chrome-v)" stroke="#7f8996" stroke-width="0.8"/>` +
    `<circle class="peg-ring" cx="${x}" cy="${y}" r="16.5" fill="url(#chrome-h)"/>` +
    `<circle class="peg-face" cx="${x}" cy="${y}" r="14.5"/>` +
    `<text class="peg-note" x="${x}" y="${y - 1}" style="font-size:${nameSize}px">${info.name}</text>` +
    `<text class="peg-oct" x="${x}" y="${y + 9}">${info.octave}</text>` +
    `<circle class="peg-hit" cx="${x}" cy="${y}" r="30"/>` +
    `</g>`
  );
}

function strings(inst) {
  let out = '';
  for (const peg of inst.pegs) {
    const x1 = nutX(inst, peg.nut);
    const y1 = inst.nut.y;
    const x2 = inst.postX[peg.side];
    const y2 = inst.rows[peg.row];
    const w = peg.gauge;
    out +=
      `<g class="str" data-peg="${peg.id}">` +
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1005" stroke-opacity="0.45" stroke-width="${w + 1.2}" stroke-linecap="round"/>` +
      `<line class="str-core" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}" stroke-linecap="round"/>` +
      `<line class="str-core" x1="${x1}" y1="${y1}" x2="${x1}" y2="${inst.h}" stroke-width="${w}" stroke-linecap="round"/>` +
      `</g>`;
  }
  return out;
}

/**
 * Devuelve el SVG completo del clavijero.
 * @param {object} inst   definición del instrumento
 * @param {number} a4     frecuencia de referencia
 * @param {string} notation 'es' | 'en'
 */
export function buildHeadstock(inst, a4, notation) {
  const uid = inst.id;
  const { x0, x1 } = inst.nut;

  return `<svg class="headstock" viewBox="${inst.viewBox}" xmlns="http://www.w3.org/2000/svg"
    role="img" aria-label="Clavijero de ${inst.name}" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="wood-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"    stop-color="#1e1109"/>
      <stop offset="0.16" stop-color="#3f2415"/>
      <stop offset="0.42" stop-color="#5a341f"/>
      <stop offset="0.6"  stop-color="#4c2c1a"/>
      <stop offset="0.86" stop-color="#2a170d"/>
      <stop offset="1"    stop-color="#170c06"/>
    </linearGradient>
    <linearGradient id="chrome-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#fdfefe"/>
      <stop offset="0.3" stop-color="#d3dae2"/>
      <stop offset="0.52" stop-color="#9aa5b2"/>
      <stop offset="0.74" stop-color="#cfd6de"/>
      <stop offset="1"   stop-color="#8e99a6"/>
    </linearGradient>
    <linearGradient id="chrome-h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"   stop-color="#9aa5b2"/>
      <stop offset="0.35" stop-color="#eef2f6"/>
      <stop offset="0.65" stop-color="#b8c1cb"/>
      <stop offset="1"   stop-color="#8e99a6"/>
    </linearGradient>
    <linearGradient id="bone-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4ecd8"/>
      <stop offset="0.5" stop-color="#ddd0b2"/>
      <stop offset="1" stop-color="#b9a986"/>
    </linearGradient>
    <clipPath id="clip-${uid}"><path d="${inst.outline}"/></clipPath>
  </defs>

  <path class="hs-drop" d="${inst.outline}"/>
  <path class="hs-body" d="${inst.outline}" fill="url(#wood-${uid})"/>
  ${woodGrain(inst, uid)}
  <g clip-path="url(#clip-${uid})">
    <path d="${inst.outline}" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="7"/>
    <circle cx="${inst.cx}" cy="${inst.rows[0] - 40}" r="2.6" fill="#241207" fill-opacity="0.8"/>
    <circle cx="${inst.cx}" cy="${inst.nut.y - 30}" r="2.6" fill="#241207" fill-opacity="0.8"/>
  </g>
  <path class="hs-edge" d="${inst.outline}"/>

  <rect class="fretboard" x="${x0 - 8}" y="${inst.nut.y + 8}" width="${x1 - x0 + 16}" height="${inst.h - inst.nut.y - 8}"/>
  ${strings(inst)}
  <rect class="nut" x="${x0 - 5}" y="${inst.nut.y - 4}" width="${x1 - x0 + 10}" height="12" rx="2.5" fill="url(#bone-${uid})"/>

  ${inst.pegs.map((p) => pegGroup(inst, p, a4, notation)).join('\n  ')}
</svg>`;
}
