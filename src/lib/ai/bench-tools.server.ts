import { tool } from "ai";
import { z } from "zod";

// Full-auto bench tools. Only active on the self-hosted server (BENCH_TOOLS_ENABLED=1).
const BENCH = process.env["FRAPPE_BENCH_PATH"] ?? "/home/frappe/frappe-bench";
// Irreversible operations stay blocked even in full-auto mode.
const BLOCKED = /\b(drop-site|reinstall|restore|--force|rm\s+-rf\s+\/|mkfs|shutdown|reboot)\b/i;

export function benchToolsEnabled() {
  return process.env["BENCH_TOOLS_ENABLED"] === "1";
}

async function safePath(rel: string) {
  const path = await import("node:path");
  const full = path.resolve(BENCH, rel);
  if (full !== BENCH && !full.startsWith(BENCH + path.sep)) throw new Error("المسار خارج مجلد البنش");
  return full;
}

export function benchTools() {
  return {
    bench_read_file: tool({
      description: "اقرأ ملفاً داخل frappe-bench (مسار نسبي).",
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path }) => {
        const fs = await import("node:fs/promises");
        return (await fs.readFile(await safePath(path), "utf8")).slice(0, 50_000);
      },
    }),
    bench_list: tool({
      description: "اعرض محتويات مجلد داخل frappe-bench.",
      inputSchema: z.object({ path: z.string().default(".") }),
      execute: async ({ path }) => {
        const fs = await import("node:fs/promises");
        return (await fs.readdir(await safePath(path), { withFileTypes: true })).map((d) => (d.isDirectory() ? d.name + "/" : d.name));
      },
    }),
    bench_write_file: tool({
      description: "اكتب/عدّل ملفاً داخل frappe-bench (يحفظ نسخة .bak قبل التعديل).",
      inputSchema: z.object({ path: z.string(), content: z.string() }),
      execute: async ({ path, content }) => {
        const fs = await import("node:fs/promises");
        const full = await safePath(path);
        await fs.copyFile(full, `${full}.bak`).catch(() => undefined);
        await fs.writeFile(full, content, "utf8");
        return `تم حفظ ${path}`;
      },
    }),
    bench_run: tool({
      description: "نفّذ أمراً داخل frappe-bench (مثل bench migrate أو git status). الأوامر المدمرة محظورة.",
      inputSchema: z.object({ command: z.string().max(500) }),
      execute: async ({ command }) => {
        if (BLOCKED.test(command)) return "مرفوض: أمر مدمّر لا يُنفذ تلقائياً.";
        const { exec } = await import("node:child_process");
        return await new Promise<string>((resolve) =>
          exec(command, { cwd: BENCH, timeout: 300_000, maxBuffer: 2_000_000 }, (err, stdout, stderr) =>
            resolve(`${err ? `exit ${err.code}\n` : ""}${stdout}${stderr}`.slice(-20_000)),
          ),
        );
      },
    }),
  };
}
