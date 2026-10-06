import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAdminLogin } from "./adminAuth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { cmsGetSettings, cmsList } from "../db";
import { registerCmsMedia } from "./cmsMedia";
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
    res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
    next();
  });
  // Keep public request bodies bounded. Media uploads should use object storage/presigned URLs.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  // Dynamic sitemap reflects only published bilingual CMS content.
  app.get("/sitemap.xml",async(req,res)=>{
    try{
      const [pages,posts]=await Promise.all([cmsList("page",true),cmsList("post",true)]);
      const origin=(process.env.PUBLIC_SITE_URL||"https://bussneis-owner-production.up.railway.app").replace(/\/$/,"");
      const escapeXml=(x:string)=>x.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      const urls=[
        {path:"/",updated:new Date()},
        {path:"/en",updated:new Date()},
        ...pages.map(x=>({path:(x.locale==="en"?"/en":"")+"/p/"+encodeURIComponent(x.slug),updated:x.updatedAt})),
        ...posts.map(x=>({path:(x.locale==="en"?"/en":"")+"/blog/"+encodeURIComponent(x.slug),updated:x.updatedAt}))
      ];
      const xml='<?xml version="1.0" encoding="UTF-8"?>'+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(x=>'<url><loc>'+escapeXml(origin+x.path)+'</loc><lastmod>'+x.updated.toISOString().slice(0,10)+'</lastmod></url>').join("")+'</urlset>';
      res.type("application/xml").send(xml);
    }catch(e){res.status(503).type("text/plain").send("Sitemap unavailable: CMS database is not configured");}
  });
  app.get("/robots.txt",async(_req,res)=>{
    const fallback=["User-agent: *","Allow: /","Disallow: /Admin","Disallow: /admin","Disallow: /api/","Sitemap: https://bussneis-owner-production.up.railway.app/sitemap.xml"].join("\n")+"\n";
    try{
      const settings=await cmsGetSettings();
      const custom=settings.find(x=>x.key==="robots_txt")?.value;
      res.type("text/plain").send(custom||fallback);
    }catch{res.type("text/plain").send(fallback)}
  });
  app.get("/sitemap.xml",async(req,res)=>{
    try{
      const [pages,posts]=await Promise.all([cmsList("page",true),cmsList("post",true)]);
      const base="https://bussneis-owner-production.up.railway.app";
      const urls=[base+"/",base+"/en",...pages.filter(p=>p.robots==="index,follow").map(p=>base+(p.locale==="en"?"/en":"")+"/p/"+encodeURIComponent(p.slug)),...posts.filter(p=>p.robots==="index,follow").map(p=>base+(p.locale==="en"?"/en":"")+"/blog/"+encodeURIComponent(p.slug))];
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
      const name=map.get("gsc_verification_file_name");
      const content=map.get("gsc_verification_file_content");
      if(name!==req.path.slice(1)||content!==`google-site-verification: ${name}`)return next();
      res.set("Cache-Control","public, max-age=300").type("text/plain; charset=utf-8").send(content);
    }catch{next()}
  });
  registerAdminLogin(app);
  registerCmsMedia(app);
  if (process.env.MANUS_OAUTH_API_URL) registerOAuthRoutes(app);
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

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
