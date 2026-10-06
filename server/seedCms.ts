import "dotenv/config";
import { importExistingContent } from "./cmsImport";
import { restoreOriginalArticleDrafts } from "./repairLegacyDrafts";

async function main() {
  const result=await importExistingContent();
  const repaired=await restoreOriginalArticleDrafts();
  console.log("[CMS-SEED] "+JSON.stringify({...result,...repaired}));
}
main().catch(err=>{
  console.error("[CMS-SEED] FAILED:",err instanceof Error ? err.message : String(err));
  process.exitCode=1;
});
