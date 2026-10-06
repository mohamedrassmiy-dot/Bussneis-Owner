import { TRPCError } from "@trpc/server";

/** Basic best-effort spam mitigation. Railway multi-replica deployments need Redis for global limits. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5;
const attempts = new Map<string, { start: number; count: number }>();

export function assertLeadRateLimit(ip: string, now = Date.now()) {
  const key = ip || "unknown";
  if (attempts.size > 4000) {
    for (const [address, record] of attempts) {
      if (now - record.start >= WINDOW_MS) attempts.delete(address);
    }
    if (attempts.size > 4000) attempts.clear();
  }
  const state = attempts.get(key);
  if (!state || now - state.start >= WINDOW_MS) {
    attempts.set(key, { start: now, count: 1 });
    return;
  }
  if (state.count >= MAX_PER_IP) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please try again later." });
  }
  state.count += 1;
}
