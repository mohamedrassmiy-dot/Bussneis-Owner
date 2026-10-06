import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { parse as parseCookies } from "cookie";
import type { Request, Response, Express } from "express";
import { cmsGetSettings, cmsSetSetting } from "../db";
import { proSecurityEvent } from "../cmsProfessionalDb";

const COOKIE="bo_admin_session";
const TTL_SECONDS=8*60*60;
const SECURITY_KEY="admin_auth_config";
const attempts=new Map<string,{failures:number;blockedUntil:number}>();
let securityCache:{hash:string;version:number}|null=null;
let lastRefresh=0;

function safeCompare(a:string,b:string){
 const left=Buffer.from(a),right=Buffer.from(b);
 return left.length===right.length&&timingSafeEqual(left,right);
}
function config(){
 return {
  email:(process.env.ADMIN_EMAIL||"").trim().toLowerCase(),
  hash:securityCache?.hash||process.env.ADMIN_PASSWORD_HASH||"",
  version:securityCache?.version||1,
  secret:process.env.ADMIN_SESSION_SECRET||"",
 };
}
function sameOrigin(req:Request){
 const origin=req.get("origin");if(!origin)return true;
 try{return new URL(origin).host===req.get("host");}catch{return false;}
}
export async function refreshAdminSecurity(force=false){
 if(!force&&Date.now()-lastRefresh<1500)return;
 lastRefresh=Date.now();
 if(!process.env.DATABASE_URL)return;
 const values=await cmsGetSettings();
 const raw=values.find(x=>x.key===SECURITY_KEY)?.value;
 if(!raw){securityCache=null;return;}
 const item:unknown=JSON.parse(raw);
 if(!item||typeof item!=="object"||!("hash" in item)||!("version" in item))throw new Error("Invalid admin security state");
 const state=item as {hash:unknown;version:unknown};
 if(typeof state.hash!=="string"||!state.hash.startsWith("scrypt$")||!Number.isSafeInteger(state.version)||Number(state.version)<1)throw new Error("Invalid stored credential format");
 securityCache={hash:state.hash,version:Number(state.version)};
}
export function isAdminLoginConfigured(){
 const cfg=config();return Boolean(cfg.email&&cfg.hash.startsWith("scrypt$")&&cfg.secret.length>=32);
}
function validPassword(password:string,encoded:string){
 const [scheme,salt,expected]=encoded.split("$");
 if(scheme!=="scrypt"||!/^[a-f0-9]{32,}$/.test(salt||"")||!/^[a-f0-9]{128}$/.test(expected||""))return false;
 const result=scryptSync(password,Buffer.from(salt,"hex"),64);
 return timingSafeEqual(result,Buffer.from(expected,"hex"));
}
function signature(payload:string,secret:string){
 return createHmac("sha256",secret).update(payload).digest("hex");
}
function sessionToken(){
 const cfg=config();
 const payload=Buffer.from(JSON.stringify({sub:"owner",exp:Date.now()+TTL_SECONDS*1000,ver:cfg.version})).toString("base64url");
 return payload+"."+signature(payload,cfg.secret);
}
export function isAdminSession(req:Request){
 const cfg=config();
 if(!isAdminLoginConfigured())return false;
 const token=parseCookies(req.headers.cookie||"")[COOKIE];
 if(!token)return false;
 const [payload,mac]=token.split(".");
 if(!payload||!mac||!safeCompare(signature(payload,cfg.secret),mac))return false;
 try{
  const decoded=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
  return decoded.sub==="owner"&&decoded.ver===cfg.version&&Number.isSafeInteger(decoded.exp)&&Date.now()<decoded.exp;
 }catch{return false;}
}
export async function isAdminSessionFresh(req:Request){
 if(!(req.headers.cookie||"").includes(COOKIE+"="))return false;
 try{await refreshAdminSecurity(true);}catch{return false;}
 return isAdminSession(req);
}
export function clearAdminSession(res:Response){
 res.clearCookie(COOKIE,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/"});
}
function setAdminCookie(res:Response){
 res.cookie(COOKIE,sessionToken(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:TTL_SECONDS*1000});
}
function record(action:string,req:Request){
 if(process.env.DATABASE_URL)void proSecurityEvent(action,req.ip||"unknown",req.get("user-agent")).catch(()=>{});
}
async function rotateCredentials(hash:string){
 const state={hash,version:config().version+1};
 await cmsSetSetting(SECURITY_KEY,JSON.stringify(state));
 securityCache=state;lastRefresh=Date.now();
}
export function registerAdminLogin(app:Express){
 app.post("/api/admin/login",async(req,res)=>{
  res.set("Cache-Control","no-store");
  if(!sameOrigin(req))return res.status(403).json({error:"Invalid origin"});
  try{await refreshAdminSecurity(true);}catch{return res.status(503).json({error:"Authentication temporarily unavailable"});}
  if(!isAdminLoginConfigured())return res.status(503).json({error:"Admin authentication is not configured"});
  const key=req.ip||"unknown",now=Date.now();
  const prior=attempts.get(key);
  if(prior&&prior.blockedUntil>now)return res.status(429).json({error:"Try again later"});
  const email=typeof req.body?.email==="string"?req.body.email.trim().toLowerCase():"";
  const password=typeof req.body?.password==="string"?req.body.password:"";
  if(email.length>320||password.length>256)return res.status(400).json({error:"Invalid credentials"});
  const cfg=config();
  if(!safeCompare(email,cfg.email)||!validPassword(password,cfg.hash)){
   const failed=(prior?.blockedUntil&&prior.blockedUntil<=now?0:prior?.failures||0)+1;
   attempts.set(key,{failures:failed,blockedUntil:failed>=5?now+15*60*1000:0});
   record("login.failed",req);
   return res.status(401).json({error:"Invalid credentials"});
  }
  attempts.delete(key);
  setAdminCookie(res);record("login.success",req);
  return res.json({success:true});
 });
 app.post("/api/admin/change-password",async(req,res)=>{
  res.set("Cache-Control","no-store");
  if(!sameOrigin(req))return res.status(403).json({error:"Invalid origin"});
  if(!await isAdminSessionFresh(req))return res.status(401).json({error:"Unauthorized"});
  const current=typeof req.body?.currentPassword==="string"?req.body.currentPassword:"";
  const next=typeof req.body?.newPassword==="string"?req.body.newPassword:"";
  if(next.length<12||next.length>128||next===current)return res.status(422).json({error:"New password must be different and 12–128 characters long"});
  if(!validPassword(current,config().hash))return res.status(401).json({error:"Incorrect current password"});
  const salt=randomBytes(24);
  const newHash="scrypt$"+salt.toString("hex")+"$"+scryptSync(next,salt,64).toString("hex");
  try{await rotateCredentials(newHash);}catch{return res.status(503).json({error:"Could not update credentials"});}
  record("password.changed",req);clearAdminSession(res);
  return res.json({success:true,requiresLogin:true});
 });
 app.post("/api/admin/logout-others",async(req,res)=>{
  res.set("Cache-Control","no-store");
  if(!sameOrigin(req))return res.status(403).json({error:"Invalid origin"});
  if(!await isAdminSessionFresh(req))return res.status(401).json({error:"Unauthorized"});
  try{await rotateCredentials(config().hash);}catch{return res.status(503).json({error:"Could not revoke sessions"});}
  setAdminCookie(res);record("sessions.revoked",req);
  return res.json({success:true});
 });
 app.post("/api/admin/logout",(req,res)=>{res.set("Cache-Control","no-store");clearAdminSession(res);record("logout",req);return res.json({success:true});});
}
