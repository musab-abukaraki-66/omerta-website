import { prefersReducedMotion } from '../core/motion';

/** Types text into an element with a trailing caret. Resolves when complete. */
export const typeText = (el: HTMLElement, text: string, cps = 48): Promise<void> => {
  if (prefersReducedMotion()) {
    el.textContent = text;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let i = 0;
    const started = performance.now();
    el.classList.add('is-typing');
    const step = (now: number): void => {
      const target = Math.min(text.length, Math.floor(((now - started) / 1000) * cps));
      if (target !== i) {
        i = target;
        el.textContent = text.slice(0, i);
      }
      if (i < text.length) requestAnimationFrame(step);
      else {
        el.classList.remove('is-typing');
        resolve();
      }
    };
    el.textContent = '';
    requestAnimationFrame(step);
  });
};
