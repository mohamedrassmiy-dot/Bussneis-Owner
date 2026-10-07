import { importExistingContent } from "../cmsImport";
import { originalArticles, originalServices } from "../cmsLegacyData";
import { restoreOriginalArticleDrafts } from "../repairLegacyDrafts";
import { seedBusinessOwnerSettings } from "../cmsDefaults";
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAdminLogin, refreshAdminSecurity } from "./adminAuth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { cmsGetSettings, cmsList } from "../db";
import { registerCmsMedia } from "./cmsMedia";
import { proFindRedirect } from "../cmsProfessionalDb";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self'; connect-src 'self'; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com https://www.figma.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");
    next();
  });
  // Keep public request bodies bounded. Media uploads should use object storage/presigned URLs.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  app.get("/robots.txt",async(_req,res)=>{
    const fallback=["User-agent: *","Allow: /","Disallow: /Admin","Disallow: /admin","Disallow: /api/","Sitemap: https://bussneis-owner.up.railway.app/sitemap.xml"].join("\n")+"\n";
    try{
      const settings=await cmsGetSettings();
      const custom=settings.find(x=>x.key==="robots_txt")?.value;
      res.type("text/plain").send(custom||fallback);
    }catch{res.type("text/plain").send(fallback)}
  });
  app.get("/sitemap.xml",async(req,res)=>{
    try{
      const [pages,posts,settings]=await Promise.all([cmsList("page",true),cmsList("post",true),cmsGetSettings()]);
      const configuredBase=(settings.find(x=>x.key==="site_url")?.value||"").replace(/\/$/,"");
      const runtimeBase="https://"+(process.env.RAILWAY_PUBLIC_DOMAIN||req.get("host"));
      const base=/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(configuredBase)?configuredBase:runtimeBase;
      const originalPaths=[
        "/","/en","/services","/en/services","/articles","/en/articles",
        "/about","/en/about","/contact","/en/contact",
        ...originalServices.map(x=>(x.locale==="en"?"/en":"")+"/services/"+encodeURIComponent(x.slug)),
        ...originalArticles.map(x=>(x.locale==="en"?"/en":"")+"/articles/"+encodeURIComponent(x.slug))
      ];
      const pagePath=(p:typeof pages[number])=>{
        const prefix=p.locale==="en"?"/en":"";
        if(p.slug==="home")return prefix||"/";
        if(["services","articles","about","contact"].includes(p.slug))return prefix+"/"+p.slug;
        if(p.slug.startsWith("service-"))return prefix+"/services/"+p.slug.slice(8);
        return prefix+"/p/"+encodeURIComponent(p.slug);
      };
      const postPath=(p:typeof posts[number])=>
        (p.locale==="en"?"/en":"")+(originalArticles.some(a=>a.locale===p.locale&&a.slug===p.slug)?"/articles/":"/blog/")+encodeURIComponent(p.slug);
      const block=new Set([
        ...pages.filter(p=>p.robots?.startsWith("noindex")).map(pagePath),
        ...posts.filter(p=>p.robots?.startsWith("noindex")).map(postPath)
      ]);
      const paths=new Set([...originalPaths,...pages.filter(p=>p.robots!=="noindex,nofollow"&&p.robots!=="noindex,follow").map(pagePath),...posts.filter(p=>p.robots!=="noindex,nofollow"&&p.robots!=="noindex,follow").map(postPath)]);
      const urls=[...paths].filter(path=>!block.has(path)).map(path=>base+path);
      const escapeXml=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      res.type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(url=>"<url><loc>"+escapeXml(url)+"</loc></url>").join("")+"</urlset>");
    }catch{res.status(503).send("Sitemap unavailable");}
  });
  // Serve Google Search Console HTML verification without writing arbitrary files.
  app.use(async (req,res,next)=>{
    if(!/^\/google[a-z0-9_-]{8,90}\.html$/i.test(req.path))return next();
    try{
      const rows=await cmsGetSettings();
      const map=new Map(rows.map(x=>[x.key,x.value]));
      const storedName=(map.get("gsc_verification_file_name")||"").trim();
      const content=(map.get("gsc_verification_file_content")||"").trim();
      const contentMatch=/^google-site-verification:\s*(google[a-z0-9_-]{8,90}\.html)$/i.exec(content);
      // Browsers may rename duplicate downloads to "google... 3.html" or "(3)".
      // Google requires the canonical filename embedded inside the official file content.
      const canonicalName=contentMatch?.[1] || storedName;
      if(!/^google[a-z0-9_-]{8,90}\.html$/i.test(canonicalName)||canonicalName!==req.path.slice(1))return next();
      if(contentMatch && contentMatch[1].toLowerCase()!==canonicalName.toLowerCase())return next();
      const canonicalContent=`google-site-verification: ${canonicalName}`;
      res.set("Cache-Control","public, max-age=300").type("text/plain; charset=utf-8").send(canonicalContent);
    }catch{next()}
  });
  // Active, admin-managed internal 301/302 redirects: before the SPA fallback.
  app.use(async(req,res,next)=>{
    if(req.method!=="GET" && req.method!=="HEAD")return next();
    if(!/^\/[a-zA-Z0-9][a-zA-Z0-9/_-]{0,239}$/.test(req.path))return next();
    if(/^\/(api|media|Admin|admin)(\/|$)/i.test(req.path))return next();
    try{
      const redirect=await proFindRedirect(req.path);
      if(redirect && redirect.destination!==req.path){
        res.set("Cache-Control","public,max-age=300");
        return res.redirect(redirect.type==="301"?301:302,redirect.destination);
      }
    }catch(err){console.warn("[Redirect] lookup failed",err instanceof Error?err.message:String(err));}
    next();
  });
  registerAdminLogin(app);
  registerCmsMedia(app);
  if (process.env.MANUS_OAUTH_API_URL) registerOAuthRoutes(app);
  // Refuse cross-site state-changing API calls even if a session cookie is present.
  app.use("/api/trpc", (req, res, next) => {
    if(req.method !== "POST") return next();
    const origin = req.get("origin");
    if(!origin) return next();
    try {
      const supplied = new URL(origin);
      if(supplied.protocol === "https:" && supplied.host === req.get("host")) return next();
    }catch{}
    return res.status(403).json({ error: "Cross-origin writes are not allowed" });
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Seed editable draft records for legacy routes without changing published pages.
  // Idempotent: existing CMS records are never overwritten.
  if (process.env.DATABASE_URL) {
    try {
      const result = await importExistingContent();
      const repair = await restoreOriginalArticleDrafts();
      const defaults = await seedBusinessOwnerSettings();
      console.log("[CMS] Existing-content draft import:", { ...result, ...repair, defaultSettingsInserted: defaults.inserted });
    } catch (error) {
      console.error("[CMS] Draft import failed; public site remains available:", error);
    }
  }
  try { await refreshAdminSecurity(true); } catch (error) { console.error("[Admin] Security configuration load failed",error); }
  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
