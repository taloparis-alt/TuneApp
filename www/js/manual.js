// manual.js — afinación manual libre: se elige la nota y se ve la desviación.

import { Gauge } from './gauge.js';
import { midiToFreq, noteInfo, cents as centsBetween, nearestNote, noteNames, isAltered } from './notes.js';
import { audio } from './audio.js';
import { settings } from './store.js';

const OK_HOLD_MS = 550;
const MIN_OCT = 1;
const MAX_OCT = 7;

export class ManualScreen {
  constructor(root) {
    this.root = root;
    this.chromatic = true; // true = detecta la nota más cercana sola
    this.pitchClass = 9; // La
    this.detectedPc = -1;
    this.octave = 4;
    this.okSince = 0;
    this.chimed = false;
    this.lastSignal = 0;

    root.innerHTML = `
      <div class="seg" id="mMode">
        <button class="seg-btn is-on" data-mode="auto">Cromático</button>
        <button class="seg-btn" data-mode="fixed">Nota fija <span class="lock-tag" data-lock-tag="fixed">Pro</span></button>
      </div>

      <div class="readout">
        <div class="ro-side">
          <span class="ro-string" id="mLabel">cromático</span>
          <span class="ro-mode">nota detectada</span>
        </div>
        <div class="ro-note" id="mNote">--</div>
        <div class="ro-side ro-right">
          <span class="ro-hz" id="mHz">--- Hz</span>
          <span class="ro-target" id="mTarget">objetivo —</span>
        </div>
      </div>

      <div class="gauge-wrap" id="mGauge"></div>
      <div class="cents-row">
        <span class="hint hint-down" id="mHintDown">bajá</span>
        <span class="cents" id="mCents">--</span>
        <span class="hint hint-up" id="mHintUp">subí</span>
      </div>

      <div class="picker" id="mPicker">
        <div class="note-grid" id="mGrid"></div>
        <div class="oct-row">
          <span class="oct-label">Octava</span>
          <button class="round-btn" id="mOctDown" aria-label="Bajar octava">−</button>
          <span class="oct-value" id="mOctVal">4</span>
          <button class="round-btn" id="mOctUp" aria-label="Subir octava">+</button>
        </div>
      </div>

      <p class="foot-hint">En cromático te dice qué nota estás tocando · en nota fija medís contra la que elijas</p>
    `;

    this.gauge = new Gauge(root.querySelector('#mGauge'));
    this.elNote = root.querySelector('#mNote');
    this.elLabel = root.querySelector('#mLabel');
    this.elHz = root.querySelector('#mHz');
    this.elTarget = root.querySelector('#mTarget');
    this.elCents = root.querySelector('#mCents');
    this.hintUp = root.querySelector('#mHintUp');
    this.hintDown = root.querySelector('#mHintDown');
    this.picker = root.querySelector('#mPicker');
    this.grid = root.querySelector('#mGrid');
    this.octVal = root.querySelector('#mOctVal');

    root.querySelector('#mMode').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mode]');
      if (!btn) return;
      const quiereFija = btn.dataset.mode !== 'auto';
      if (quiereFija && !settings.premium) {
        document.dispatchEvent(new CustomEvent('pedir-compra'));
        return;
      }
      this.setMode(!quiereFija);
    });

    settings.onChange((k) => {
      if (k === 'premium') this.syncBloqueo();
    });

    this.grid.addEventListener('click', (e) => {
      if (this.chromatic) return; // en cromático la grilla sólo informa
      const btn = e.target.closest('[data-pc]');
      if (!btn) return;
      this.pitchClass = Number(btn.dataset.pc);
      this.okSince = 0;
      this.chimed = false;
      this.renderPicker();
    });

    root.querySelector('#mOctDown').addEventListener('click', () => this.shiftOctave(-1));
    root.querySelector('#mOctUp').addEventListener('click', () => this.shiftOctave(1));

    settings.onChange((k) => {
      if (k === 'notation' || k === 'a4' || k === 'accidentals') this.renderPicker();
      if (k === 'tolerance') this.gauge.setTolerance(settings.get('tolerance'));
    });

    this.setMode(true);
    this.syncBloqueo();
  }

  /** Marca "Nota fija" como bloqueado mientras no se haya comprado. */
  syncBloqueo() {
    const libre = settings.premium;
    this.root.querySelectorAll('[data-lock-tag]').forEach((t) => t.classList.toggle('is-hidden', libre));
    if (!libre && !this.chromatic) this.setMode(true);
  }

  get midi() {
    return (this.octave + 1) * 12 + this.pitchClass;
  }

  setMode(chromatic) {
    this.chromatic = chromatic;
    this.okSince = 0;
    this.chimed = false;
    this.root.querySelectorAll('[data-mode]').forEach((b) => {
      b.classList.toggle('is-on', (b.dataset.mode === 'auto') === chromatic);
    });
    this.picker.classList.toggle('is-readonly', chromatic);
    this.elLabel.textContent = chromatic ? 'cromático' : 'nota fija';
    this.gauge.setTolerance(settings.get('tolerance'));
    this.renderPicker();
    this.clearReadout();
  }

  shiftOctave(d) {
    this.octave = Math.max(MIN_OCT, Math.min(MAX_OCT, this.octave + d));
    this.okSince = 0;
    this.chimed = false;
    this.renderPicker();
  }

  renderPicker() {
    const names = noteNames(settings.get('notation'), settings.get('accidentals'));
    const marcada = this.chromatic ? this.detectedPc : this.pitchClass;
    this.grid.innerHTML = names
      .map(
        (n, i) =>
          `<button class="note-btn${i === marcada ? ' is-on' : ''}${isAltered(n) ? ' is-sharp' : ''}" data-pc="${i}"${this.chromatic ? ' tabindex="-1" aria-hidden="true"' : ''}>${n}</button>`
      )
      .join('');
    this.octVal.textContent = String(this.octave);
    if (!this.chromatic) {
      const a4 = settings.get('a4');
      const info = noteInfo(this.midi, settings.get('notation'), settings.get('accidentals'));
      this.elNote.textContent = `${info.name}${info.octave}`;
      this.elTarget.textContent = `objetivo ${midiToFreq(this.midi, a4).toFixed(2)} Hz`;
    }
  }

  range() {
    const a4 = settings.get('a4');
    if (this.chromatic) return { fmin: 55, fmax: 1400, globalMax: false };
    return {
      fmin: midiToFreq(this.midi - 3, a4),
      fmax: midiToFreq(this.midi + 3, a4),
      globalMax: true,
    };
  }

  onPitch(freq) {
    const now = performance.now();
    if (!freq) {
      if (now - this.lastSignal > 900) {
        this.gauge.clear();
        this.clearReadout(true);
        this.okSince = 0;
      }
      return;
    }
    this.lastSignal = now;

    const a4 = settings.get('a4');
    const tol = settings.get('tolerance');
    const notation = settings.get('notation');

    let midi;
    let target;
    let cents;
    if (this.chromatic) {
      const n = nearestNote(freq, a4);
      midi = n.midi;
      target = n.target;
      cents = n.cents;
    } else {
      midi = this.midi;
      target = midiToFreq(midi, a4);
      cents = centsBetween(freq, target);
    }

    const info = noteInfo(midi, notation, settings.get('accidentals'));
    if (this.chromatic) this.markDetected(((midi % 12) + 12) % 12);
    this.elNote.textContent = `${info.name}${info.octave}`;
    this.elHz.textContent = `${freq.toFixed(2)} Hz`;
    this.elTarget.textContent = `objetivo ${target.toFixed(2)} Hz`;
    const shown = Math.abs(cents) < 0.05 ? 0 : Math.max(-99, Math.min(99, cents));
    this.elCents.textContent = `${shown > 0 ? '+' : ''}${shown.toFixed(1)}`;

    const state = this.gauge.update(cents);
    this.elCents.dataset.state = state;
    this.hintUp.classList.toggle('is-on', cents < -tol);
    this.hintDown.classList.toggle('is-on', cents > tol);

    if (state === 'ok') {
      if (!this.okSince) this.okSince = now;
      else if (now - this.okSince >= OK_HOLD_MS && !this.chimed) {
        this.chimed = true;
        if (settings.get('sound')) audio.okChime();
        if (settings.get('vibrate') && navigator.vibrate) navigator.vibrate([25, 40, 25]);
      }
    } else {
      this.okSince = 0;
      if (Math.abs(cents) > tol * 3) this.chimed = false;
    }
  }

  /** Marca en la grilla la nota que se está tocando (modo cromático). */
  markDetected(pc) {
    if (this.detectedPc === pc) return;
    this.detectedPc = pc;
    this.grid.querySelectorAll('[data-pc]').forEach((b) => {
      b.classList.toggle('is-on', Number(b.dataset.pc) === pc);
    });
  }

  clearReadout(keepNote = false) {
    this.elHz.textContent = '--- Hz';
    this.elCents.textContent = '--';
    this.elCents.dataset.state = 'idle';
    this.hintUp.classList.remove('is-on');
    this.hintDown.classList.remove('is-on');
    if (!keepNote && this.chromatic) {
      this.elNote.textContent = '--';
      this.elTarget.textContent = 'objetivo —';
      this.markDetected(-1);
    }
  }
}
