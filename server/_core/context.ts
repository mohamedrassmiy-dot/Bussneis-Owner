import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { isAdminSessionFresh } from "./adminAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  if (await isAdminSessionFresh(opts.req)) {
    const now = new Date();
    user = {
      id: 0, openId: "local-admin", name: "Business Owner Admin",
      email: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
      loginMethod: "password", role: "admin",
      createdAt: now, updatedAt: now, lastSignedIn: now,
    };
    return { req: opts.req, res: opts.res, user };
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
