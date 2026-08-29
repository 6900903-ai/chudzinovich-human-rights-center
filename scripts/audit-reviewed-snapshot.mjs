import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { auditReviewedSnapshot, sanitizedAuditSummary } from './lib/reviewed-snapshot.mjs';

const input=process.env.CHRC_REVIEW_SNAPSHOT_DIR;
const report=await auditReviewedSnapshot(input,{testMode:process.env.CHRC_TEST_MODE==='1'});
const sanitized=sanitizedAuditSummary(report);
if(process.env.CHRC_REVIEW_REPORT_FILE){
  await writeFile(resolve(process.env.CHRC_REVIEW_REPORT_FILE),JSON.stringify(sanitized,null,2)+'\n',{encoding:'utf8',mode:0o600});
}
console.log(JSON.stringify(sanitized,null,2));
console.log(`REVIEWED_SNAPSHOT_AUDIT=PASS snapshot=${report.snapshot_id} people=${report.counts.people} current=${report.counts.political_prisoners_current} former=${report.counts.former_political_prisoners} prisons=${report.counts.prisons} release_ready=${report.release_ready}`);
