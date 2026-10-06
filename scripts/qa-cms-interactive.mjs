/** Interactive CMS regression, local fake admin and NO database mutations. */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
const requireQA=createRequire("/tmp/business-owner-qa/package.json");
const {chromium}=requireQA("playwright");
const PORT=53077, BASE="http://127.0.0.1:"+PORT;
const out="cms-qa-results";fs.mkdirSync(out,{recursive:true});
const failures=[],success=[];
const check=(cond,id,msg)=>{if(!cond)failures.push({id,msg});else success.push(id);};
const password="cms-only-test-password-Do-Not-Use";
const salt=randomBytes(24);
const hash="scrypt$"+salt.toString("hex")+"$"+scryptSync(password,salt,64).toString("hex");
const server=spawn(process.execPath,["dist/index.js"],{env:{...process.env,NODE_ENV:"test",PORT:String(PORT),
  DATABASE_URL:"",ADMIN_EMAIL:"qa-admin@example.invalid",
  ADMIN_PASSWORD_HASH:hash,ADMIN_SESSION_SECRET:randomBytes(48).toString("hex")},stdio:["ignore","pipe","pipe"]});
let childLogs="";
server.stdout.on("data",b=>{childLogs+=b.toString().slice(-600)});
server.stderr.on("data",b=>{childLogs+=b.toString().slice(-600)});
const delay=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function awaitHealth(){for(let i=0;i<45;i++){try{const r=await fetch(BASE+"/api/health");if(r.ok)return;}catch{}await delay(300)}throw new Error("Local test server did not start: "+childLogs.slice(-800));}
try{
 await awaitHealth();
 const login=await fetch(BASE+"/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json","Origin":BASE},body:JSON.stringify({email:"qa-admin@example.invalid",password})});
 check(login.status===200,"admin-login","Local isolated admin login failed with "+login.status);
 const cookie=login.headers.get("set-cookie")?.split(";")[0]||"";
 const name=cookie.split("=")[0],value=cookie.split("=").slice(1).join("=");
 check(name==="bo_admin_session","cookie","Expected signed admin session cookie");
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
 for(const width of [390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:850}});
  await context.addCookies([{name,value,domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Strict",secure:false}]);
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(BASE+"/Admin",{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForTimeout(1400);
  check(!(await page.locator("body").innerText()).includes("An unexpected error occurred"),"admin-render-"+width,"React boundary visible");
  check(await page.getByText("BUSINESS OWNER CMS").count()>0,"cms-brand-"+width,"CMS shell title missing");
  const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-window.innerWidth));
  check(overflow<=6,"cms-overflow-"+width,"Horizontal CMS overflow: "+overflow);
  check(!errors.length,"cms-js-"+width,errors.slice(0,3).join("|"));
  await page.screenshot({path:out+"/dashboard-"+width+".png",fullPage:true,animations:"disabled"});
  if(width===390){
   await page.getByRole("button",{name:"فتح القائمة"}).click();
   check(await page.getByRole("navigation",{name:"أقسام لوحة التحكم"}).getByText("الصفحات").isVisible(),"mobile-navigation","Mobile menu failed to open");
   await page.getByRole("navigation",{name:"أقسام لوحة التحكم"}).getByText("الصفحات").click();
   await page.waitForTimeout(500);
   check(await page.getByText("الصفحات العربية والإنجليزية").count()>0,"pages-view","Pages module not rendered");
   await page.getByRole("button",{name:/إضافة جديد/}).click();
   await page.getByRole("button",{name:"الأقسام"}).click();
   await page.getByRole("button",{name:"CARDS"}).click();
   check(await page.getByRole("button",{name:"Add card",exact:false}).count()>0||await page.getByRole("button",{name:"إضافة بطاقة"}).count()>0,"cards-editor","Card section editor unavailable");
   await page.screenshot({path:out+"/page-builder-mobile.png",fullPage:true,animations:"disabled"});
  }
  await context.close();
 }
 }finally{await browser.close();}
}catch(err){failures.push({id:"qa-runner",msg:err instanceof Error?err.stack||err.message:String(err)})}
finally{server.kill("SIGTERM");await delay(250);}
const result={pass:failures.length===0,passed:success.length,failures,scope:"local test credentials only; no database write"};
fs.writeFileSync(out+"/report.json",JSON.stringify(result,null,2));
console.log("CMS_INTERACTIVE_REPORT="+JSON.stringify(result));
if(!result.pass)process.exitCode=1;
