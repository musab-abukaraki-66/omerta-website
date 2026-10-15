import { scrollToTarget, stopScroll } from '../core/scroll';
import { prefersReducedMotion } from '../core/motion';

/** Accessible overlay index: Esc / link / toggle close, focus trap, inert background. */
export const initMenu = (): void => {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const label = document.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !menu) return;
  const links = [...menu.querySelectorAll<HTMLAnchorElement>('[data-menu-link]')];
  const background = [document.querySelector('main'), document.querySelector('footer')].filter(Boolean) as HTMLElement[];
  const logo = document.querySelector<HTMLElement>('[data-header-logo]');
  const contact = document.querySelector<HTMLElement>('.hdr-contact');
  let open = false;
  let hideTimer = 0;

  const setOpen = (next: boolean, restoreFocus = true): void => {
    if (next === open) return;
    open = next;
    window.clearTimeout(hideTimer);
    toggle.setAttribute('aria-expanded', String(next));
    if (label) label.textContent = next ? 'Close' : 'Index';
    document.documentElement.classList.toggle('menu-open', next);
    background.forEach((el) => (el.inert = next));
    [logo, contact].forEach((el) => el && (el.inert = next));
    stopScroll(next);
    document.body.style.overflow = next ? 'hidden' : '';
    if (next) {
      menu.hidden = false;
      void menu.offsetWidth;
      menu.classList.add('is-open');
      links[0]?.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      hideTimer = window.setTimeout(() => (menu.hidden = true), prefersReducedMotion() ? 0 : 700);
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      const cycle: HTMLElement[] = [toggle, ...links];
      const i = cycle.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      const next = e.shiftKey ? (i <= 0 ? cycle.length - 1 : i - 1) : (i + 1) % cycle.length;
      cycle[next].focus();
    }
  });
  links.forEach((a) =>
    a.addEventListener('click', (e) => {
      const url = new URL(a.href);
      const samePage = url.pathname === location.pathname && url.hash;
      if (samePage) {
        e.preventDefault();
        setOpen(false, false);
        const target = document.querySelector<HTMLElement>(url.hash);
        if (target) {
          scrollToTarget(target);
          history.pushState(null, '', url.hash);
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      } else {
        setOpen(false, false);
      }
    }),
  );
};
