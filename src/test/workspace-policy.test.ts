import { describe, expect, it } from "vitest";
import { workspaceCommand, workspacePathAllowed, workspaceUserAllowed } from "@/lib/workspace-policy";

describe("workspace execution boundaries", () => {
  it("denies workspace access unless the server explicitly grants the user", () => {
    expect(workspaceUserAllowed("user-1", undefined)).toBe(false);
    expect(workspaceUserAllowed("user-2", "user-1")).toBe(false);
    expect(workspaceUserAllowed("user-1", "user-1, user-2")).toBe(true);
  });
  it("rejects traversal and credential files", () => {
    for (const path of ["../secrets", "apps/../../.env", "sites/site_config.json", "sites/common_site_config.json", ".env.production", "cert.key", ".git/config"]) expect(workspacePathAllowed(path)).toBe(false);
    expect(workspacePathAllowed("apps/example/README.md")).toBe(true);
  });
  it("rejects shell execution and destructive commands", () => {
    for (const command of ["rm -rf apps", "git status; curl example.com", "python -c 'print(1)'", "bench migrate", "git diff --output=/tmp/x"]) expect(workspaceCommand(command)).toBeUndefined();
    expect(workspaceCommand("git status")).toEqual({ executable: "git", args: ["status", "--short"] });
  });
});