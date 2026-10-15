/** [data-reveal] elements get .is-in once when they enter the viewport.
 *  [data-reveal-group] staggers its [data-reveal] children via --d. */
export const initReveal = (): void => {
  document.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((g) => {
    const step = Number(g.dataset.revealGroup || 90);
    g.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el, i) => el.style.setProperty('--d', `${i * step}ms`));
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
};
