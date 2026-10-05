import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createLead, getArticleBySlug, insertArticle, insertService, listAllArticles, listAllLeads, listAllServices, listPublishedArticles, listPublishedServices } from "./db";

const articleInput = z.object({ slug: z.string().min(2), title: z.string().min(3), excerpt: z.string().min(10), body: z.string().min(10), category: z.string().min(2), readTime: z.number().int().positive().default(5), status: z.enum(["draft", "published"]).default("draft") });
const serviceInput = z.object({ slug: z.string().min(2), title: z.string().min(3), summary: z.string().min(10), body: z.string().min(10), status: z.enum(["draft", "published"]).default("published"), sortOrder: z.number().int().default(0) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  articles: router({ list: publicProcedure.query(() => listPublishedArticles()), bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ input }) => getArticleBySlug(input.slug)) }),
  services: router({ list: publicProcedure.query(() => listPublishedServices()) }),
  leads: router({
    create: publicProcedure.input(z.object({ name: z.string().min(2), email: z.string().email(), company: z.string().optional(), service: z.string().optional(), message: z.string().min(8) })).mutation(({ input }) => createLead({ ...input, company: input.company || null, service: input.service || null, status: "new" })),
  }),
  admin: router({
    dashboard: adminProcedure.query(async () => { const [articles, services, leads] = await Promise.all([listAllArticles(), listAllServices(), listAllLeads()]); return { articles, services, leads }; }),
    createArticle: adminProcedure.input(articleInput).mutation(({ input }) => insertArticle(input)),
    createService: adminProcedure.input(serviceInput).mutation(({ input }) => insertService(input)),
  }),
});
export type AppRouter = typeof appRouter;
