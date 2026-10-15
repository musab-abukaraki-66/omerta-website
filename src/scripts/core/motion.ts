const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

export const prefersReducedMotion = (): boolean => rmQuery.matches;
export const hasFinePointer = (): boolean => fineQuery.matches;
export const onReducedMotionChange = (fn: (reduced: boolean) => void): void => {
  rmQuery.addEventListener('change', (e) => fn(e.matches));
};

export { clamp, lerp, range, easeInOutCubic, easeOutCubic, damp } from './math';
