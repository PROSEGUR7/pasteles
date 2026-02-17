import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();

const cleanupTargets = [
    path.join(root, ".next"),
    path.join(root, ".next-live"),
    path.join(root, "node_modules", ".next"),
    path.join(root, "node_modules", ".next-live"),
    path.join(root, "node_modules", ".next-dev"),
    path.join(root, "node_modules", ".next-prod"),
    path.join(root, ".turbo"),
];

for (const target of cleanupTargets) {
    if (!target) continue;
    try {
        await rm(target, { recursive: true, force: true });
    } catch {
        // ignore
    }
}

const env = { ...process.env };
delete env.NEXT_DIST_DIR;
delete env.NEXT_PRIVATE_DIST_DIR;
delete env.TURBOPACK;

const child = spawn("next", ["dev"], {
    stdio: "inherit",
    shell: true,
    env,
});

child.on("exit", (code) => {
    process.exit(code ?? 0);
});
