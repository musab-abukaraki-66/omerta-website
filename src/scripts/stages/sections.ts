/**
 * Scroll-linked chapter controllers. Each maps a stage's 0→1 progress onto CSS
 * custom properties; CSS does the rendering. Under reduced motion, crossfades
 * become instant state changes and zoom/blur/parallax are held still.
 */
import { trackStage } from '../core/scroll';
import { prefersReducedMotion, range } from '../core/motion';

const rm = prefersReducedMotion();
const fade = (v: number): number => (rm ? (v > 0.5 ? 1 : 0) : v);
const set = (el: HTMLElement, k: string, v: number | string): void => el.style.setProperty(k, String(v));

export const initObservation = (): void => {
  const root = document.querySelector<HTMLElement>('[data-obs]');
  if (!root) return;
  const pct = root.querySelector<HTMLElement>('[data-obs-pct]');
  let lastPct = -1;
  trackStage(root, (p) => {
    const scan = range(p, 0.18, 0.82);
    set(root, '--obs-x', `${(scan * 100).toFixed(2)}%`);
    set(root, '--obs-scan-o', scan > 0 && scan < 1 ? 1 : 0);
    set(root, '--obs-zoom', rm ? 1 : (1.08 - range(p, 0, 1) * 0.08).toFixed(4));
    const n = Math.round(scan * 100);
    if (pct && n !== lastPct) {
      lastPct = n;
      pct.textContent = String(n).padStart(3, '0');
    }
  });
};

export const initGround = (): void => {
  const fig = document.querySelector<HTMLElement>('[data-gnd-figure]');
  if (fig) {
    trackStage(
      fig,
      (p) => {
        set(fig, '--gnd-clip', rm ? '0%' : `${((1 - range(p, 0.05, 0.4)) * 12).toFixed(2)}%`);
        set(fig, '--gnd-par', rm ? 0 : (p - 0.5).toFixed(3));
      },
      'through',
    );
  }
  const path = document.querySelector<HTMLElement>('[data-gnd-path]');
  if (path) {
    const steps = [...path.querySelectorAll<HTMLElement>('.gnd__step')];
    trackStage(
      path,
      (p) => {
        const live = range(p, 0.25, 0.65);
        set(path, '--gnd-p', live.toFixed(4));
        steps.forEach((s, i) => s.classList.toggle('is-on', live >= i / (steps.length - 1) - 0.001));
      },
      'through',
    );
  }
};

/** Desktop: pin the section and translate the card track horizontally with vertical
 *  scroll. Below 1024 px the track is a native horizontal swipe with snap points. */
export const initCapabilities = (): void => {
  const root = document.querySelector<HTMLElement>('[data-caps]');
  if (!root) return;
  const track = root.querySelector<HTMLElement>('[data-caps-track]')!;
  const viewport = root.querySelector<HTMLElement>('[data-caps-viewport]')!;
  const mq = window.matchMedia('(min-width: 1024px) and (min-height: 600px)');
  let distance = 0;

  const layout = (): void => {
    // Pin only on large screens AND when the pinned layout actually fits the
    // viewport (large text / zoom would otherwise clip the heading or cards). The
    // fit test only runs where pinning is possible, so small screens never get a
    // transient layout change (which Chrome would record as a layout shift).
    let fits = false;
    if (mq.matches) {
      const was = root.classList.contains('is-pinned');
      if (!was) root.classList.add('is-pinned');
      const sticky = root.querySelector<HTMLElement>('.caps__sticky');
      fits = !!sticky && sticky.scrollHeight <= sticky.clientHeight + 2;
      if (!fits) root.classList.remove('is-pinned');
    }
    if (mq.matches && fits) {
      root.classList.add('is-pinned');
      viewport.removeAttribute('tabindex');
      const styles = getComputedStyle(viewport);
      const padR = parseFloat(styles.paddingRight) || 0;
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth + padR * 2);
      root.style.height = `${window.innerHeight + distance}px`;
    } else {
      root.classList.remove('is-pinned');
      viewport.setAttribute('tabindex', '0');
      root.style.height = '';
      set(root, '--caps-x', 0);
    }
  };
  layout();
  mq.addEventListener('change', layout);
  window.addEventListener('resize', layout);
  document.fonts?.ready.then(layout);

  trackStage(root, (p) => {
    if (!root.classList.contains('is-pinned')) return;
    const t = range(p, 0.04, 0.96);
    set(root, '--caps-x', (t * distance).toFixed(1));
    set(root, '--caps-p', t.toFixed(4));
  });
  // Mobile progress bar follows the native horizontal scroll.
  viewport.addEventListener(
    'scroll',
    () => {
      if (root.classList.contains('is-pinned')) return;
      const max = viewport.scrollWidth - viewport.clientWidth;
      set(root, '--caps-p', max > 0 ? (viewport.scrollLeft / max).toFixed(4) : 0);
    },
    { passive: true },
  );
  // Keyboard focus inside a pinned card: scroll the page so the card is in view.
  track.addEventListener('focusin', (e) => {
    if (!root.classList.contains('is-pinned')) return;
    const card = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (!card) return;
    const i = [...track.children].indexOf(card);
    const t = i / Math.max(1, track.children.length - 1);
    window.scrollTo({ top: root.offsetTop + (0.04 + t * 0.92) * distance });
  });
};

export const initApproach = (): void => {
  const root = document.querySelector<HTMLElement>('[data-appr-stage]');
  if (!root) return;
  const [a, b] = [...root.querySelectorAll<HTMLElement>('[data-appr-statement]')];
  trackStage(root, (p) => {
    set(root, '--appr-p', rm ? 0.5 : p.toFixed(4));
    const first = fade(range(p, 0.08, 0.22)) * (1 - fade(range(p, 0.48, 0.58)));
    const second = fade(range(p, 0.6, 0.72));
    if (a) {
      set(a, '--o', first.toFixed(3));
      set(a, '--dir', p > 0.4 ? -1 : 1);
    }
    if (b) set(b, '--o', second.toFixed(3));
  });
};

export const initFinale = (): void => {
  const root = document.querySelector<HTMLElement>('[data-fin]');
  if (!root) return;
  trackStage(root, (p) => {
    // Bands close and content arrives together, so there is no empty stretch.
    const band = range(p, 0, 0.4);
    set(root, '--fin-band', rm ? (band > 0 ? 0.62 : 0) : (band * 0.62).toFixed(4));
    set(root, '--fin-p', rm ? 0 : range(p, 0, 0.4).toFixed(4));
    const o = fade(range(p, 0.18, 0.42));
    set(root, '--fin-o', o.toFixed(3));
    set(root, '--fin-pe', o > 0.5 ? 'auto' : 'none');
  });
  root.addEventListener('focusin', () => {
    const vh = window.innerHeight;
    const target = root.offsetTop + (root.offsetHeight - vh) * 0.7;
    if (Math.abs(window.scrollY - target) > vh * 0.3) window.scrollTo({ top: target });
  });
};
