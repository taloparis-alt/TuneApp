// metronome.js — metrónomo con planificación por reloj de audio (no usa setTimeout para sonar,
// así no se desfasa aunque el navegador se ponga lento).

import { audio } from './audio.js';
import { settings } from './store.js';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12; // segundos
const MIN_BPM = 30;
const MAX_BPM = 300;

// Cada par es [límite superior, nombre): el nombre describe el tramo por debajo del límite.
const TEMPI = [
  [40, 'Grave'],
  [60, 'Largo'],
  [66, 'Larghetto'],
  [76, 'Adagio'],
  [108, 'Andante'],
  [120, 'Moderato'],
  [168, 'Allegro'],
  [200, 'Presto'],
  [Infinity, 'Prestissimo'],
];

function tempoName(bpm) {
  return TEMPI.find(([max]) => bpm < max)[1];
}

export class MetronomeScreen {
  constructor(root) {
    this.root = root;
    this.playing = false;
    this.beat = 0;
    this.nextTime = 0;
    this.timer = null;
    this.queue = [];
    this.taps = [];
    this.rafId = null;

    root.innerHTML = `
      <div class="metro">
        <div class="bpm-box">
          <div class="bpm-value" id="kBpm">90</div>
          <div class="bpm-unit">BPM · <span id="kTempo">Andante</span></div>
        </div>

        <div class="beat-dots" id="kDots"></div>

        <div class="bpm-controls">
          <button class="round-btn big" id="kMinus" aria-label="Bajar BPM">−</button>
          <input class="slider" id="kSlider" type="range" min="${MIN_BPM}" max="${MAX_BPM}" step="1" value="90" aria-label="Tempo">
          <button class="round-btn big" id="kPlus" aria-label="Subir BPM">+</button>
        </div>

        <div class="metro-row">
          <label class="field">
            <span class="field-label">Compás</span>
            <select id="kBeats" class="select">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 12].map((n) => `<option value="${n}">${n}/4</option>`).join('')}
            </select>
          </label>
          <label class="switch">
            <input type="checkbox" id="kAccent" checked>
            <span>Acentuar el 1</span>
          </label>
        </div>

        <div class="metro-actions">
          <button class="btn-primary big-btn" id="kPlay">Iniciar</button>
          <button class="btn-ghost" id="kTap">Tap tempo</button>
        </div>
      </div>
    `;

    this.elBpm = root.querySelector('#kBpm');
    this.elTempo = root.querySelector('#kTempo');
    this.elDots = root.querySelector('#kDots');
    this.slider = root.querySelector('#kSlider');
    this.selBeats = root.querySelector('#kBeats');
    this.chkAccent = root.querySelector('#kAccent');
    this.btnPlay = root.querySelector('#kPlay');

    // silent: arrastrar el slider no debe vibrar en cada paso
    this.slider.addEventListener('input', () => this.setBpm(Number(this.slider.value), true));
    root.querySelector('#kMinus').addEventListener('click', () => this.setBpm(this.bpm - 1));
    root.querySelector('#kPlus').addEventListener('click', () => this.setBpm(this.bpm + 1));
    this.selBeats.addEventListener('change', () => {
      settings.set('beats', Number(this.selBeats.value));
      this.beat = 0;
      this.renderDots();
    });
    this.chkAccent.addEventListener('change', () => settings.set('accent', this.chkAccent.checked));
    this.btnPlay.addEventListener('click', () => this.toggle());
    root.querySelector('#kTap').addEventListener('click', () => this.tap());

    this.setBpm(settings.get('bpm'), true);
    this.selBeats.value = String(settings.get('beats'));
    this.chkAccent.checked = settings.get('accent');
    this.renderDots();
  }

  get bpm() {
    return settings.get('bpm');
  }
  get beats() {
    return settings.get('beats');
  }

  setBpm(v, silent = false) {
    const bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(v)));
    settings.set('bpm', bpm);
    this.elBpm.textContent = String(bpm);
    this.elTempo.textContent = tempoName(bpm);
    if (this.slider.value !== String(bpm)) this.slider.value = String(bpm);
    if (!silent && settings.get('vibrate') && navigator.vibrate) navigator.vibrate(4);
  }

  renderDots() {
    this.elDots.innerHTML = Array.from(
      { length: this.beats },
      (_, i) => `<span class="dot${i === 0 ? ' dot-accent' : ''}" data-i="${i}"></span>`
    ).join('');
  }

  tap() {
    const now = performance.now();
    if (this.taps.length && now - this.taps[this.taps.length - 1] > 2200) this.taps = [];
    this.taps.push(now);
    if (this.taps.length > 5) this.taps.shift();
    if (this.taps.length < 2) return;
    let sum = 0;
    for (let i = 1; i < this.taps.length; i++) sum += this.taps[i] - this.taps[i - 1];
    const avg = sum / (this.taps.length - 1);
    this.setBpm(60000 / avg);
  }

  toggle() {
    this.playing ? this.stop() : this.start();
  }

  start() {
    const ctx = audio.ensureContext();
    this.playing = true;
    this.beat = 0;
    this.queue = [];
    this.nextTime = ctx.currentTime + 0.08;
    this.btnPlay.textContent = 'Detener';
    this.btnPlay.classList.add('is-playing');
    this.timer = setInterval(() => this.scheduler(), LOOKAHEAD_MS);
    this.drawLoop();
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    cancelAnimationFrame(this.rafId);
    this.btnPlay.textContent = 'Iniciar';
    this.btnPlay.classList.remove('is-playing');
    this.elDots.querySelectorAll('.dot').forEach((d) => d.classList.remove('is-on'));
  }

  scheduler() {
    const ctx = audio.ctx;
    if (!ctx) return;
    const spb = 60 / this.bpm;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const accent = this.chkAccent.checked && this.beat === 0;
      audio.beep({
        freq: accent ? 1560 : 990,
        duration: accent ? 0.055 : 0.04,
        gain: accent ? 0.3 : 0.2,
        type: 'square',
        when: this.nextTime,
      });
      this.queue.push({ beat: this.beat, time: this.nextTime });
      this.nextTime += spb;
      this.beat = (this.beat + 1) % this.beats;
    }
  }

  drawLoop() {
    const step = () => {
      if (!this.playing) return;
      const ctx = audio.ctx;
      let current = null;
      while (this.queue.length && this.queue[0].time <= ctx.currentTime) {
        current = this.queue.shift().beat;
      }
      if (current !== null) {
        this.elDots.querySelectorAll('.dot').forEach((d) => {
          d.classList.toggle('is-on', Number(d.dataset.i) === current);
        });
        if (current === 0 && settings.get('vibrate') && navigator.vibrate) navigator.vibrate(12);
      }
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }
}
