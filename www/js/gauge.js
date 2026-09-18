// gauge.js — medidor de aguja compartido por el afinador y el modo manual.

const CX = 150;
const CY = 148;
const R = 122;
const MAX_CENTS = 50;
const MAX_ANGLE = 62;

function polar(angleDeg, radius) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

function ticks() {
  let out = '';
  for (let c = -50; c <= 50; c += 5) {
    const major = c % 25 === 0;
    const ang = (c / MAX_CENTS) * MAX_ANGLE;
    const [x1, y1] = polar(ang, R);
    const [x2, y2] = polar(ang, R - (major ? 16 : 9));
    out += `<line class="tick ${major ? 'tick-major' : ''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    if (major) {
      const [tx, ty] = polar(ang, R - 30);
      const label = c === 0 ? '0' : (c > 0 ? '+' : '') + c;
      out += `<text class="tick-label" x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}">${label}</text>`;
    }
  }
  return out;
}

function arcPath(fromCents, toCents, radius) {
  const [x1, y1] = polar((fromCents / MAX_CENTS) * MAX_ANGLE, radius);
  const [x2, y2] = polar((toCents / MAX_CENTS) * MAX_ANGLE, radius);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export class Gauge {
  constructor(root) {
    root.innerHTML = `
    <svg class="gauge" viewBox="0 0 300 172" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="arc arc-bed" d="${arcPath(-50, 50, R - 3)}"/>
      <path class="arc arc-ok" d="${arcPath(-5, 5, R - 3)}"/>
      <g class="ticks">${ticks()}</g>
      <g class="needle-wrap">
        <line class="needle" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 6}"/>
        <circle class="needle-hub" cx="${CX}" cy="${CY}" r="9"/>
      </g>
      <text class="g-flat" x="26" y="150">♭</text>
      <text class="g-sharp" x="274" y="150">♯</text>
    </svg>`;
    this.el = root.querySelector('.gauge');
    this.needle = root.querySelector('.needle-wrap');
    this.okArc = root.querySelector('.arc-ok');
    this.setTolerance(5);
    this.clear();
  }

  setTolerance(cents) {
    this.tolerance = cents;
    this.okArc.setAttribute('d', arcPath(-cents, cents, R - 3));
  }

  /** @param {number|null} cents  null = sin señal */
  update(cents) {
    if (cents === null || !Number.isFinite(cents)) {
      this.clear();
      return;
    }
    const clamped = Math.max(-MAX_CENTS, Math.min(MAX_CENTS, cents));
    const angle = (clamped / MAX_CENTS) * MAX_ANGLE;
    this.needle.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    const abs = Math.abs(cents);
    const state = abs <= this.tolerance ? 'ok' : abs <= 20 ? 'near' : 'far';
    this.el.dataset.state = state;
    return state;
  }

  clear() {
    this.needle.style.transform = 'rotate(0deg)';
    this.el.dataset.state = 'idle';
  }
}
