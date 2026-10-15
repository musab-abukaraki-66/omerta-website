/**
 * Pinned stages assume their content fits one viewport. With large text settings,
 * browser zoom or short screens it may not (WCAG 1.4.4 / 1.4.10). This checks each
 * stage and switches it to the flow layout (see global.css) when content would be
 * clipped. Re-checked after fonts load and on resize (zoom fires resize).
 */
const STAGES = '[data-orbit-stage], [data-obs], [data-appr-stage], [data-fin]';
const LAYERS = '.hero > .wrap, .hero__hint, .orbitc__grid > *, .obs__layout > *, .obs__caption, .appr__inner, .appr__caption, .fin__inner';

const overflows = (stage: HTMLElement): boolean => {
  const sticky = stage.querySelector<HTMLElement>('[class*="__sticky"]');
  if (!sticky) return false;
  // Measure untransformed layout: neutralise scroll-linked translations briefly.
  stage.classList.add('is-measuring');
  const box = sticky.getBoundingClientRect();
  let bad = false;
  sticky.querySelectorAll<HTMLElement>(LAYERS).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height && (r.top < box.top - 2 || r.bottom > box.bottom + 2 || r.height > box.height)) bad = true;
  });
  stage.classList.remove('is-measuring');
  return bad;
};

export const initFit = (onChange?: () => void): void => {
  const stages = [...document.querySelectorAll<HTMLElement>(STAGES)];
  const check = (): void => {
    let changed = false;
    for (const s of stages) {
      // Evaluate the pinned layout, then decide.
      const was = s.classList.contains('is-flow');
      if (was) s.classList.remove('is-flow');
      const flow = overflows(s);
      s.classList.toggle('is-flow', flow);
      if (flow !== was) changed = true;
    }
    if (changed) onChange?.();
  };
  let t = 0;
  const schedule = (): void => {
    clearTimeout(t);
    t = window.setTimeout(check, 150);
  };
  check();
  document.fonts?.ready.then(check);
  window.addEventListener('resize', schedule);
};
