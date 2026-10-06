import { importExistingContent } from "./cmsImport";
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
const section = z.object({
  id:z.string().min(1).max(80),
  type:z.enum(["hero","text","image","embed","cta","faq"]),
  title:z.string().max(300).optional(),
  body:z.string().max(50000).optional(),
  image:safeUrl.optional(),
  alt:z.string().max(300).optional(),
  url:embedUrl.optional(),
  buttonLabel:z.string().max(150).optional(),
  buttonUrl:z.string().max(2048).optional(),
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
const settingInput=z.object({key:z.enum(["site_name_ar","site_name_en","site_description_ar","site_description_en","default_og_image","google_site_verification","gsc_verification_file_name","gsc_verification_file_content","robots_txt","head_embed","footer_embed"]),value:z.string().max(30000)});

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
    settings:adminProcedure.query(()=>cmsGetSettings()),
    savePage:adminProcedure.input(cmsPageInput).mutation(({input})=>cmsSavePage(input)),
    savePost:adminProcedure.input(cmsPostInput).mutation(({input})=>cmsSavePost(input)),
    deleteContent:adminProcedure.input(z.object({kind:z.enum(["page","post"]),id:z.number().int().positive()})).mutation(({input})=>cmsDelete(input.kind,input.id)),
    saveSetting:adminProcedure.input(settingInput).mutation(({input})=>cmsSetSetting(input.key,input.value)),
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
