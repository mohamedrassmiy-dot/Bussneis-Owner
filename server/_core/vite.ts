import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

function injectGoogleSiteVerification(html: string) {
  const token = String(process.env.GOOGLE_SITE_VERIFICATION || "").trim();
  if (!token) return html;

  const safeToken = token
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const meta = `<meta name="google-site-verification" content="${safeToken}" />`;
  const existing = /<meta\s+name=["']google-site-verification["'][^>]*>/i;

  if (existing.test(html)) return html.replace(existing, meta);
  return html.replace(/<\/head>/i, `  ${meta}\n  </head>`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const transformed = await vite.transformIndexHtml(url, template);
      const page = injectGoogleSiteVerification(transformed);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  const indexPath = path.resolve(distPath, "index.html");

  const sendIndex = async (_req: express.Request, res: express.Response) => {
    try {
      const html = await fs.promises.readFile(indexPath, "utf-8");
      res
        .status(200)
        .type("html")
        .send(injectGoogleSiteVerification(html));
    } catch (error) {
      console.error("Failed to render index.html:", error);
      res.status(500).send("Internal Server Error");
    }
  };

  // Keep the homepage/index dynamic so Search Console can verify the Railway URL
  // from GOOGLE_SITE_VERIFICATION without rebuilding the frontend.
  app.get(["/", "/index.html"], sendIndex);

  app.use(express.static(distPath, { index: false }));

  // fall through to the SPA index.html if the file doesn't exist
  app.use("*", sendIndex);
}
