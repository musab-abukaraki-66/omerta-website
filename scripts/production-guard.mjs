// Runs before `astro build`. On a Vercel *Production* build it requires the release
// check to pass, so a production deployment cannot go out while launch-critical
// information (origin, contact endpoint, confirmed copy) is missing. Preview and
// local builds are unaffected.
import { spawnSync } from 'node:child_process';
import { resolveDeployEnv } from './deploy-env.mjs';

const { vercelEnv } = resolveDeployEnv();
if (vercelEnv === 'production') {
  const r = spawnSync(process.execPath, ['scripts/release-check.mjs'], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('\n[omerta] Production build blocked: the release check failed (see above).');
    process.exit(1);
  }
}
