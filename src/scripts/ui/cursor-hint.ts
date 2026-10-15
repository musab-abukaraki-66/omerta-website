import { hasFinePointer, prefersReducedMotion, damp } from '../core/motion';
import { addTick } from '../core/raf';
import { Scramble } from '../fx/scramble';

/** "Scroll to begin" label that trails the pointer inside the hero (fine pointers only). */
export const initCursorHint = (zone: HTMLElement, isActive: () => boolean): void => {
  if (!hasFinePointer() || prefersReducedMotion()) return;
  const el = document.createElement('div');
  el.className = 'cursor-hint label';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="cursor-hint__ring"></span><span class="cursor-hint__text">Scroll to begin ↓</span>';
  document.body.appendChild(el);
  const text = el.querySelector<HTMLElement>('.cursor-hint__text')!;
  const scr = new Scramble(text, 1.2);
  let tx = 0, ty = 0, x = 0, y = 0, inside = false, shown = false, stop: (() => void) | null = null;

  const setShown = (v: boolean): void => {
    if (v === shown) return;
    shown = v;
    el.classList.toggle('is-on', v);
    if (v) scr.play('Scroll to begin ↓');
  };
  zone.addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!inside) {
      inside = true;
      x = tx;
      y = ty;
    }
    if (!stop) stop = addTick(tick);
  });
  zone.addEventListener('pointerleave', () => {
    inside = false;
    setShown(false);
  });
  const tick = (_t: number, dt: number): void => {
    const k = damp(0.14, dt);
    x += (tx - x) * k;
    y += (ty - y) * k;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    setShown(inside && isActive());
    if (!inside && Math.abs(tx - x) < 0.5 && Math.abs(ty - y) < 0.5 && stop) {
      stop();
      stop = null;
    }
  };
};
