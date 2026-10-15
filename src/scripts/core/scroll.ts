import Lenis from 'lenis';
import { addTick } from './raf';
import { clamp, hasFinePointer, prefersReducedMotion } from './motion';

let lenis: Lenis | null = null;

/**
 * Smooth wheel scrolling on top of NATIVE scroll (no hijacking): the document keeps
 * its scrollbar, keyboard scrolling, anchors and find-in-page. Only enabled for fine
 * pointers without a reduced-motion preference. lerp 0.1 matches the reference.
 */
export const initSmoothScroll = (): void => {
  if (prefersReducedMotion() || !hasFinePointer()) return;
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: { offset: 0 } });
  addTick((t) => lenis?.raf(t * 1000));
  // A keyboard scroll during an animated jump must win: otherwise the animation's
  // next frame would pull the page back to its own target.
  const NAV_KEYS = new Set(['End', 'Home', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', ' ']);
  window.addEventListener('keydown', (e) => {
    if (lenis?.isScrolling === 'smooth' && NAV_KEYS.has(e.key)) {
      lenis.stop();
      lenis.start();
    }
  });
};

export const scrollToTarget = (target: string | HTMLElement, immediate = false): void => {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { immediate, duration: 1.4 });
  else el.scrollIntoView({ behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth' });
};

export const stopScroll = (stop: boolean): void => {
  if (stop) lenis?.stop();
  else lenis?.start();
};

/**
 * Stage progress tracking. A stage is a tall element; progress runs 0→1 while it
 * scrolls through the viewport. Mode 'sticky' measures (scrolled)/(height − vh),
 * mode 'through' measures from the element's top entering the bottom of the
 * viewport until its bottom leaves the top. Only intersecting stages are updated.
 */
type Mode = 'sticky' | 'through';
interface Stage {
  el: HTMLElement;
  mode: Mode;
  visible: boolean;
  last: number;
  onProgress: (p: number) => void;
}
const stages: Stage[] = [];
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const s = stages.find((x) => x.el === e.target);
      if (!s) continue;
      s.visible = e.isIntersecting;
      // Catch up immediately: after a jump (anchor, End key) the scroll handler may
      // have run before this stage was flagged visible.
      if (s.visible) {
        const p = measure(s);
        s.last = p;
        s.onProgress(p);
      }
    }
  },
  { rootMargin: '10% 0px 10% 0px' },
);

const measure = (s: Stage): number => {
  const r = s.el.getBoundingClientRect();
  const vh = window.innerHeight;
  if (s.mode === 'sticky') return clamp(-r.top / Math.max(1, r.height - vh));
  return clamp((vh - r.top) / (r.height + vh));
};

export const trackStage = (el: HTMLElement, onProgress: (p: number) => void, mode: Mode = 'sticky'): void => {
  const s: Stage = { el, mode, visible: true, last: -1, onProgress };
  stages.push(s);
  io.observe(el);
  const p = measure(s);
  s.last = p;
  onProgress(p);
};

let scheduled = false;
const update = (): void => {
  scheduled = false;
  for (const s of stages) {
    if (!s.visible) continue;
    const p = measure(s);
    if (Math.abs(p - s.last) > 0.0001) {
      s.last = p;
      s.onProgress(p);
    }
  }
};
const schedule = (): void => {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(update);
  }
};

/** Re-measure every stage (e.g. after a layout mode change). */
export const refreshStages = (): void => {
  stages.forEach((s) => s.onProgress((s.last = measure(s))));
};

/** Updates run only in response to scroll/resize — nothing ticks while idle. */
export const initStageLoop = (): void => {
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    stages.forEach((s) => s.onProgress((s.last = measure(s))));
  });
};
