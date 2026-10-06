/**
 * Permissioned, NON-DESTRUCTIVE staging checks. Never runs against Production.
 * No password guessing, no contact-form submissions, no stress or exploit payloads.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const requireQA = createRequire("/tmp/business-owner-qa/package.json");
const { chromium } = requireQA("playwright");
const AxeBuilder = requireQA("@axe-core/playwright").default;
const BASE = (process.env.QA_BASE_URL || "https://business-owner-v3-staging-production.up.railway.app").replace(/\/$/, "");
if (!BASE.startsWith("https://business-owner-v3-staging-production.up.railway.app")) {
  throw new Error("Refusing to run: QA target must be the dedicated Staging domain");
}
const outDir = process.env.QA_ARTIFACT_DIR || "qa-results";
fs.mkdirSync(outDir, { recursive: true });
const findings = [];
const observations = [];
const add = (level, id, detail) => findings.push({ level, id, detail });
const check = (condition, id, detail) => { if (!condition) add("blocker", id, detail); };
const fetchWithTimeout = (route, options={}) =>
  fetch(BASE + route, { ...options, redirect:"manual", signal: AbortSignal.timeout(20000) });

try {
  const health = await fetchWithTimeout("/api/health");
  check(health.status === 200, "HEALTH", "Expected 200 from /api/health; got " + health.status);
  const robots = await fetchWithTimeout("/robots.txt");
  const robotsBody = await robots.text();
  check(robots.status === 200 && /Disallow:\s*\/Admin/i.test(robotsBody), "ROBOTS", "Private admin must be disallowed from indexing");
  const sitemap = await fetchWithTimeout("/sitemap.xml");
  const sitemapBody = await sitemap.text();
  check(sitemap.status === 200 && sitemapBody.includes("<urlset"), "SITEMAP", "Sitemap must return valid XML");
  for (const api of ["/api/trpc/admin.dashboard", "/api/trpc/cms.pages", "/api/trpc/cms.posts", "/api/trpc/cms.settings"]) {
    const res = await fetchWithTimeout(api);
    const body = await res.text();
    check([401,403].includes(res.status) && /(UNAUTHORIZED|FORBIDDEN)/i.test(body), "AUTHZ_" + api, "Private CMS API returned " + res.status + ", body: " + body.slice(0,150));
  }
  const noAuthUpload = await fetchWithTimeout("/api/admin/media", {
    method:"POST", headers:{"Content-Type":"image/png"}, body:Buffer.from([137,80,78,71,13,10,26,10]),
  });
  check(noAuthUpload.status === 401, "UNAUTH_UPLOAD", "Image upload must reject anonymous requests, got " + noAuthUpload.status);
  const foreignOrigin = await fetchWithTimeout("/api/admin/login",{
    method:"POST", headers:{"Origin":"https://untrusted.invalid","Content-Type":"application/json"},
    body: JSON.stringify({email:"nobody@invalid.example",password:"not-a-real-password"}),
  });
  check(foreignOrigin.status === 403, "FOREIGN_ORIGIN", "Admin login must reject cross-origin POST, got " + foreignOrigin.status);
  observations.push({category:"security",message:"Unauthenticated admin endpoints, uploads, and foreign-origin login checked."});
  const securityHeaders = await fetchWithTimeout("/");
  for (const [name, value] of [["x-content-type-options","nosniff"],["x-frame-options","SAMEORIGIN"],["referrer-policy","strict-origin-when-cross-origin"]]) {
    check(securityHeaders.headers.get(name)?.toLowerCase() === value.toLowerCase(), "HEADER_"+name, name + " must be "+value);
  }
  const csp = securityHeaders.headers.get("content-security-policy") || "";
  check(csp.includes("frame-ancestors 'self'") && csp.includes("object-src 'none'") , "CSP", "CSP must protect against framing and plugin-based content; received: "+csp.slice(0,300));
  const scriptPolicy = csp.split(";").find(directive => directive.trim().startsWith("script-src")) || "";
  if(scriptPolicy.includes("'unsafe-inline'")) observations.push({category:"security",severity:"medium",message:"Script execution policy permits unsafe-inline; change to nonces or hashes."});

  const browser=await chromium.launch({ headless:true, args:["--no-sandbox"] });
  try {
    const matrix = [
      {id:"ar-home-mobile",url:"/",width:390,height:844},
      {id:"ar-home-tablet",url:"/",width:768,height:1024},
      {id:"ar-home-desktop",url:"/",width:1440,height:900},
      {id:"en-home-mobile",url:"/en",width:390,height:844},
      {id:"en-home-desktop",url:"/en",width:1440,height:900},
      {id:"ar-contact-mobile",url:"/contact",width:390,height:844},
      {id:"en-contact-mobile",url:"/en/contact",width:390,height:844},
      {id:"admin-mobile",url:"/Admin",width:390,height:844},
      {id:"admin-desktop",url:"/Admin",width:1440,height:900},
      {id:"articles-mobile",url:"/articles",width:390,height:844},
      {id:"services-mobile",url:"/services",width:390,height:844},
    ];
    for(const target of matrix){
      const context=await browser.newContext({viewport:{width:target.width,height:target.height},deviceScaleFactor:1, isMobile:target.width<768,hasTouch:target.width<768});
      const page=await context.newPage();
      const runtimeErrors=[];
      page.on("pageerror",err=>runtimeErrors.push(err.message));
      try{
        const res=await page.goto(BASE+target.url,{waitUntil:"networkidle",timeout:30000});
        await page.waitForTimeout(650);
        check(res?.status()===200,"PAGE_"+target.id, "Expected 200 for "+target.url+", got "+res?.status());
        const pageText=await page.locator("body").innerText();
        check(!pageText.includes("An unexpected error occurred"),"REACT_"+target.id,"React error boundary rendered at "+target.url);
        check((await page.locator("h1").count())>=1,"H1_"+target.id,"No H1 heading on "+target.url);
        const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));
        check(overflow<=5,"OVERFLOW_"+target.id,"Horizontal overflow: "+overflow+"px at "+target.width+"px, "+target.url);
        if(runtimeErrors.length)add("blocker","JS_"+target.id,runtimeErrors.slice(0,3).join(" | "));
        const imgs=await page.locator("img").evaluateAll(images=>images.filter(img=>img.complete&&!img.naturalWidth).slice(0,4).map(img=>img.getAttribute("src")));
        if(imgs.length)add("warning","BROKEN_IMG_"+target.id,"Broken images: "+imgs.join(", "));
        if(target.id.startsWith("admin")) {
          check((await page.locator('input[type="password"]').count())>=1, "ADMIN_PROTECTED_"+target.id, "Admin must present sign-in, not public CMS");
        }
        if(target.id.includes("contact")) {
          check((await page.locator("form input[type='email']").count())>=1, "CONTACT_FORM_"+target.id, "Contact form must include email");
          check((await page.locator("form textarea").count())>=1, "CONTACT_MESSAGE_"+target.id, "Contact form must include message");
        }
        const screenshotFile=path.join(outDir,target.id+".png");
        await page.screenshot({path:screenshotFile,fullPage:true,animations:"disabled"});
        observations.push({category:"ui",route:target.url,viewport:target.width+"x"+target.height,screenshot:screenshotFile,overflow,jsErrors:runtimeErrors.length});
        if(["ar-home-desktop","en-home-desktop","admin-mobile"].includes(target.id)){
          const axe=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze();
          const accessibility=axe.violations.map(x=>({rule:x.id,impact:x.impact,count:x.nodes.length,description:x.help,examples:x.nodes.slice(0,6).map(n=>({target:n.target,html:n.html?.slice(0,240),summary:n.failureSummary?.slice(0,320)}))}));
          fs.writeFileSync(path.join(outDir,target.id+"-accessibility.json"),JSON.stringify(accessibility,null,2));
          for(const a of accessibility) {
            if(["serious","critical"].includes(a.impact))add("blocker","A11Y_"+target.id+"_"+a.rule,a.impact+" "+a.description+" ("+a.count+" nodes). Targets: "+JSON.stringify(a.examples));
            else add("warning","A11Y_"+target.id+"_"+a.rule,a.impact+" "+a.description+" ("+a.count+" nodes)");
          }
        }
      }catch(e){add("blocker","BROWSER_"+target.id,String(e).slice(0,600))}
      finally{await context.close();}
    }
  }finally{await browser.close();}
}catch(e){add("blocker","QA_SETUP",e instanceof Error?e.stack||e.message:String(e))}
const outcome={
  base:BASE,when:new Date().toISOString(),result:findings.some(x=>x.level==="blocker")?"FAIL":"PASS",
  blockers:findings.filter(x=>x.level==="blocker").length,warnings:findings.filter(x=>x.level==="warning").length,
  findings,observations,
  limits:["Non-destructive passive + limited authz/origin checks only","No authenticated CMS CRUD or lead submission without isolated reversible test data","No DoS, fuzzing, brute force, or exploitation"],
};
fs.writeFileSync(path.join(outDir,"report.json"),JSON.stringify(outcome,null,2));
process.stdout.write("PREDEPLOY_QA_REPORT="+JSON.stringify(outcome)+"\n");
if(outcome.result!=="PASS")process.exitCode=1;
