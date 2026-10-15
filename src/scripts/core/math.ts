/** Pure math helpers — no DOM access, safe inside Web Workers. */
export const clamp = (v: number, min = 0, max = 1): number => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Map v from [a,b] to [0,1], clamped. */
export const range = (v: number, a: number, b: number): number => clamp((v - a) / (b - a));
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
/** Frame-rate independent exponential smoothing factor (reference-equivalent of lerp 0.1 @60fps). */
export const damp = (factor: number, dt: number): number => 1 - Math.pow(1 - factor, dt * 60);
