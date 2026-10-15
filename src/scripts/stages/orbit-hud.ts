/**
 * Live readouts for the simulated 550 km reference SSO. Circular two-body orbit with
 * Earth rotation — accurate enough for a display, explicitly labelled as simulated.
 */
import { referenceOrbit } from '../../content/site';
import { typeText } from '../fx/typewriter';

const MU = 398600.4418; // km³/s²
const RE = 6378.137; // km
const OMEGA_E = 7.2921159e-5; // rad/s
const DEG = Math.PI / 180;

const a = RE + referenceOrbit.altitudeKm;
const period = 2 * Math.PI * Math.sqrt((a * a * a) / MU); // s
const inc = referenceOrbit.inclinationDeg * DEG;

/** Sub-satellite point at time t (s since an arbitrary epoch). */
export const subSatellite = (t: number): { lat: number; lon: number } => {
  const u = (2 * Math.PI * t) / period + 0.6;
  const lat = Math.asin(Math.sin(inc) * Math.sin(u));
  let lon = Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) - OMEGA_E * t + 0.4;
  lon = ((lon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return { lat: lat / DEG, lon: lon / DEG };
};

const fmtLat = (v: number): string => `${Math.abs(v).toFixed(2).padStart(5, '0')}° ${v >= 0 ? 'N' : 'S'}`;
const fmtLon = (v: number): string => `${Math.abs(v).toFixed(2).padStart(6, '0')}° ${v >= 0 ? 'E' : 'W'}`;

export const initOrbitHud = (root: HTMLElement): { start(): void } => {
  const fields = Object.fromEntries(
    [...root.querySelectorAll<HTMLElement>('[data-hud]')].map((el) => [el.dataset.hud!, el]),
  ) as Record<string, HTMLElement>;
  const epoch = Date.now() / 1000 - (Date.now() / 1000) % period; // phase tied to wall clock
  let started = false;

  const live = (): Record<string, string> => {
    const t = Date.now() / 1000 - epoch;
    const { lat, lon } = subSatellite(t);
    const phase = ((t % period) / period) * 100;
    return { lat: fmtLat(lat), lon: fmtLon(lon), phase: `${phase.toFixed(1)} %` };
  };

  // Fill every row immediately so assistive tech never meets placeholder dashes;
  // the typewriter re-types them when the chapter comes into view.
  const initial: Record<string, string> = {
    alt: `${referenceOrbit.altitudeKm} km`,
    inc: `${referenceOrbit.inclinationDeg.toFixed(1)}°`,
    period: `${(period / 60).toFixed(1)} min`,
    vel: `${Math.sqrt(MU / a).toFixed(2)} km/s`,
    ...live(),
  };
  for (const [k, el] of Object.entries(fields)) el.textContent = initial[k] ?? el.textContent;

  return {
    start() {
      if (started) return;
      started = true;
      const values: Record<string, string> = { ...initial, ...live() };
      // Type rows in sequence, then keep the live rows ticking once per second.
      let chain = Promise.resolve();
      for (const [k, el] of Object.entries(fields)) {
        chain = chain.then(() => typeText(el, values[k] ?? '', 60));
      }
      chain.then(() => {
        window.setInterval(() => {
          if (document.hidden) return;
          const v = live();
          for (const k of ['lat', 'lon', 'phase']) if (fields[k]) fields[k].textContent = v[k];
        }, 1000);
      });
    },
  };
};
