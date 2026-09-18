// tuner.js — pantalla principal: instrumento + clavijero + afinación automática o por clavija.

import { INSTRUMENTS, INSTRUMENT_IDS, uniqueMidis } from './instruments.js';
import { buildHeadstock } from './headstock.js';
import { Gauge } from './gauge.js';
import { midiToFreq, noteInfo, cents as centsBetween } from './notes.js';
import { audio } from './audio.js';
import { settings } from './store.js';

const OK_HOLD_MS = 550;

export class TunerScreen {
  constructor(root) {
    this.root = root;
    this.locked = null; // id de clavija fijada manualmente
    this.okSince = 0;
    this.chimedFor = null;
    this.done = new Set(); // clavijas ya afinadas en esta sesión
    this.lastSignal = 0;

    root.innerHTML = `
      <div class="seg" id="instSeg" role="tablist" aria-label="Instrumento">
        ${INSTRUMENT_IDS.map(
          (id) => `<button class="seg-btn" role="tab" data-inst="${id}">${INSTRUMENTS[id].name}</button>`
        ).join('')}
      </div>

      <div class="readout">
        <div class="ro-side">
          <span class="ro-string" id="tString">—</span>
          <span class="ro-mode" id="tMode">Automático</span>
        </div>
        <div class="ro-note" id="tNote">--</div>
        <div class="ro-side ro-right">
          <span class="ro-hz" id="tHz">--- Hz</span>
          <span class="ro-target" id="tTarget">objetivo —</span>
        </div>
      </div>

      <div class="gauge-wrap" id="tGauge"></div>
      <div class="cents-row">
        <span class="hint hint-down" id="tHintDown">aflojá</span>
        <span class="cents" id="tCents">--</span>
        <span class="hint hint-up" id="tHintUp">tensá</span>
      </div>

      <div class="hs-stage" id="tStage"></div>

      <p class="foot-hint" id="tFoot">Tocá una cuerda al aire · tocá una clavija para afinar sólo esa</p>
    `;

    this.gauge = new Gauge(root.querySelector('#tGauge'));
    this.stage = root.querySelector('#tStage');
    this.elNote = root.querySelector('#tNote');
    this.elString = root.querySelector('#tString');
    this.elMode = root.querySelector('#tMode');
    this.elHz = root.querySelector('#tHz');
    this.elTarget = root.querySelector('#tTarget');
    this.elCents = root.querySelector('#tCents');
    this.elFoot = root.querySelector('#tFoot');
    this.hintUp = root.querySelector('#tHintUp');
    this.hintDown = root.querySelector('#tHintDown');

    root.querySelector('#instSeg').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-inst]');
      if (btn) this.setInstrument(btn.dataset.inst);
    });

    this.stage.addEventListener('click', (e) => {
      const peg = e.target.closest('.peg');
      if (peg) this.togglePeg(peg.dataset.peg);
    });
    this.stage.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const peg = e.target.closest('.peg');
      if (peg) {
        e.preventDefault();
        this.togglePeg(peg.dataset.peg);
      }
    });

    settings.onChange((k) => {
      if (k === 'a4' || k === 'notation' || k === 'accidentals') this.render();
      if (k === 'tolerance') this.gauge.setTolerance(settings.get('tolerance'));
    });

    this.setInstrument(settings.get('instrument'));
  }

  get inst() {
    return INSTRUMENTS[this.instId];
  }

  setInstrument(id) {
    if (!INSTRUMENTS[id]) id = 'guitarra';
    this.instId = id;
    settings.set('instrument', id);
    this.locked = null;
    this.done.clear();
    this.chimedFor = null;
    this.render();
  }

  render() {
    const a4 = settings.get('a4');
    const notation = settings.get('notation');
    const accidentals = settings.get('accidentals');
    this.stage.innerHTML = buildHeadstock(this.inst, a4, notation, accidentals);
    this.root.querySelectorAll('[data-inst]').forEach((b) => {
      const on = b.dataset.inst === this.instId;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    this.gauge.setTolerance(settings.get('tolerance'));
    this.applyLockUI();
    this.clearReadout();
  }

  togglePeg(id) {
    this.locked = this.locked === id ? null : id;
    this.okSince = 0;
    this.chimedFor = null;
    this.applyLockUI();
    this.clearReadout();
  }

  applyLockUI() {
    const a4 = settings.get('a4');
    const notation = settings.get('notation');
    this.stage.querySelectorAll('.peg').forEach((p) => {
      p.classList.toggle('is-locked', p.dataset.peg === this.locked);
    });
    if (this.locked) {
      const peg = this.inst.pegs.find((p) => p.id === this.locked);
      const info = noteInfo(peg.midi, notation, settings.get('accidentals'));
      this.elMode.textContent = 'Clavija fija';
      this.elString.textContent = peg.course;
      this.elTarget.textContent = `objetivo ${midiToFreq(peg.midi, a4).toFixed(2)} Hz`;
      this.elNote.textContent = `${info.name}${info.octave}`;
      this.elFoot.textContent = 'Afinando sólo esta cuerda · tocá la clavija otra vez para volver a automático';
    } else {
      this.elMode.textContent = 'Automático';
      this.elFoot.textContent = 'Tocá una cuerda al aire · tocá una clavija para afinar sólo esa';
    }
  }

  /** Rango de búsqueda que necesita el detector en este momento. */
  range() {
    const a4 = settings.get('a4');
    if (this.locked) {
      const peg = this.inst.pegs.find((p) => p.id === this.locked);
      return {
        fmin: midiToFreq(peg.midi - 3, a4),
        fmax: midiToFreq(peg.midi + 3, a4),
        globalMax: true,
      };
    }
    const midis = uniqueMidis(this.inst);
    return {
      fmin: midiToFreq(midis[0] - 4, a4),
      fmax: midiToFreq(midis[midis.length - 1] + 5, a4),
      globalMax: false,
    };
  }

  onPitch(freq) {
    const now = performance.now();

    if (!freq) {
      // Se mantiene la última lectura un instante para que no parpadee.
      if (now - this.lastSignal > 900) {
        this.gauge.clear();
        this.clearReadout(true);
        this.okSince = 0;
      }
      return;
    }
    this.lastSignal = now;

    const a4 = settings.get('a4');
    const notation = settings.get('notation');
    const tol = settings.get('tolerance');

    // ¿A qué clavija corresponde lo que suena?
    let target;
    if (this.locked) {
      target = this.inst.pegs.find((p) => p.id === this.locked);
    } else {
      let best = null;
      let bestAbs = Infinity;
      for (const p of this.inst.pegs) {
        const d = Math.abs(centsBetween(freq, midiToFreq(p.midi, a4)));
        if (d < bestAbs) {
          bestAbs = d;
          best = p;
        }
      }
      target = best;
    }
    if (!target) return;

    const targetFreq = midiToFreq(target.midi, a4);
    const cents = centsBetween(freq, targetFreq);
    const info = noteInfo(target.midi, notation, settings.get('accidentals'));

    // En el charango la 1ª y la 3ª son el mismo Mi: se marcan las dos.
    const sameNote = this.inst.pegs.filter((p) => p.midi === target.midi);
    const courseLabel = this.locked
      ? target.course
      : [...new Set(sameNote.map((p) => p.course))].join(' / ');

    this.elNote.textContent = `${info.name}${info.octave}`;
    this.elString.textContent = courseLabel;
    this.elHz.textContent = `${freq.toFixed(2)} Hz`;
    this.elTarget.textContent = `objetivo ${targetFreq.toFixed(2)} Hz`;
    const shown = Math.abs(cents) < 0.05 ? 0 : Math.max(-99, Math.min(99, cents));
    this.elCents.textContent = `${shown > 0 ? '+' : ''}${shown.toFixed(1)}`;

    const state = this.gauge.update(cents);
    this.elCents.dataset.state = state;
    this.hintUp.classList.toggle('is-on', cents < -tol);
    this.hintDown.classList.toggle('is-on', cents > tol);

    const activeIds = new Set(this.locked ? [target.id] : sameNote.map((p) => p.id));
    this.stage.querySelectorAll('.peg').forEach((p) => {
      const on = activeIds.has(p.dataset.peg);
      p.classList.toggle('is-active', on);
      p.classList.toggle('is-ok', on && state === 'ok');
      p.classList.toggle('is-done', this.done.has(p.dataset.peg));
    });
    this.stage.querySelectorAll('.str').forEach((s) => {
      s.classList.toggle('is-lit', activeIds.has(s.dataset.peg));
    });

    // Confirmación sonora al sostener la cuerda afinada.
    if (state === 'ok') {
      if (!this.okSince) this.okSince = now;
      else if (now - this.okSince >= OK_HOLD_MS && this.chimedFor !== target.id) {
        this.chimedFor = target.id;
        activeIds.forEach((id) => this.done.add(id));
        if (settings.get('sound')) audio.okChime();
        if (settings.get('vibrate') && navigator.vibrate) navigator.vibrate([25, 40, 25]);
      }
    } else {
      this.okSince = 0;
      if (Math.abs(cents) > tol * 3) this.chimedFor = null;
    }
  }

  clearReadout(keepNote = false) {
    this.elHz.textContent = '--- Hz';
    this.elCents.textContent = '--';
    this.elCents.dataset.state = 'idle';
    this.hintUp.classList.remove('is-on');
    this.hintDown.classList.remove('is-on');
    this.stage.querySelectorAll('.peg').forEach((p) => {
      p.classList.remove('is-active', 'is-ok');
      p.classList.toggle('is-done', this.done.has(p.dataset.peg));
    });
    this.stage.querySelectorAll('.str').forEach((s) => s.classList.remove('is-lit'));
    if (!keepNote && !this.locked) {
      this.elNote.textContent = '--';
      this.elString.textContent = '—';
      this.elTarget.textContent = 'objetivo —';
    }
  }
}
