import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { cmsFindPublished, cmsGetSettings } from "../db";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res, next) => {
    try {
      let html = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf8");
      try {
        const settings = await cmsGetSettings();
        const setting = (key:string)=>settings.find(x=>x.key===key)?.value||"";
        const locale = req.path==="/en"||req.path.startsWith("/en/")?"en":"ar";
        const escapeHtml = (value:string)=>value.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        const updateMeta=(attr:"name"|"property",key:string,value:string)=>{
          if(!value)return;
          const match=new RegExp('<meta '+attr+'="'+key+'" content="[^"]*"\\s*\\/?>','i');
          const tag='<meta '+attr+'="'+key+'" content="'+escapeHtml(value)+'" />';
          html=match.test(html)?html.replace(match,tag):html.replace("</head>",tag+"</head>");
        };
        const updateLink=(rel:string,value:string)=>{
          if(!value)return;
          const regex=new RegExp('<link rel="'+rel+'" href="[^"]*"\\s*\\/?>','i');
          const tag='<link rel="'+rel+'" href="'+escapeHtml(value)+'" />';
          html=regex.test(html)?html.replace(regex,tag):html.replace("</head>",tag+"</head>");
        };
        let seoTitle=setting("seo_default_title_"+locale)||setting("site_name_"+locale);
        let description=setting("seo_default_description_"+locale)||setting("site_description_"+locale);
        let canonical="https://bussneis-owner-production.up.railway.app"+req.path;
        let robots="index,follow";
        let openGraphImage=setting("default_og_image")||"/business-owner-transparent.png";
        const parts=req.path.split("/").filter(Boolean);
        const contentPath=locale==="en"?parts.slice(1):parts;
        let kind:"page"|"post"|null=null;
        let slug="";
        if(!contentPath.length){kind="page";slug="home";}
        else if(contentPath.length===1&&["about","contact","services","articles"].includes(contentPath[0])){kind="page";slug=contentPath[0];}
        else if(contentPath.length===2&&contentPath[0]==="services"){kind="page";slug="service-"+contentPath[1];}
        else if(contentPath.length===2&&["articles","blog"].includes(contentPath[0])){kind="post";slug=contentPath[1];}
        else if(contentPath.length===2&&contentPath[0]==="p"){kind="page";slug=contentPath[1];}
        if(kind&&slug){
          const item=kind==="page"?await cmsFindPublished("page",slug,locale):await cmsFindPublished("post",slug,locale);
          if(item){
            seoTitle=item.seoTitle||item.title+" | Business Owner";
            description=item.seoDescription||(kind==="page"?"summary" in item?item.summary||"":"":"excerpt" in item?item.excerpt:"");
            canonical=item.canonicalUrl||canonical;
            robots=item.robots||"index,follow";
            openGraphImage=item.ogImage||item.featuredImage||openGraphImage;
            if(item.schemaJson){
              try{JSON.parse(item.schemaJson);html=html.replace("</head>",'<script type="application/ld+json">'+item.schemaJson.replace(/</g,"\\u003c")+'</script></head>');}
              catch{console.warn("[SEO] Invalid JSON-LD omitted");}
            }
          }
        }
        const rawToken = setting("google_site_verification").trim();
        const tokenMatch =
          /^<meta[^>]+name=["']google-site-verification["'][^>]+content=["']([^"']+)["'][^>]*>$/i.exec(rawToken)
          || /^<meta[^>]+content=["']([^"']+)["'][^>]+name=["']google-site-verification["'][^>]*>$/i.exec(rawToken);
        const token=(tokenMatch?.[1]||rawToken).trim();
        if(/^[A-Za-z0-9_-]{10,150}$/.test(token))updateMeta("name","google-site-verification",token);
        updateMeta("name","description",description);
        updateMeta("name","robots",robots);
        updateMeta("property","og:title",seoTitle);
        updateMeta("property","og:description",description);
        updateMeta("property","og:image",openGraphImage);
        updateLink("canonical",canonical);
        if(/^https:\/\//.test(setting("favicon_url"))||/^\/(?!\/)/.test(setting("favicon_url")))updateLink("icon",setting("favicon_url"));
        if(seoTitle)html=html.replace(/<title>[^<]*<\/title>/i,"<title>"+escapeHtml(seoTitle)+"</title>");
        const globalSchema=setting("global_schema_json");
        if(globalSchema){try{JSON.parse(globalSchema);html=html.replace("</head>",'<script type="application/ld+json">'+globalSchema.replace(/</g,"\\u003c")+'</script></head>');}catch{}}
      } catch (error) {
        console.error("[CMS SEO] Public metadata lookup failed", error instanceof Error?error.message:String(error));
      }
      res.set("Cache-Control", "no-store").type("html").send(html);
    } catch (error) { next(error); }
  });
}
