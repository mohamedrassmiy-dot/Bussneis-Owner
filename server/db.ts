import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { articles, InsertArticle, InsertLead, InsertService, leads, services, InsertUser, users, cmsPages, cmsPosts, cmsSettings } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listPublishedArticles() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt));
}
export async function getArticleBySlug(slug: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1); return result[0];
}
export async function listPublishedServices() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(services).where(eq(services.status, "published")).orderBy(services.sortOrder);
}
export async function createLead(input: InsertLead) {
  const db = await getDb(); if (!db) throw new Error("Lead storage is unavailable");
  await db.insert(leads).values(input); return { persisted: true };
}
export async function listAllArticles() { const db = await getDb(); return db ? db.select().from(articles).orderBy(desc(articles.createdAt)) : []; }
export async function listAllServices() { const db = await getDb(); return db ? db.select().from(services).orderBy(services.sortOrder) : []; }
export async function listAllLeads() { const db = await getDb(); return db ? db.select().from(leads).orderBy(desc(leads.createdAt)) : []; }
export async function insertArticle(input: InsertArticle) { const db = await getDb(); if (!db) return null; const result = await db.insert(articles).values(input); return result; }
export async function insertService(input: InsertService) { const db = await getDb(); if (!db) return null; const result = await db.insert(services).values(input); return result; }

export async function updateLeadStatus(id: number, status: "new" | "contacted" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(leads).set({ status }).where(eq(leads.id, id));
  return { success: true };
}

export async function updateArticle(id: number, fields: Partial<InsertArticle>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const patch = { ...fields, ...(fields.status === "published" ? { publishedAt: new Date() } : {}) };
  await db.update(articles).set(patch).where(eq(articles.id, id));
  return { success: true };
}

export async function updateService(id: number, fields: Partial<InsertService>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(services).set(fields).where(eq(services.id, id));
  return { success: true };
}

/** CMS operations always fail explicitly if the persistent database is unavailable. */
async function requiredDb() { const db = await getDb(); if (!db) throw new Error("CMS database is not configured"); return db; }
export async function cmsList(kind:"page"|"post", publishedOnly=false, locale?:"ar"|"en") {
  const db=await requiredDb();
  if(kind==="page") {
    const rows=await db.select().from(cmsPages).orderBy(desc(cmsPages.updatedAt));
    return rows.filter(x=>(!publishedOnly||x.status==="published")&&(!locale||x.locale===locale));
  }
  const rows=await db.select().from(cmsPosts).orderBy(desc(cmsPosts.updatedAt));
  return rows.filter(x=>(!publishedOnly||x.status==="published")&&(!locale||x.locale===locale));
}
export async function cmsGet(kind:"page"|"post", id:number) {
  const db=await requiredDb();
  if(kind==="page")return (await db.select().from(cmsPages).where(eq(cmsPages.id,id)).limit(1))[0]??null;
  return (await db.select().from(cmsPosts).where(eq(cmsPosts.id,id)).limit(1))[0]??null;
}
export function cmsFindPublished(kind:"page",slug:string,locale:"ar"|"en"):Promise<typeof cmsPages.$inferSelect|null>;
export function cmsFindPublished(kind:"post",slug:string,locale:"ar"|"en"):Promise<typeof cmsPosts.$inferSelect|null>;
export async function cmsFindPublished(kind:"page"|"post",slug:string,locale:"ar"|"en") {
  const db=await requiredDb();
  if(kind==="page") {
    const rows=await db.select().from(cmsPages).where(eq(cmsPages.slug,slug));
    return rows.find(x=>x.locale===locale&&x.status==="published")??null;
  }
  const rows=await db.select().from(cmsPosts).where(eq(cmsPosts.slug,slug));
  return rows.find(x=>x.locale===locale&&x.status==="published")??null;
}
export async function cmsSavePage(input:typeof cmsPages.$inferInsert) {
  const db=await requiredDb();
  if(input.id){await db.update(cmsPages).set(input).where(eq(cmsPages.id,input.id));return {id:input.id};}
  const [r]=await db.insert(cmsPages).values(input).$returningId();return r;
}
export async function cmsSavePost(input:typeof cmsPosts.$inferInsert) {
  const db=await requiredDb();
  if(input.id){await db.update(cmsPosts).set(input).where(eq(cmsPosts.id,input.id));return {id:input.id};}
  const [r]=await db.insert(cmsPosts).values(input).$returningId();return r;
}
export async function cmsDelete(kind:"page"|"post",id:number) {
  const db=await requiredDb();
  if(kind==="page")await db.delete(cmsPages).where(eq(cmsPages.id,id));
  else await db.delete(cmsPosts).where(eq(cmsPosts.id,id));
  return {success:true};
}
export async function cmsGetSettings() {
  const db=await requiredDb();
  return db.select().from(cmsSettings);
}
export async function cmsSetSetting(key:string,value:string) {
  const db=await requiredDb();
  await db.insert(cmsSettings).values({key,value}).onDuplicateKeyUpdate({set:{value}});
  return {success:true};
}
