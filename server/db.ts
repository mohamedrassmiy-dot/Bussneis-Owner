import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { articles, InsertArticle, InsertLead, InsertService, leads, services, InsertUser, users } from "../drizzle/schema";
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
  const db = await getDb(); if (!db) return { persisted: false };
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
