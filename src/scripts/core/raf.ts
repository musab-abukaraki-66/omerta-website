/**
 * One shared requestAnimationFrame loop. Subscribers receive (time, dt) in seconds.
 * The loop stops when it has no subscribers or the tab is hidden.
 */
type Tick = (time: number, dt: number) => void;

const subs = new Set<Tick>();
let rafId = 0;
let last = 0;

const frame = (now: number): void => {
  const t = now / 1000;
  const dt = last ? Math.min(t - last, 0.1) : 1 / 60;
  last = t;
  subs.forEach((fn) => fn(t, dt));
  rafId = subs.size && !document.hidden ? requestAnimationFrame(frame) : 0;
  if (!rafId) last = 0;
};

const start = (): void => {
  if (!rafId && subs.size && !document.hidden) rafId = requestAnimationFrame(frame);
};

export const addTick = (fn: Tick): (() => void) => {
  subs.add(fn);
  start();
  return () => {
    subs.delete(fn);
  };
};

document.addEventListener('visibilitychange', start);
