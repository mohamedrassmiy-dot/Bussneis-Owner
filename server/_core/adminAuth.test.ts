import express from "express";
import type { Server } from "node:http";
import { randomBytes, scryptSync } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isAdminSession, registerAdminLogin } from "./adminAuth";

describe("isolated admin session security regression", () => {
  let server: Server;
  let origin = "";
  const previous = {
    email: process.env.ADMIN_EMAIL,
    hash: process.env.ADMIN_PASSWORD_HASH,
    secret: process.env.ADMIN_SESSION_SECRET,
  };
  const testPassword = "qa-admin-strong-password-only";
  beforeAll(async () => {
    const salt = randomBytes(24);
    process.env.ADMIN_EMAIL = "qa-owner@example.invalid";
    process.env.ADMIN_PASSWORD_HASH =
      "scrypt$" + salt.toString("hex") + "$" + scryptSync(testPassword, salt, 64).toString("hex");
    process.env.ADMIN_SESSION_SECRET = randomBytes(48).toString("hex");
    const app = express();
    app.use(express.json({ limit: "16kb" }));
    registerAdminLogin(app);
    app.get("/check", (req, res) => res.status(isAdminSession(req) ? 200 : 401).end());
    server = await new Promise<Server>(resolve => {
      const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test server port");
    origin = "http://127.0.0.1:" + address.port;
  });
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve()));
    for (const [key, value] of [
      ["ADMIN_EMAIL", previous.email],
      ["ADMIN_PASSWORD_HASH", previous.hash],
      ["ADMIN_SESSION_SECRET", previous.secret],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const login = (email: string, password: string, requestOrigin?: string) =>
    fetch(origin + "/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestOrigin ? { Origin: requestOrigin } : {}),
      },
      body: JSON.stringify({ email, password }),
    });

  it("rejects cross-origin login and wrong passwords without creating a session", async () => {
    const crossOrigin = await login("qa-owner@example.invalid", testPassword, "https://evil.example");
    expect(crossOrigin.status).toBe(403);
    const wrong = await login("qa-owner@example.invalid", "invalid-password");
    expect(wrong.status).toBe(401);
    expect(wrong.headers.get("set-cookie")).toBeNull();
  });

  it("issues signed httpOnly strict cookies and clears the correct cookie on logout", async () => {
    const good = await login("qa-owner@example.invalid", testPassword, origin);
    expect(good.status).toBe(200);
    const cookieHeader = good.headers.get("set-cookie") ?? "";
    expect(cookieHeader).toContain("bo_admin_session=");
    expect(cookieHeader.toLowerCase()).toContain("httponly");
    expect(cookieHeader.toLowerCase()).toContain("samesite=strict");
    const cookie = cookieHeader.split(";")[0];
    const authorized = await fetch(origin + "/check", { headers: { Cookie: cookie } });
    expect(authorized.status).toBe(200);
    const tampered = await fetch(origin + "/check", { headers: { Cookie: cookie + "tampered" } });
    expect(tampered.status).toBe(401);
    const logout = await fetch(origin + "/api/admin/logout", {
      method: "POST", headers: { Cookie: cookie },
    });
    expect(logout.status).toBe(200);
    const cleared = logout.headers.get("set-cookie") ?? "";
    expect(cleared).toContain("bo_admin_session=");
    expect(cleared.toLowerCase()).toContain("expires=");
  });
});
