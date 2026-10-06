import "dotenv/config";
import { importExistingContent } from "./cmsImport";

async function main() {
  const result=await importExistingContent();
  console.log("[CMS-SEED] "+JSON.stringify(result));
}
main().catch(err=>{
  console.error("[CMS-SEED] FAILED:",err instanceof Error ? err.message : String(err));
  process.exitCode=1;
});
