import { importExistingContent } from "./cmsImport";
import { proDashboard,proRedirectList,proSaveRedirect,proRemoveRedirect,proMediaList,proSetMediaAlt,proAudit,proAuditList,proSecurityList,proLeadList,proUpdateLead,proSeoAudit,proPublicSettings } from "./cmsProfessionalDb";
import { z } from "zod";
import { assertLeadRateLimit } from "./_core/leadRateLimit";
import { clearAdminSession } from "./_core/adminAuth";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createLead, getArticleBySlug, insertArticle, insertService, listAllArticles, listAllLeads, listAllServices, listPublishedArticles, listPublishedServices, updateLeadStatus, updateArticle, updateService, cmsList, cmsFindPublished, cmsSavePage, cmsSavePost, cmsDelete, cmsGetSettings, cmsSetSetting } from "./db";

const articleInput = z.object({ slug: z.string().min(2), title: z.string().min(3), excerpt: z.string().min(10), body: z.string().min(10), category: z.string().min(2), readTime: z.number().int().positive().default(5), status: z.enum(["draft", "published"]).default("draft") });
const serviceInput = z.object({ slug: z.string().min(2), title: z.string().min(3), summary: z.string().min(10), body: z.string().min(10), status: z.enum(["draft", "published"]).default("published"), sortOrder: z.number().int().default(0) });


