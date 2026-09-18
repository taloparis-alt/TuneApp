// pitch.js — detección de tono por NSDF (McLeod Pitch Method).
// Robusto frente a armónicos, que es justo el problema de afinar cuerdas graves.

export class PitchDetector {
  constructor(sampleRate, bufferSize = 2048) {
    this.sampleRate = sampleRate;
    this.size = bufferSize;
    this.x = new Float32Array(bufferSize);
    this.nsdf = new Float32Array(bufferSize);
    this.rmsThreshold = 0.006; // umbral de silencio
    this.clarityThreshold = 0.86;
  }

  /**
   * @param {Float32Array} buf  muestras en el dominio del tiempo
   * @param {number} fmin       frecuencia mínima buscada (Hz)
   * @param {number} fmax       frecuencia máxima buscada (Hz)
   * @param {boolean} globalMax true cuando el rango ya está acotado a una nota
   * @returns {{freq:number, clarity:number, rms:number}}
   */
  detect(buf, fmin = 65, fmax = 1400, globalMax = false) {
    const W = this.size;
    const x = this.x;

    let mean = 0;
    for (let i = 0; i < W; i++) mean += buf[i];
    mean /= W;

    let energy = 0;
    for (let i = 0; i < W; i++) {
      const v = buf[i] - mean;
      x[i] = v;
      energy += v * v;
    }
    const rms = Math.sqrt(energy / W);
    if (rms < this.rmsThreshold) return { freq: 0, clarity: 0, rms };

    const tauMin = Math.max(2, Math.floor(this.sampleRate / fmax));
    const tauMax = Math.min(W - 2, Math.ceil(this.sampleRate / fmin));
    if (tauMax <= tauMin + 2) return { freq: 0, clarity: 0, rms };

    const nsdf = this.nsdf;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      let ac = 0;
      let m = 0;
      const n = W - tau;
      for (let i = 0; i < n; i++) {
        const a = x[i];
        const b = x[i + tau];
        ac += a * b;
        m += a * a + b * b;
      }
      nsdf[tau] = m > 0 ? (2 * ac) / m : 0;
    }

    const peak = globalMax
      ? this._globalPeak(nsdf, tauMin, tauMax)
      : this._firstStrongPeak(nsdf, tauMin, tauMax);
    if (peak < 0) return { freq: 0, clarity: 0, rms };

    // Interpolación parabólica para resolución por debajo de la muestra.
    const a = nsdf[peak - 1];
    const b = nsdf[peak];
    const c = nsdf[peak + 1];
    const denom = a - 2 * b + c;
    const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
    const tau = peak + Math.max(-1, Math.min(1, shift));
    const clarity = Math.min(1, b - 0.25 * (a - c) * shift);

    if (clarity < this.clarityThreshold) return { freq: 0, clarity, rms };
    return { freq: this.sampleRate / tau, clarity, rms };
  }

  _globalPeak(nsdf, tauMin, tauMax) {
    let best = -1;
    let bestVal = -Infinity;
    for (let t = tauMin + 1; t < tauMax; t++) {
      if (nsdf[t] > bestVal && nsdf[t] > nsdf[t - 1] && nsdf[t] >= nsdf[t + 1]) {
        bestVal = nsdf[t];
        best = t;
      }
    }
    return best;
  }

  // Máximos "clave": el mayor de cada región positiva; se elige el primero
  // que supere el 85 % del máximo global → evita el error de octava.
  _firstStrongPeak(nsdf, tauMin, tauMax) {
    let t = tauMin;
    while (t <= tauMax && nsdf[t] > 0) t++; // salta el lóbulo inicial

    const maxima = [];
    while (t <= tauMax) {
      if (nsdf[t] > 0) {
        let best = t;
        let bestVal = nsdf[t];
        while (t <= tauMax && nsdf[t] > 0) {
          if (nsdf[t] > bestVal) {
            bestVal = nsdf[t];
            best = t;
          }
          t++;
        }
        if (best > tauMin && best < tauMax) maxima.push(best);
      } else t++;
    }
    if (!maxima.length) return -1;

    let globalMax = 0;
    for (const m of maxima) if (nsdf[m] > globalMax) globalMax = nsdf[m];
    const threshold = globalMax * 0.85;
    for (const m of maxima) if (nsdf[m] >= threshold) return m;
    return maxima[0];
  }
}

/** Suavizado: mediana móvil (mata los saltos) + media exponencial (estabiliza la aguja). */
export class Smoother {
  constructor(window = 5, alpha = 0.35) {
    this.window = window;
    this.alpha = alpha;
    this.buf = [];
    this.value = null;
  }
  push(v) {
    this.buf.push(v);
    if (this.buf.length > this.window) this.buf.shift();
    const sorted = [...this.buf].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.value = this.value === null ? median : this.value + this.alpha * (median - this.value);
    return this.value;
  }
  reset() {
    this.buf = [];
    this.value = null;
  }
  get ready() {
    return this.buf.length >= Math.min(3, this.window);
  }
}
