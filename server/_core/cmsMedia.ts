import type { Express } from "express";
import express from "express";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isAdminSession } from "./adminAuth";
import { proRecordMedia,proAudit } from "../cmsProfessionalDb";

function mediaClient() {
  const { MEDIA_ENDPOINT, MEDIA_BUCKET, MEDIA_REGION, MEDIA_ACCESS_KEY_ID, MEDIA_SECRET_ACCESS_KEY } = process.env;
  if (!MEDIA_ENDPOINT || !MEDIA_BUCKET || !MEDIA_ACCESS_KEY_ID || !MEDIA_SECRET_ACCESS_KEY) return null;
  return {
    bucket: MEDIA_BUCKET,
    s3: new S3Client({
      region: MEDIA_REGION || "auto",
      endpoint: MEDIA_ENDPOINT,
      credentials: { accessKeyId: MEDIA_ACCESS_KEY_ID, secretAccessKey: MEDIA_SECRET_ACCESS_KEY },
      forcePathStyle: false,
    }),
  };
}
function fileType(bytes: Buffer): { ext: string; mime: string } | null {
  if (bytes.length >= 3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return {ext:"jpg",mime:"image/jpeg"};
  if (bytes.length >= 8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {ext:"png",mime:"image/png"};
  if (bytes.length >= 12 && bytes.toString("ascii",0,4)==="RIFF" && bytes.toString("ascii",8,12)==="WEBP") return {ext:"webp",mime:"image/webp"};
  return null;
}
export function registerCmsMedia(app: Express) {
  app.post("/api/admin/media", express.raw({type:["image/jpeg","image/png","image/webp"],limit:"5mb"}), async (req,res)=>{
    if (!isAdminSession(req)) return res.status(401).json({error:"Unauthorized"});
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({error:"Image required"});
    const type=fileType(req.body);
    if(!type)return res.status(415).json({error:"Only JPG, PNG and WebP images are allowed"});
    const media=mediaClient();
    if(!media)return res.status(503).json({error:"Media storage is not configured"});
    const key="cms/"+randomUUID()+"."+type.ext;
    try{
      await media.s3.send(new PutObjectCommand({Bucket:media.bucket,Key:key,Body:req.body,ContentType:type.mime,CacheControl:"public,max-age=86400"}));
      const url="https://"+(process.env.RAILWAY_PUBLIC_DOMAIN || req.get("host"))+"/media/"+key.slice(4);
      await proRecordMedia({fileKey:key,publicUrl:url,mime:type.mime,bytes:req.body.length});
      await proAudit("media.upload",key).catch(()=>{});
      return res.status(201).json({url});
    }catch(error){console.error("Media upload failed",error);return res.status(502).json({error:"Image upload failed"});}
  });
  app.get("/media/:filename",async(req,res)=>{
    if(!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(req.params.filename))return res.status(404).end();
    const media=mediaClient();
    if(!media)return res.status(503).end();
    try{
      const signed=await getSignedUrl(media.s3,new GetObjectCommand({Bucket:media.bucket,Key:"cms/"+req.params.filename}),{expiresIn:300});
      return res.set("Cache-Control","public,max-age=240").redirect(302,signed);
    }catch(error){console.error("Media fetch failed",error);return res.status(502).end();}
  });
}