const locale = z.enum(["ar","en"]);
const safeUrl = z.string().url().max(2048).refine(value => /^https:\/\//i.test(value),"HTTPS only");
const safeImage = safeUrl.optional().nullable();
const embedUrl = safeUrl.refine(value => {
  const h=new URL(value).hostname.toLowerCase();
  return ["www.youtube.com","youtube.com","www.youtube-nocookie.com","player.vimeo.com","www.google.com","maps.google.com","www.figma.com"].includes(h);
},"Embed provider not allowed");
const safeCallToAction = z.string().max(2048).refine(value => {
  if(value.startsWith("/") && !value.startsWith("//") && !value.includes("\\\\")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Only HTTPS and site-relative links are allowed");
const section = z.object({
  id:z.string().min(1).max(80),
  type:z.enum(["hero","text","image","embed","cta","faq","cards"]),
  title:z.string().max(300).optional(),
  body:z.string().max(50000).optional(),
  image:safeUrl.optional(),
  alt:z.string().max(300).optional(),
  url:embedUrl.optional(),
  buttonLabel:z.string().max(150).optional(),
  buttonUrl:safeCallToAction.optional(),
  cards:z.array(z.object({id:z.string().max(80),title:z.string().max(300),body:z.string().max(10000).optional(),image:safeUrl.optional(),alt:z.string().max(300).optional(),buttonLabel:z.string().max(100).optional(),buttonUrl:safeCallToAction.optional()})).max(24).optional(),
});
const seoFields={
  seoTitle:z.string().max(300).nullable().optional(),
  seoDescription:z.string().max(1000).nullable().optional(),
  canonicalUrl:safeUrl.optional().nullable(),
  robots:z.enum(["index,follow","noindex,follow","noindex,nofollow"]).optional(),
  ogImage:safeImage,
  schemaJson:z.string().max(30000).refine(x=>{try{JSON.parse(x);return true}catch{return false}},"Invalid JSON").optional().nullable(),
};
const baseCms = {
 id:z.number().int().positive().optional(),
 contentKey:z.string().regex(/^[a-z0-9-]{2,120}$/),
 locale,
 slug:z.string().regex(/^[a-z0-9-]{2,180}$/),
 title:z.string().min(3).max(300),
 featuredImage:safeImage,
 imageAlt:z.string().max(300).optional().nullable(),
 status:z.enum(["draft","published"]).default("draft"),
 ...seoFields
};
const cmsPageInput=z.object({...baseCms,summary:z.string().max(3000).optional().nullable(),sections:z.array(section).max(80)});
const cmsPostInput=z.object({...baseCms,excerpt:z.string().min(10),body:z.string().min(10),category:z.string().max(120).optional().nullable(),embeds:z.array(z.object({type:z.enum(["video","iframe"]),url:embedUrl,title:z.string().max(200).optional()})).max(20).optional().nullable()});
const settingInput=z.object({key:z.enum(["site_name_ar","site_name_en","site_description_ar","site_description_en","site_url","location","timezone","default_og_image","google_site_verification","gsc_verification_file_name","gsc_verification_file_content","robots_txt","head_embed","footer_embed","contact_email","favicon_url","brand_tagline_ar","brand_tagline_en","seo_default_title_ar","seo_default_title_en","seo_default_description_ar","seo_default_description_en","ga4_id","gtm_id","global_schema_json"]),value:z.string().max(30000)});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); clearAdminSession(ctx.res); return { success: true } as const; }),
  }),
  articles: router({ list: publicProcedure.query(() => listPublishedArticles()), bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getArticleBySlug(input.slug)) }),
  services: router({ list: publicProcedure.query(() => listPublishedServices()) }),
  leads: router({
    create: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), company: z.string().trim().max(150).optional(), service: z.string().trim().max(150).optional(), message: z.string().trim().min(8).max(3000) })).mutation(({ ctx, input }) => { assertLeadRateLimit(ctx.req.ip ?? "unknown"); return createLead({ ...input, name: input.name.trim(), email: input.email.trim().toLowerCase(), company: input.company?.trim() || null, service: input.service?.trim() || null, message: input.message.trim(), status: "new" }); }),
  }),
  cms: router({
    publishedPages:publicProcedure.input(z.object({locale})).query(({input})=>cmsList("page",true,input.locale)),
    publishedPosts:publicProcedure.input(z.object({locale})).query(({input})=>cmsList("post",true,input.locale)),
    publishedPage:publicProcedure.input(z.object({locale,slug:z.string()})).query(({input})=>cmsFindPublished("page",input.slug,input.locale)),
    publishedPost:publicProcedure.input(z.object({locale,slug:z.string()})).query(({input})=>cmsFindPublished("post",input.slug,input.locale)),
    importExisting:adminProcedure.mutation(()=>importExistingContent()),
    pages:adminProcedure.query(()=>cmsList("page")),
    posts:adminProcedure.query(()=>cmsList("post")),
    settings:adminProcedure.query(async()=> (await cmsGetSettings()).filter(x=>!x.key.startsWith("admin_"))),
    publicSettings:publicProcedure.query(()=>proPublicSettings()),
    savePage:adminProcedure.input(cmsPageInput).mutation(async({input})=>{const result=await cmsSavePage(input);await proAudit("page.save",input.locale+":"+input.slug).catch(()=>{});return result;}),
    savePost:adminProcedure.input(cmsPostInput).mutation(async({input})=>{const result=await cmsSavePost(input);await proAudit("post.save",input.locale+":"+input.slug).catch(()=>{});return result;}),
    deleteContent:adminProcedure.input(z.object({kind:z.enum(["page","post"]),id:z.number().int().positive()})).mutation(async({input})=>{const result=await cmsDelete(input.kind,input.id);await proAudit("content.delete",input.kind+":"+input.id).catch(()=>{});return result;}),
    saveSetting:adminProcedure.input(settingInput).mutation(async({input})=>{
      if(input.key==="site_url" && input.value && !/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(input.value)) throw new Error("Site URL must be HTTPS");
      if(input.key==="gsc_verification_file_name" && input.value && !/^google[a-z0-9_-]{8,90}\.html$/i.test(input.value)) throw new Error("Invalid GSC verification filename");
      if(input.key==="global_schema_json" && input.value){try{JSON.parse(input.value)}catch{throw new Error("Invalid JSON-LD")}}
      const result=await cmsSetSetting(input.key,input.value);
      await proAudit("settings.save",input.key).catch(()=>{});
      return result;
    }),
  }),
  pro: router({
    summary:adminProcedure.query(()=>proDashboard()),
    seoAudit:adminProcedure.query(()=>proSeoAudit()),
    redirects:adminProcedure.query(()=>proRedirectList()),
    saveRedirect:adminProcedure.input(z.object({
      id:z.number().int().positive().optional(),
      sourcePath:z.string().regex(/^\/[a-zA-Z0-9][a-zA-Z0-9/_-]{0,239}$/),
      destination:z.string().regex(/^\/(?!\/|api\/|Admin(?:\/|$)|admin(?:\/|$)|media\/)[a-zA-Z0-9/_-]+(?:\?[a-zA-Z0-9=&_%.-]*)?$/),
      type:z.enum(["301","302"]).default("301"),
      active:z.boolean().default(true),
    }).refine(x=>x.sourcePath!==x.destination,{message:"Redirect cannot point to itself"}))
    .mutation(async({input})=>{
      const existing=await proRedirectList();
      if(existing.some(x=>x.sourcePath===input.destination.split("?")[0]&&x.destination.split("?")[0]===input.sourcePath))
        throw new Error("Two-way redirect loop");
      const result=await proSaveRedirect({...input,active:input.active?1:0});
      await proAudit("redirect.save",input.sourcePath).catch(()=>{});
      return result;
    }),
    deleteRedirect:adminProcedure.input(z.object({id:z.number().int().positive()})).mutation(async({input})=>{
      const result=await proRemoveRedirect(input.id);
      await proAudit("redirect.delete",String(input.id)).catch(()=>{});
      return result;
    }),
    media:adminProcedure.query(()=>proMediaList()),
    mediaAlt:adminProcedure.input(z.object({id:z.number().int().positive(),alt:z.string().max(300)})).mutation(async({input})=>{
      const result=await proSetMediaAlt(input.id,input.alt);
      await proAudit("media.alt",String(input.id)).catch(()=>{});
      return result;
    }),
    audit:adminProcedure.query(()=>proAuditList()),
    security:adminProcedure.query(()=>proSecurityList()),
    leads:adminProcedure.query(()=>proLeadList()),
    updateLead:adminProcedure.input(z.object({
      id:z.number().int().positive(),
      status:z.enum(["new","contacted","qualified","proposal","won","lost","closed"]).optional(),
      notes:z.string().max(5000).optional(),
      source:z.string().max(100).optional(),
    }).refine(v=>v.status!==undefined||v.notes!==undefined||v.source!==undefined))
    .mutation(async({input})=>{
      const {id,...data}=input;
      const result=await proUpdateLead(id,data);
      await proAudit("lead.update",String(id)).catch(()=>{});
      return result;
    }),
  }),
  admin: router({
    dashboard: adminProcedure.query(async () => { const [articles, services, leads] = await Promise.all([listAllArticles(), listAllServices(), listAllLeads()]); return { articles, services, leads }; }),
    createArticle: adminProcedure.input(articleInput).mutation(({ input }) => insertArticle(input)),
    createService: adminProcedure.input(serviceInput).mutation(({ input }) => insertService(input)),
    updateLeadStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "contacted", "closed"]) })).mutation(({ input }) => updateLeadStatus(input.id, input.status)),
    updateArticle: adminProcedure.input(z.object({ id: z.number().int().positive(), data: articleInput.partial().refine(value => Object.keys(value).length > 0) })).mutation(({ input }) => updateArticle(input.id, input.data)),
    updateService: adminProcedure.input(z.object({ id: z.number().int().positive(), data: serviceInput.partial().refine(value => Object.keys(value).length > 0) })).mutation(({ input }) => updateService(input.id, input.data)),
  }),
});
export type AppRouter = typeof appRouter;
