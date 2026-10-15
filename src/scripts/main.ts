import { initSmoothScroll, initStageLoop, refreshStages, scrollToTarget } from './core/scroll';
import { initFit } from './ui/fit';
import { initReveal } from './fx/reveal';
import { initScramble } from './fx/scramble';
import { initHeaderTheme } from './ui/header';
import { initMenu } from './ui/menu';
import { initLoader } from './ui/loader';
import { initOrbitStageController } from './stages/orbit-controller';
import { initObservation, initGround, initCapabilities, initApproach, initFinale } from './stages/sections';
import { initContactForm } from './ui/contact-form';

// Critical path: what the first viewport needs.
initSmoothScroll();
initStageLoop();
initOrbitStageController();
initHeaderTheme();
initMenu();
initContactForm();
initLoader();

// Below-the-fold chapters: one short task each, so no single long task blocks input.
const deferred = [initObservation, initGround, initCapabilities, initApproach, initFinale, () => initFit(refreshStages), initReveal, initScramble];
const runNext = (): void => {
  const fn = deferred.shift();
  if (!fn) return;
  fn();
  setTimeout(runNext, 0);
};
setTimeout(runNext, 0);

// In-page anchors (hero CTA, "back to top"): route through the smooth scroller and
// move focus to the target for keyboard and screen-reader users.
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a || a.closest('[data-menu]')) return;
  const hash = a.getAttribute('href')!;
  const target = hash === '#top' ? document.body : document.querySelector<HTMLElement>(hash);
  if (!target) return;
  e.preventDefault();
  scrollToTarget(target);
  if (hash !== '#top') {
    history.pushState(null, '', hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  } else {
    history.pushState(null, '', location.pathname);
  }
});
