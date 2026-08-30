import { resolve, relative, sep, join } from 'node:path';

function inside(parent,child){
  const rel=relative(resolve(parent),resolve(child));
  return rel===''||(!rel.startsWith(`..${sep}`)&&rel!=='..');
}

export function resolvePublicDataDir(root) {
  const defaultDir = join(root, 'data', 'public', 'current');
  const override = process.env.CHRC_PUBLIC_DATA_DIR;
  const candidateAuditMode=process.env.CHRC_CANDIDATE_BUILD_MODE==='AUDIT_ONLY';

  if(candidateAuditMode){
    if(!override)throw new Error('CANDIDATE_BUILD_DATA_DIR_REQUIRED');
    const resolved=resolve(root,override);
    if(inside(root,resolved))throw new Error('CANDIDATE_BUILD_DATA_MUST_BE_EXTERNAL');
    return resolved;
  }

  if (!override) return defaultDir;

  if (process.env.CHRC_TEST_MODE !== '1') {
    throw new Error('PUBLIC_DATA_OVERRIDE_REQUIRES_TEST_MODE');
  }

  const resolved = resolve(root, override);
  const fixtureRoot = resolve(root, 'tests', 'fixtures', 'public-snapshot');
  const rel = relative(fixtureRoot, resolved);
  if (rel.startsWith('..') || rel === '..' || rel.includes(`..${sep}`)) {
    throw new Error('PUBLIC_DATA_OVERRIDE_OUTSIDE_SYNTHETIC_FIXTURE_BOUNDARY');
  }
  return resolved;
}
