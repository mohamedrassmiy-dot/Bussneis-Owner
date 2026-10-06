import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createLead, cmsDelete, cmsGet, cmsSavePage, cmsSavePost, getDb, listAllLeads } from "./db";
import { leads,cmsRedirects,cmsMedia,cmsAuditEvents,cmsSecurityEvents } from "../drizzle/schema";
import { proSaveRedirect,proRedirectList,proRemoveRedirect,proUpdateLead,proLeadList,proRecordMedia,proMediaList,proAudit,proAuditList,proSecurityEvent,proSecurityList,proSeoAudit } from "./cmsProfessionalDb";

/** Reversible non-production storage checks. No real customer records are touched. */
async function run(){
 if (process.env.RAILWAY_SERVICE_NAME !== "business-owner-v3-staging") {
   throw new Error("Refusing CMS integration check outside the dedicated staging service");
 }
 const db=await getDb();
 if(!db)throw new Error("Staging MySQL is unavailable");
 const key="qa-"+randomUUID().replaceAll("-","");
 const email=key+"@example.invalid";
 let pageId:number|undefined;
 let postId:number|undefined;
 let leadSaved=false;
 let redirectId:number|undefined;
 let mediaId:number|undefined;
 let securityEventAction="qa-security-"+key;
 let auditSubject="qa-audit-"+key;
 const storedKey="cms/"+key+".png";
 let s3:S3Client|undefined;
 let s3Uploaded=false;
 let bucket="";
 const completed:string[]=[];
 try{
   const page=await cmsSavePage({
     contentKey:key,locale:"en",slug:key,title:"QA temporary page",summary:"Private predeploy storage test",
     sections:[{id:"qa-section",type:"text",title:"Stored",body:"Test only"}],status:"draft",
   });
   pageId=page.id;
   const read=await cmsGet("page",pageId);
   if(!read||read.title!=="QA temporary page"||!("sections" in read)||read.sections.length!==1)throw new Error("CMS page read-after-write failed");
   await cmsSavePage({
     id:pageId,contentKey:key,locale:"en",slug:key,title:"QA temporary page edited",
     summary:"Private predeploy storage test",sections:[{id:"qa-section",type:"text",title:"Updated",body:"Test only"}],status:"draft",
   });
   const updated=await cmsGet("page",pageId);
   if(!updated||updated.title!=="QA temporary page edited")throw new Error("CMS page update failed");
   completed.push("cms_page_create_update_read");

   const post=await cmsSavePost({
     contentKey:key,locale:"en",slug:key,title:"QA temporary post",excerpt:"Test-only staging content",
     body:"This is a staging-only article used for a reversible smoke check.",
     status:"draft",
   });
   postId=post.id;
   const published=await cmsGet("post",postId);
   if(!published||published.title!=="QA temporary post"||!("body" in published))throw new Error("CMS post read-after-write failed");
   completed.push("cms_post_create_read");

   const saved=await createLead({
     name:"QA ephemeral record",email,company:null,service:"qa-staging",
     message:"QA test only. Automatically deleted before deployment.",status:"new",
   });
   if(!saved.persisted)throw new Error("Contact form lead persistence failed");
   leadSaved=true;
   const matching=(await listAllLeads()).find(x=>x.email===email);
   if(!matching)throw new Error("Saved contact lead cannot be queried");
   completed.push("lead_create_and_read");

   await proUpdateLead(matching.id,{status:"qualified",notes:"QA staging record; never a real lead."});
   const changedLead=(await proLeadList()).find(x=>x.id===matching.id);
   if(changedLead?.status!=="qualified"||!changedLead.notes?.startsWith("QA staging"))
     throw new Error("Lead CRM stage/notes update failed");
   completed.push("crm_update_stage_and_notes");

   const redirect=await proSaveRedirect({sourcePath:"/qa-"+key,destination:"/qa-target-"+key,type:"302",active:1});
   redirectId=redirect.id;
   const redirectStored=(await proRedirectList()).find(x=>x.id===redirectId);
   if(!redirectStored||redirectStored.type!=="302")throw new Error("Redirect manager could not read inserted rule");
   completed.push("redirect_create_and_read");

   await proAudit("qa.integration",auditSubject);
   if(!(await proAuditList()).some(x=>x.subject===auditSubject))throw new Error("CMS audit log not persistent");
   completed.push("cms_audit_event");

   await proSecurityEvent(securityEventAction,"127.0.0.99","cms integration smoke");
   if(!(await proSecurityList()).some(x=>x.action===securityEventAction))throw new Error("Security event log not persistent");
   completed.push("security_event_hashed_storage");

   const checks=await proSeoAudit();
   if(!checks.length||!checks.every(x=>x.score>=0&&x.score<=100))throw new Error("SEO audit unavailable");
   completed.push("real_cms_seo_audit");


   const { MEDIA_ENDPOINT,MEDIA_BUCKET,MEDIA_ACCESS_KEY_ID,MEDIA_SECRET_ACCESS_KEY,MEDIA_REGION }=process.env;
   if(!MEDIA_ENDPOINT||!MEDIA_BUCKET||!MEDIA_ACCESS_KEY_ID||!MEDIA_SECRET_ACCESS_KEY)
     throw new Error("Image storage is missing required configuration");
   bucket=MEDIA_BUCKET;
   s3=new S3Client({
     region:MEDIA_REGION||"auto",endpoint:MEDIA_ENDPOINT,
     credentials:{accessKeyId:MEDIA_ACCESS_KEY_ID,secretAccessKey:MEDIA_SECRET_ACCESS_KEY},
     forcePathStyle:false,requestHandler:undefined,
   });
   const onePixelPng=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==","base64");
   await s3.send(new PutObjectCommand({Bucket:bucket,Key:storedKey,Body:onePixelPng,ContentType:"image/png"}));
   s3Uploaded=true;
   const head=await s3.send(new HeadObjectCommand({Bucket:bucket,Key:storedKey}));
   if(head.ContentLength!==onePixelPng.length)throw new Error("Uploaded image did not persist correctly");
   completed.push("image_object_put_and_head");
   const mediaRow=await proRecordMedia({fileKey:storedKey,publicUrl:"https://staging.invalid/media/"+key+".png",mime:"image/png",bytes:onePixelPng.length});
   mediaId=mediaRow.id;
   if(!(await proMediaList()).some(x=>x.id===mediaId))throw new Error("Media library record not persisted");
   completed.push("media_library_persistence");

 }finally{
   const cleanupErrors:string[]=[];
   if(redirectId)try{await proRemoveRedirect(redirectId);}catch{cleanupErrors.push("redirect cleanup failed");}
   if(mediaId)try{await db.delete(cmsMedia).where(eq(cmsMedia.id,mediaId));}catch{cleanupErrors.push("media record cleanup failed");}
   try{await db.delete(cmsAuditEvents).where(eq(cmsAuditEvents.subject,auditSubject));}catch{cleanupErrors.push("audit cleanup failed");}
   try{await db.delete(cmsSecurityEvents).where(eq(cmsSecurityEvents.action,securityEventAction));}catch{cleanupErrors.push("security event cleanup failed");}
   if(s3 && s3Uploaded)try{await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:storedKey}));}catch(e){cleanupErrors.push("image cleanup failed");}
   if(leadSaved)try{await db.delete(leads).where(eq(leads.email,email));}catch(e){cleanupErrors.push("lead cleanup failed");}
   if(postId)try{await cmsDelete("post",postId);}catch(e){cleanupErrors.push("post cleanup failed");}
   if(pageId)try{await cmsDelete("page",pageId);}catch(e){cleanupErrors.push("page cleanup failed");}
   if(cleanupErrors.length)throw new Error("Staging QA cleanup failed: "+cleanupErrors.join(", "));
 }
 console.log("[STAGING-SMOKE] "+JSON.stringify({result:"PASS",checks:completed,cleanedUp:true}));
}
run().catch(err=>{console.error("[STAGING-SMOKE] FAILED:",err instanceof Error?err.message:String(err));process.exitCode=1});
