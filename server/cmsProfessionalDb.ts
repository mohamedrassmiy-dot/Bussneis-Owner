import { and, desc, eq } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { getDb } from "./db";
import { cmsPages, cmsPosts, cmsSettings, cmsRedirects, cmsMedia, cmsAuditEvents, cmsSecurityEvents, leads } from "../drizzle/schema";

async function dbRequired(){
 const db=await getDb();
 if(!db)throw new Error("CMS database unavailable");
 return db;
}
export async function proDashboard(){
 const db=await dbRequired();
 const [pages,posts,contacts,redirects,media]=await Promise.all([
   db.select().from(cmsPages),
   db.select().from(cmsPosts),
   db.select().from(leads),
   db.select().from(cmsRedirects),
   db.select().from(cmsMedia),
 ]);
 const recent=await db.select().from(cmsAuditEvents).orderBy(desc(cmsAuditEvents.createdAt)).limit(8);
 return {
   pages:pages.length,posts:posts.length,publishedPages:pages.filter(x=>x.status==="published").length,
   publishedPosts:posts.filter(x=>x.status==="published").length,contactCount:contacts.length,
   newLeads:contacts.filter(x=>x.status==="new").length,redirects:redirects.length,images:media.length,recent
 };
}
export async function proRedirectList(){
 const db=await dbRequired();return db.select().from(cmsRedirects).orderBy(desc(cmsRedirects.updatedAt));
}
export async function proFindRedirect(sourcePath:string){
 const db=await dbRequired();const result=await db.select().from(cmsRedirects)
   .where(and(eq(cmsRedirects.sourcePath,sourcePath),eq(cmsRedirects.active,1))).limit(1);
 return result[0]??null;
}
export type RedirectInput={id?:number;sourcePath:string;destination:string;type:"301"|"302";active:number};
export async function proSaveRedirect(value:RedirectInput){
 const db=await dbRequired();
 if(value.id){const [row]=await db.select().from(cmsRedirects).where(eq(cmsRedirects.id,value.id)).limit(1);if(!row)throw new Error("Redirect not found");
   await db.update(cmsRedirects).set(value).where(eq(cmsRedirects.id,value.id));
   return {id:value.id};
 }
 const [created]=await db.insert(cmsRedirects).values(value).$returningId();return created;
}
export async function proRemoveRedirect(id:number){
 const db=await dbRequired();await db.delete(cmsRedirects).where(eq(cmsRedirects.id,id));return {success:true};
}
export async function proMediaList(){
 const db=await dbRequired();return db.select().from(cmsMedia).orderBy(desc(cmsMedia.createdAt)).limit(500);
}
export async function proRecordMedia(input:{fileKey:string;publicUrl:string;originalName?:string;mime:string;bytes:number}){
 const db=await dbRequired();const [created]=await db.insert(cmsMedia).values(input).$returningId();return created;
}
export async function proSetMediaAlt(id:number,alt:string){
 const db=await dbRequired();await db.update(cmsMedia).set({alt}).where(eq(cmsMedia.id,id));return {success:true};
}
export async function proAudit(action:string,subject?:string,details?:string){
 const db=await dbRequired();await db.insert(cmsAuditEvents).values({action,subject,details});return {success:true};
}
export async function proAuditList(){
 const db=await dbRequired();return db.select().from(cmsAuditEvents).orderBy(desc(cmsAuditEvents.createdAt)).limit(100);
}
export async function proSecurityEvent(action:string,ip:string,userAgent?:string){
 try{
  const db=await dbRequired();
  const hash=createHmac("sha256",process.env.ADMIN_SESSION_SECRET||"no-config")
    .update(ip||"unknown").digest("hex");
  await db.insert(cmsSecurityEvents).values({action,ipFingerprint:hash.slice(0,20),userAgent:userAgent?.slice(0,300)});
 }catch(err){console.warn("[Security] event not stored",err instanceof Error?err.message:String(err));}
}
export async function proSecurityList(){
 const db=await dbRequired();return db.select().from(cmsSecurityEvents).orderBy(desc(cmsSecurityEvents.createdAt)).limit(80);
}
export async function proLeadList(){
 const db=await dbRequired();return db.select().from(leads).orderBy(desc(leads.createdAt)).limit(1000);
}
export async function proUpdateLead(id:number,value:{status?:typeof leads.$inferInsert.status;notes?:string;source?:string}){
 const db=await dbRequired();const [row]=await db.select().from(leads).where(eq(leads.id,id)).limit(1);
 if(!row)throw new Error("Lead not found");
 await db.update(leads).set(value).where(eq(leads.id,id));
 return {success:true};
}
export async function proSeoAudit(){
 const db=await dbRequired();
 const [pages,posts]=await Promise.all([db.select().from(cmsPages),db.select().from(cmsPosts)]);
 const documents=[
  ...pages.map(p=>({id:p.id,kind:"page" as const,locale:p.locale,slug:p.slug,title:p.title,summary:p.summary||"",body:(p.sections||[]).map(s=>s.body||"").join(" "),image:p.featuredImage,alt:p.imageAlt,status:p.status,robots:p.robots,seoTitle:p.seoTitle,seoDescription:p.seoDescription,canonical:p.canonicalUrl,schema:p.schemaJson})),
  ...posts.map(p=>({id:p.id,kind:"post" as const,locale:p.locale,slug:p.slug,title:p.title,summary:p.excerpt,body:p.body,image:p.featuredImage,alt:p.imageAlt,status:p.status,robots:p.robots,seoTitle:p.seoTitle,seoDescription:p.seoDescription,canonical:p.canonicalUrl,schema:p.schemaJson})),
 ];
 return documents.map(item=>{
  const checks=[
   {key:"title",ok:!!item.seoTitle&&item.seoTitle.length>=15&&item.seoTitle.length<=65,label:"SEO title (15–65 chars)"},
   {key:"description",ok:!!item.seoDescription&&item.seoDescription.length>=70&&item.seoDescription.length<=160,label:"Meta description (70–160 chars)"},
   {key:"body",ok:item.body.trim().length>=250,label:"Substantial page content"},
   {key:"image",ok:!!item.image,label:"Featured image"},
   {key:"alt",ok:!item.image||!!item.alt,label:"Image ALT"},
   {key:"slug",ok:/^[a-z0-9-]{2,180}$/.test(item.slug),label:"Readable URL slug"},
   {key:"structured",ok:!!item.schema,label:"Structured data"},
  ];
  const warnings=checks.filter(c=>!c.ok).map(c=>c.label);
  const score=Math.round(checks.filter(c=>c.ok).length*100/checks.length);
  return {id:item.id,kind:item.kind,locale:item.locale,slug:item.slug,title:item.title,status:item.status,robots:item.robots,
    score,missing:warnings.length,warnings,metaOk:checks.find(x=>x.key==="description")?.ok||false};
 });
}
export async function proPublicSettings(){
 const db=await dbRequired();const rows=await db.select().from(cmsSettings);
 const allowed=new Set(["site_name_ar","site_name_en","site_description_ar","site_description_en","site_url","location","timezone","default_og_image","google_site_verification","contact_email","favicon_url","brand_tagline_ar","brand_tagline_en"]);
 return Object.fromEntries(rows.filter(x=>allowed.has(x.key)).map(x=>[x.key,x.value]));
}
