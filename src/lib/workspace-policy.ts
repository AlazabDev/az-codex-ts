// These checks are shared by the server tools and their regression tests.
export function workspaceUserAllowed(userId: string, allowlist: string | undefined) {
  return Boolean(userId && allowlist?.split(",").map((id) => id.trim()).includes(userId));
}

export function workspacePathAllowed(relative: string) {
  const parts = relative.replaceAll("\\", "/").split("/");
  return !parts.some((part) => part === ".." || part === ".git" || part === ".ssh" || part === "site_config.json" || part === "common_site_config.json" || part === ".env" || part.startsWith(".env.") || /\.(pem|key|p12|pfx)$/i.test(part));
}

// Never pass model output to a shell. Each command maps to fixed argv.
export function workspaceCommand(command: string): { executable: string; args: string[] } | undefined {
  const commands: Record<string, { executable: string; args: string[] }> = {
    "git status": { executable: "git", args: ["status", "--short"] },
    "git diff": { executable: "git", args: ["diff", "--no-ext-diff", "--no-textconv"] },
    "git log": { executable: "git", args: ["log", "-10", "--oneline"] },
    "bench version": { executable: "bench", args: ["version"] },
  };
  return commands[command.trim()];
}