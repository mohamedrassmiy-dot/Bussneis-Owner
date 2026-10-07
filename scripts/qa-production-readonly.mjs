/** Read-only post-deployment smoke check against the actual production hostname. Deployment verification: 2026-10-07. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const requireQA=createRequire("/tmp/business-owner-qa/package.json");
const {chromium}=requireQA("playwright");
const BASE="https://bussneis-owner.up.railway.app";
const output="production-smoke-results";
fs.mkdirSync(output,{recursive:true});
const problems=[];
const passed=[];
const assert=(ok,id,detail)=>{if(!ok)problems.push({id,detail});else passed.push(id);};
const probe=async(route)=>{
  const response=await fetch(BASE+route,{redirect:"manual",signal:AbortSignal.timeout(20000)});
  return {response,body:await response.text()};
};
try{
  const health=await probe("/api/health");
  assert(health.response.ok && /"status":"ok"/.test(health.body),"health","Health endpoint did not report ok");
  const robots=await probe("/robots.txt");
  assert(robots.response.status===200 && /Disallow:\s*\/Admin/.test(robots.body),"robots","Admin must be excluded from robots");
  const sitemap=await probe("/sitemap.xml");
  assert(sitemap.response.status===200 && sitemap.body.includes("<urlset"),"sitemap","Sitemap unavailable or malformed");
  const privateApi=await probe("/api/trpc/cms.pages");
  assert([401,403].includes(privateApi.response.status),"unauthorized-cms","Private CMS list exposed or otherwise unavailable: "+privateApi.response.status);
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  try{
    const pages=[
      {id:"ar-mobile",route:"/",width:390,height:844},
      {id:"ar-tablet",route:"/",width:768,height:1024},
      {id:"ar-desktop",route:"/",width:1440,height:900},
      {id:"en-mobile",route:"/en",width:390,height:844},
      {id:"en-desktop",route:"/en",width:1440,height:900},
      {id:"admin-mobile",route:"/Admin",width:390,height:844},
      {id:"admin-desktop",route:"/Admin",width:1440,height:900},
      {id:"contact-ar",route:"/contact",width:390,height:844},
      {id:"contact-en",route:"/en/contact",width:390,height:844},
    ];
    for(const target of pages){
      const context=await browser.newContext({viewport:{width:target.width,height:target.height},deviceScaleFactor:1});
      const page=await context.newPage();const errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      try{
        const response=await page.goto(BASE+target.route,{waitUntil:"networkidle",timeout:30000});
        assert(response?.status()===200,"route-"+target.id,"GET "+target.route+" returned "+response?.status());
        assert(!(await page.locator("body").innerText()).includes("An unexpected error occurred"),"react-"+target.id,"React error boundary is visible");
        const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));
        assert(overflow<=5,"layout-"+target.id,"Horizontal overflow at "+target.width+"px: "+overflow);
        assert(!errors.length,"js-"+target.id,errors.slice(0,3).join("; "));
        if(target.id.startsWith("admin")){
          assert(await page.locator('input[type="password"]').count()>=1,"admin-login-"+target.id,"Login UI not rendered or admin access exposed");
        }
        if(target.id.startsWith("contact")){
          assert(await page.locator("form input[type='email']").count()>=1,"contact-"+target.id,"No email field in form");
        }
        await page.screenshot({path:path.join(output,target.id+".png"),fullPage:true,animations:"disabled"});
      }catch(err){problems.push({id:"browser-"+target.id,detail:String(err)})}
      await context.close();
    }
  }finally{await browser.close();}
}catch(error){problems.push({id:"runner",detail:String(error)})}
const result={pass:problems.length===0,passed:passed.length,failures:problems,scopedTo:"read-only production",unauthenticated:true,limits:"No authenticated CMS editing/lead submission"};
fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(result,null,2));
console.log("PROD_SMOKE_REPORT="+JSON.stringify(result));
if(!result.pass)process.exitCode=1;
