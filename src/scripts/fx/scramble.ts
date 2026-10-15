import { prefersReducedMotion } from '../core/motion';

const GLYPHS = '+/\\_-<>[]{}=*#01ABCDEFKLMNRSTXZ';

/**
 * Per-character decode: each character cycles random glyphs for a random window,
 * then locks. While animating, a visually hidden copy carries the final text for
 * screen readers and the glyph layer is aria-hidden.
 */
export class Scramble {
  private el: HTMLElement;
  private raf = 0;
  private speed: number;

  constructor(el: HTMLElement, speed = 1) {
    this.el = el;
    this.speed = speed;
  }

  play(text = this.el.dataset.text ?? this.el.textContent ?? ''): Promise<void> {
    this.el.dataset.text = text;
    cancelAnimationFrame(this.raf);
    if (prefersReducedMotion()) {
      this.el.textContent = text;
      return Promise.resolve();
    }
    const queue = [...text].map((ch) => {
      const start = Math.floor(Math.random() * 18);
      return { ch, start, end: start + 8 + Math.floor(Math.random() * 22), cur: '' };
    });
    let frame = 0;
    return new Promise((resolve) => {
      const step = (): void => {
        let done = 0;
        let html = '';
        for (const q of queue) {
          if (q.ch === ' ' || frame >= q.end) {
            done++;
            html += q.ch === ' ' ? ' ' : escape(q.ch);
          } else if (frame >= q.start) {
            if (!q.cur || Math.random() < 0.3) q.cur = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            html += `<span class="dud">${escape(q.cur)}</span>`;
          } else {
            html += `<span class="dud">${q.ch === ' ' ? ' ' : '·'}</span>`;
          }
        }
        this.el.innerHTML =
          done === queue.length ? escape(text) : `<span class="sr-only">${escape(text)}</span><span aria-hidden="true">${html}</span>`;
        frame += this.speed;
        if (done === queue.length) resolve();
        else this.raf = requestAnimationFrame(step);
      };
      step();
    });
  }
}

const escape = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

/** Elements with [data-scramble] decode when they enter the viewport;
 *  [data-scramble-hover] re-decode on pointer hover/focus of their closest link/button. */
export const initScramble = (): void => {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        new Scramble(e.target as HTMLElement).play();
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    el.dataset.text = el.textContent ?? '';
    io.observe(el);
  });
  document.querySelectorAll<HTMLElement>('[data-scramble-hover]').forEach((el) => {
    const s = new Scramble(el, 1.6);
    el.dataset.text = el.textContent ?? '';
    const host = el.closest('a,button') ?? el;
    let busy = false;
    const run = (): void => {
      if (busy) return;
      busy = true;
      s.play().then(() => (busy = false));
    };
    host.addEventListener('pointerenter', run);
    host.addEventListener('focus', run);
  });
};
