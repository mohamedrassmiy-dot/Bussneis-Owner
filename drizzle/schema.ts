import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  title: varchar("title", { length: 300 }).notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  readTime: int("readTime").default(5).notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  featured: int("featured").default(0).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("published").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 220 }),
  service: varchar("service", { length: 180 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "closed"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const siteContent = mysqlTable("site_content", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;
export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/** Full bilingual CMS — one localized record per language, shared content key. */
export const cmsPages = mysqlTable("cms_pages", {
  id: int("id").autoincrement().primaryKey(),
  contentKey: varchar("content_key", { length: 120 }).notNull(),
  locale: mysqlEnum("locale", ["ar", "en"]).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  summary: text("summary"),
  featuredImage: text("featured_image"),
  imageAlt: varchar("image_alt", { length: 300 }),
  sections: json("sections").$type<Array<{ id: string; type: "hero"|"text"|"image"|"embed"|"cta"|"faq"; title?: string; body?: string; image?: string; alt?: string; url?: string; buttonLabel?: string; buttonUrl?: string }>>().notNull(),
  seoTitle: varchar("seo_title", { length: 300 }),
  seoDescription: text("seo_description"),
  canonicalUrl: text("canonical_url"),
  robots: varchar("robots", { length: 100 }).default("index,follow"),
  ogImage: text("og_image"),
  schemaJson: text("schema_json"),
  status: mysqlEnum("status", ["draft","published"]).default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export const cmsPosts = mysqlTable("cms_posts", {
  id: int("id").autoincrement().primaryKey(),
  contentKey: varchar("content_key", { length: 120 }).notNull(),
  locale: mysqlEnum("locale", ["ar", "en"]).notNull(),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 120 }),
  featuredImage: text("featured_image"),
  imageAlt: varchar("image_alt", { length: 300 }),
  embeds: json("embeds").$type<Array<{type:"video"|"iframe";url:string;title?:string}>>(),
  seoTitle: varchar("seo_title", { length: 300 }),
  seoDescription: text("seo_description"),
  canonicalUrl: text("canonical_url"),
  robots: varchar("robots", { length: 100 }).default("index,follow"),
  ogImage: text("og_image"),
  schemaJson: text("schema_json"),
  status: mysqlEnum("status", ["draft","published"]).default("draft").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export const cmsSettings = mysqlTable("cms_settings", {
  key: varchar("key", { length: 120 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
