/** Recolours the fixed header to match the section currently beneath it. */
export const initHeaderTheme = (): void => {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const sections = [...document.querySelectorAll<HTMLElement>('[data-section-theme]')];
  let scheduled = false;
  const probe = (): void => {
    scheduled = false;
    const y = header.offsetHeight / 2;
    let theme = 'dark';
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) theme = s.dataset.sectionTheme || 'dark';
    }
    if (header.dataset.theme !== theme) header.dataset.theme = theme;
  };
  const schedule = (): void => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(probe);
    }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  probe();
};
