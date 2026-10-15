import { trackStage } from '../core/scroll';
import { hasFinePointer, prefersReducedMotion, range } from '../core/motion';
import { initOrbitHud } from './orbit-hud';
import { initCursorHint } from '../ui/cursor-hint';
import { onIntroDone } from '../ui/loader';
import { startMainThreadStage, startWorkerStage, supportsWorkerStage, type StageHost } from './orbit-host';

/** three.js (r163+) requires WebGL2. API presence only; no context is created here
 *  (creation is expensive). Runtime failures fall back to the poster via fail(). */
const webgl2Available = (): boolean => typeof WebGL2RenderingContext !== 'undefined';

/** Random-order letter focus-in for the hero statement. Visual only: the lines are
 *  aria-hidden and a visually hidden copy carries the heading text. */
const splitTitle = (h1: HTMLElement): HTMLElement[] => {
  const chars: HTMLElement[] = [];
  const label = document.createElement('span');
  label.className = 'sr-only';
  label.textContent = [...h1.querySelectorAll('.hero__line')].map((l) => l.textContent).join(' ');
  h1.querySelectorAll<HTMLElement>('.hero__line').forEach((line) => {
    const text = line.textContent ?? '';
    line.setAttribute('aria-hidden', 'true');
    line.textContent = '';
    text.split(' ').forEach((word, wi) => {
      if (wi) line.appendChild(document.createTextNode(' '));
      const w = document.createElement('span');
      w.className = 'word';
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'ch is-pre';
        c.textContent = ch;
        w.appendChild(c);
        chars.push(c);
      }
      line.appendChild(w);
    });
  });
  h1.prepend(label);
  return chars;
};
const playTitle = (chars: HTMLElement[]): void => {
  chars
    .map((c) => ({ c, k: Math.random() }))
    .sort((a, b) => a.k - b.k)
    .forEach(({ c }, n) => {
      c.style.transitionDelay = `${n * 38}ms`;
      c.classList.remove('is-pre');
    });
};

export const initOrbitStageController = (): void => {
  const root = document.querySelector<HTMLElement>('[data-orbit-stage]');
  if (!root) return;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-orbit-canvas]')!;
  const hero = root.querySelector<HTMLElement>('[data-hero]')!;
  const h1 = root.querySelector<HTMLElement>('[data-hero-title]')!;
  const hudEl = root.querySelector<HTMLElement>('[data-orbit-hud]');
  const hud = hudEl ? initOrbitHud(hudEl) : null;
  let stage: StageHost | null = null;
  let progress = 0;

  if (!prefersReducedMotion()) {
    const chars = splitTitle(h1);
    onIntroDone(() => window.setTimeout(() => requestAnimationFrame(() => playTitle(chars)), 300));
  }

  const apply = (p: number): void => {
    progress = p;
    const out = range(p, 0.08, 0.2);
    root.style.setProperty('--hero-o', String(1 - out));
    root.style.setProperty('--hero-b', String(out * 14));
    root.style.setProperty('--hero-pe', out > 0.5 ? 'none' : 'auto');
    const inn = range(p, 0.34, 0.46);
    root.style.setProperty('--orbit-o', String(inn));
    root.style.setProperty('--orbit-y', String((1 - inn) * 48));
    if (p > 0.4) hud?.start();
    stage?.setProgress(p);
  };
  trackStage(root, apply);

  // Keyboard users tabbing back into the faded hero: bring it back into view.
  hero.addEventListener('focusin', () => {
    if (progress > 0.15) window.scrollTo({ top: root.offsetTop, behavior: 'auto' });
  });

  initCursorHint(hero, () => progress < 0.08);

  if (!webgl2Available()) {
    root.classList.add('no-webgl');
    return;
  }

  const fail = (reason: string): void => {
    // Any WebGL failure leaves the page intact: the poster stays (or returns).
    root.classList.remove('is-live');
    root.classList.add('no-webgl');
    root.dataset.stageError = reason.slice(0, 120);
    stage?.dispose();
    stage = null;
  };

  let booted = false;
  const boot = async (reason: string): Promise<void> => {
    if (booted) return; // duplicate initialisation guard
    booted = true;
    root.dataset.stageBoot = reason;
    const coarse = !hasFinePointer();
    const options = {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      dpr: window.devicePixelRatio || 1,
      reducedMotion: prefersReducedMotion(),
      coarse,
      textureSize: coarse || window.innerWidth < 900 ? ('1k' as const) : ('2k' as const),
      baseUrl: location.href,
    };
    const callbacks = { onFirstFrame: () => root.classList.add('is-live'), onFailure: fail };
    try {
      stage = supportsWorkerStage(canvas)
        ? startWorkerStage(canvas, options, callbacks)
        : await startMainThreadStage(canvas, options, callbacks);
    } catch (err) {
      fail(String(err));
      return;
    }
    root.dataset.stageMode = stage.mode;
    stage.setProgress(progress);
    new IntersectionObserver(([e]) => stage?.setActive(e.isIntersecting)).observe(root);
    new ResizeObserver(() => stage?.resize(canvas.clientWidth, canvas.clientHeight)).observe(canvas);
    document.addEventListener('visibilitychange', () => stage?.setHidden(document.hidden));
    if (hasFinePointer()) {
      window.addEventListener(
        'pointermove',
        (e) => stage?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)),
        { passive: true },
      );
    }
    (window as unknown as { __omertaStage?: StageHost }).__omertaStage = stage;
  };

  const idle = (cb: () => void): void => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(cb, { timeout: 1200 });
    else globalThis.setTimeout(cb, 200);
  };

  // Worker path: the main thread only creates the worker and transfers the canvas,
  // so the stage can start as soon as the intro has finished.
  // Main-thread fallback: three.js parsing/compilation would block input, so wait
  // for the first interaction (or an idle fallback) — the poster is a faithful still.
  const workerPath = supportsWorkerStage(canvas);
  const arm = (): void =>
    onIntroDone(() => {
      const delay = document.documentElement.classList.contains('intro-play') ? 1150 : 0;
      window.setTimeout(() => {
        if (workerPath) {
          idle(() => void boot('auto-worker'));
          return;
        }
        const INTERACTIONS = ['scroll', 'pointerdown', 'touchstart', 'keydown', 'wheel'];
        const onFirst = (e: Event): void => {
          INTERACTIONS.forEach((t) => window.removeEventListener(t, onFirst));
          idle(() => void boot(e.type));
        };
        INTERACTIONS.forEach((t) => window.addEventListener(t, onFirst, { passive: true }));
        if (window.scrollY > 0) idle(() => void boot('scrolled'));
        window.setTimeout(() => idle(() => void boot('timeout')), 8000);
      }, delay);
    });
  if (document.readyState === 'complete') arm();
  else window.addEventListener('load', arm, { once: true });
};
