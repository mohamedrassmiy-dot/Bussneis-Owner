import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { parse as parseCookies, serialize as serializeCookie } from "cookie";
import type { Request, Response } from "express";

const COOKIE = "bo_admin_session";
const TTL_SECONDS = 8 * 60 * 60;
const attempts = new Map<string, { failures: number; blockedUntil: number }>();

function equalStrings(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function config() {
  return {
    email: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
    hash: process.env.ADMIN_PASSWORD_HASH ?? "",
    secret: process.env.ADMIN_SESSION_SECRET ?? "",
  };
}

export function isAdminLoginConfigured(): boolean {
  const cfg = config();
  return !!(cfg.email && cfg.hash.startsWith("scrypt$") && cfg.secret.length >= 32);
}

function verifyPassword(password: string, encoded: string): boolean {
  const [scheme, salt, expected] = encoded.split("$");
  if (scheme !== "scrypt" || !/^[a-f0-9]{32,}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(expected ?? "")) return false;
  const calculated = scryptSync(password, Buffer.from(salt, "hex"), 64);
  return timingSafeEqual(calculated, Buffer.from(expected, "hex"));
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function issueSession() {
  const expires = Date.now() + TTL_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ sub: "owner", exp: expires })).toString("base64url");
  return payload + "." + sign(payload, config().secret);
}

export function isAdminSession(req: Request): boolean {
  const cfg = config();
  if (!isAdminLoginConfigured()) return false;
  const token = parseCookies(req.headers.cookie ?? "")[COOKIE];
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !equalStrings(sign(payload, cfg.secret), signature)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.sub === "owner" && Number.isSafeInteger(data.exp) && Date.now() < data.exp;
  } catch { return false; }
}

function setSessionCookie(res: Response, token: string, maxAge: number) {
  res.append("Set-Cookie", serializeCookie(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge,
  }));
}

export function registerAdminLogin(app: import("express").Express) {
  app.post("/api/admin/login", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isAdminLoginConfigured()) return res.status(503).json({ error: "Admin authentication is not configured" });
    const origin = req.get("origin");
    if (origin) {
      try { if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Invalid origin" }); }
      catch { return res.status(403).json({ error: "Invalid origin" }); }
    }
    const key = req.ip || "unknown";
    const now = Date.now();
    const entry = attempts.get(key);
    if (entry && entry.blockedUntil > now) return res.status(429).json({ error: "Try again later" });
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (email.length > 320 || password.length > 256) return res.status(400).json({ error: "Invalid credentials" });
    const cfg = config();
    const valid = equalStrings(email, cfg.email) && verifyPassword(password, cfg.hash);
    if (!valid) {
      const failures = (entry?.blockedUntil && entry.blockedUntil <= now ? 0 : entry?.failures ?? 0) + 1;
      attempts.set(key, { failures, blockedUntil: failures >= 5 ? now + 15 * 60 * 1000 : 0 });
      return res.status(401).json({ error: "Invalid credentials" });
    }
    attempts.delete(key);
    setSessionCookie(res, issueSession(), TTL_SECONDS);
    return res.json({ success: true });
  });
  app.post("/api/admin/logout", (req, res) => {
    setSessionCookie(res, "", 0);
    return res.json({ success: true });
  });
}
