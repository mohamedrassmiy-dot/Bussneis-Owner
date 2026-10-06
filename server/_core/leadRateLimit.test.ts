import { describe, it, expect } from "vitest";
import { assertLeadRateLimit } from "./leadRateLimit";

describe("public lead anti-spam guard", () => {
  it("permits up to five requests then returns TOO_MANY_REQUESTS", () => {
    const base=Date.now();
    const ip="qa-unique-ip-" + Math.random().toString(36);
    for(let i=0;i<5;i++) expect(()=>assertLeadRateLimit(ip,base+i)).not.toThrow();
    expect(()=>assertLeadRateLimit(ip,base+6)).toThrow("Please try again later.");
    expect(()=>assertLeadRateLimit(ip,base+15*60*1000+1)).not.toThrow();
  });
});
