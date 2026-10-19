import { tool } from "ai";
import { z } from "zod";
import { workspacePathAllowed, workspaceUserAllowed } from "@/lib/workspace-policy";

// Full-auto tools. Only active on the self-hosted server (BENCH_TOOLS_ENABLED=1).
// Writes and commands remain unavailable until durable server-side approvals exist.

export function benchToolsEnabled(userId: string) {
  return process.env["BENCH_TOOLS_ENABLED"] === "1" && workspaceUserAllowed(userId, process.env["BENCH_ALLOWED_USER_IDS"]);
}

async function safePath(rel: string, rootType: "bench" | "codex" = "bench") {
  const path = await import("node:path");
  const fs = await import("node:fs/promises");
  if (!workspacePathAllowed(rel)) throw new Error("ملفات الأسرار والمسارات غير الآمنة محظورة");
  const rootDir = await fs.realpath(rootType === "bench" ? (process.env["FRAPPE_BENCH_PATH"] ?? "/home/frappe/frappe-bench") : (process.env["CODEX_APP_PATH"] ?? "/home/frappe/az-codex-ts"));
  const full = path.resolve(rootDir, rel);
  if (full !== rootDir && !full.startsWith(rootDir + path.sep)) {
    throw new Error(`المسار خارج المجلد المسموح (${rootType})`);
  }
  const real = await fs.realpath(full);
  if (real !== rootDir && !real.startsWith(rootDir + path.sep)) throw new Error("الرابط يشير خارج مساحة العمل");
  if (!workspacePathAllowed(path.relative(rootDir, real))) throw new Error("ملفات الأسرار محظورة");
  return real;
}

export function benchTools(userId: string) {
  if (!benchToolsEnabled(userId)) return {};
  return {
    workspace_read_file: tool({
      description: "اقرأ ملفاً داخل مساحات العمل (frappe-bench أو az-codex-ts).",
      inputSchema: z.object({ path: z.string(), workspace: z.enum(["bench", "codex"]).default("bench") }),
      execute: async ({ path, workspace }) => {
        const fs = await import("node:fs/promises");
        return (await fs.readFile(await safePath(path, workspace), "utf8")).slice(0, 50_000);
      },
    }),
    workspace_list: tool({
      description: "اعرض محتويات مجلد داخل مساحات العمل.",
      inputSchema: z.object({ path: z.string().default("."), workspace: z.enum(["bench", "codex"]).default("bench") }),
      execute: async ({ path, workspace }) => {
        const fs = await import("node:fs/promises");
        return (await fs.readdir(await safePath(path, workspace), { withFileTypes: true })).map((d) => (d.isDirectory() ? d.name + "/" : d.name));
      },
    }),
  };
}
