import { easeOutCubic } from '../core/motion';

const INTRO_EVENT = 'omerta:intro-done';
export const onIntroDone = (fn: () => void): void => {
  if (document.documentElement.classList.contains('intro-done')) fn();
  else window.addEventListener(INTRO_EVENT, fn, { once: true });
};
const finish = (): void => {
  (window as unknown as { __introDoneAt?: number }).__introDoneAt = performance.now();
  document.documentElement.classList.add('intro-done');
  window.dispatchEvent(new Event(INTRO_EVENT));
};

/** Odometer: one masked column per digit; only changed digits roll. */
class Odometer {
  private cols: HTMLElement[] = [];
  private shown = 0;
  constructor(host: HTMLElement) {
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('span');
      c.className = 'odo-col';
      c.innerHTML = '<span></span>';
      host.appendChild(c);
      this.cols.push(c);
    }
    this.render(0, true);
  }
  private digits(n: number): string[] {
    const s = String(n);
    return ['', '', ''].map((_, i) => s[s.length - 3 + i] ?? '');
  }
  render(n: number, instant = false): void {
    const from = this.digits(this.shown);
    const to = this.digits(n);
    this.shown = n;
    to.forEach((d, i) => {
      const col = this.cols[i];
      if (from[i] === d && !instant) return;
      const old = col.lastElementChild as HTMLElement;
      const incoming = document.createElement('span');
      incoming.textContent = d;
      if (instant) {
        col.replaceChildren(incoming);
        return;
      }
      incoming.style.transform = 'translateY(100%)';
      col.appendChild(incoming);
      const t0 = performance.now();
      const step = (now: number): void => {
        const p = easeOutCubic(Math.min(1, (now - t0) / 180));
        incoming.style.transform = `translateY(${(1 - p) * 100}%)`;
        old.style.transform = `translateY(${-p * 100}%)`;
        if (p < 1) requestAnimationFrame(step);
        else old.remove();
      };
      requestAnimationFrame(step);
    });
  }
}

export const initLoader = (): void => {
  const root = document.documentElement;
  const loader = document.querySelector<HTMLElement>('[data-loader]');
  if (!loader || !root.classList.contains('intro-play')) {
    finish();
    return;
  }
  const mark = loader.querySelector<HTMLElement>('[data-loader-mark]')!;
  const odoHost = loader.querySelector<HTMLElement>('[data-odo]')!;
  const odo = new Odometer(odoHost);
  const t0 = performance.now();
  const MIN = 1250;
  const MAX = 2200;

  // Real readiness signals: fonts + the hero poster image.
  let ready = 0;
  const poster = document.querySelector<HTMLImageElement>('[data-hero-poster]');
  const signals: Promise<unknown>[] = [
    document.fonts.ready,
    poster && !poster.complete ? new Promise((r) => poster.addEventListener('load', r, { once: true })) : Promise.resolve(),
  ];
  signals.forEach((p) => p.then(() => (ready += 1 / signals.length)));

  loader.classList.add('is-drawing');
  let shown = 0;
  let lastStep = 0;
  const tick = (now: number): void => {
    const elapsed = now - t0;
    const timeShare = Math.min(1, elapsed / MIN);
    const target = Math.round(Math.min(ready, timeShare) * 100);
    const forced = elapsed > MAX;
    const goal = forced ? 100 : target;
    if (goal > shown && now - lastStep > 70) {
      shown = goal - shown > 12 ? goal : shown + Math.max(1, Math.round((goal - shown) / 3));
      lastStep = now;
      odo.render(shown);
    }
    if (shown >= 100 && elapsed > MIN) open();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const open = (): void => {
    loader.classList.add('is-drawn');
    try {
      sessionStorage.setItem('omerta:intro', '1');
    } catch {}
    window.setTimeout(() => {
      loader.classList.add('is-open');
      dock();
      finish();
    }, 260);
  };

  // FLIP the centred wordmark onto the header logo (same SVG → seamless swap).
  const dock = (): void => {
    const target = document.querySelector<HTMLElement>('[data-header-logo] svg');
    if (!target) return;
    const a = mark.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const s = b.width / a.width;
    mark.style.transition = 'none';
    mark.style.transform = `translate(${b.left}px, ${b.top}px) scale(${s})`;
    mark.style.left = '0';
    mark.style.top = '0';
    // FLIP: final layout applied instantly; WAAPI plays from the old pose back to rest.
    mark.animate(
      [{ transform: `translate(${a.left}px, ${a.top}px) scale(1)` }, { transform: `translate(${b.left}px, ${b.top}px) scale(${s})` }],
      { duration: 1000, easing: 'cubic-bezier(0.65,0,0.35,1)' },
    ).finished.then(() => {
      root.classList.add('intro-docked');
      window.setTimeout(() => loader.remove(), 60);
    });
  };
};
