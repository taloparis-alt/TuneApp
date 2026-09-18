// audio.js — micrófono, contexto de audio y sonidos de la app.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.analyser = null;
    this.buffer = null;
    this.running = false;
  }

  get sampleRate() {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }

  /** Crea el AudioContext (se puede llamar sin micrófono, p. ej. para el metrónomo). */
  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  async startMic() {
    if (this.running) return true;
    this.ensureContext();

    // Los procesados del navegador arruinan la afinación: hay que apagarlos.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });

    const source = this.ctx.createMediaStreamSource(this.stream);

    // Pasaaltos suave: quita retumbe de sala y DC sin tocar el Mi grave (82 Hz).
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 55;
    hp.Q.value = 0.7;

    // Pasabajos: recorta siseo y armónicos altos que confunden al detector.
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3500;
    lp.Q.value = 0.7;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(this.analyser);

    this.buffer = new Float32Array(this.analyser.fftSize);
    this.running = true;
    return true;
  }

  stopMic() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.analyser = null;
    this.running = false;
  }

  read() {
    if (!this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.buffer);
    return this.buffer;
  }

  /** Pitido corto (confirmación de afinado, clic del metrónomo). */
  beep({ freq = 880, duration = 0.12, type = 'sine', gain = 0.18, when = 0 } = {}) {
    const ctx = this.ensureContext();
    const t = when || ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /** Acorde corto y agradable para "cuerda afinada". */
  okChime() {
    const ctx = this.ensureContext();
    const t = ctx.currentTime;
    this.beep({ freq: 880, duration: 0.11, gain: 0.14, when: t });
    this.beep({ freq: 1318.5, duration: 0.18, gain: 0.12, when: t + 0.085 });
  }
}

export const audio = new AudioEngine();
