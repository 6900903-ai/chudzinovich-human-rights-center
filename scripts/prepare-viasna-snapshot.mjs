import { realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareViasnaSnapshot } from './lib/viasna-snapshot-preparer.mjs';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function inside(parent,child){const rel=relative(parent,child);return rel===''||(!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel));}
async function resolved(path){return realpath(resolve(path));}

const sourceFile=process.env.VIASNA_SOURCE_FILE;
const outputRoot=process.env.CHRC_VIASNA_PREPARE_DIR;
if(!sourceFile)throw new Error('VIASNA_SOURCE_FILE_NOT_CONFIGURED');
if(!outputRoot)throw new Error('CHRC_VIASNA_PREPARE_DIR_NOT_CONFIGURED');
const testMode=process.env.CHRC_TEST_MODE==='1';
const repo=await resolved(repoRoot);
const source=await resolved(sourceFile);
const output=resolve(outputRoot);
if(!testMode&&inside(repo,source))throw new Error('REAL_VIASNA_SOURCE_FILE_INSIDE_PUBLIC_REPO');
if(!testMode&&inside(repo,output))throw new Error('VIASNA_PREPARE_OUTPUT_INSIDE_PUBLIC_REPO');

const result=await prepareViasnaSnapshot({
  sourceFile:source,
  outputRoot:output,
  currentPublicDir:resolve(repoRoot,'data','public','current'),
  sourcePageUrl:process.env.VIASNA_SOURCE_PAGE_URL||'https://prisoners.spring96.org/ru/list',
  locale:process.env.VIASNA_SOURCE_LOCALE||'ru',
  asOf:process.env.CHRC_AS_OF||new Date().toISOString()
});
console.log(`VIASNA_SNAPSHOT_PREPARED=PASS snapshot=${result.snapshotId} people=${result.people} prisons=${result.prisons} quarantined=${result.quarantined} public_repo_mutated=false`);
console.log(`VIASNA_PREPARED_RUN_DIR=${result.runDir}`);
