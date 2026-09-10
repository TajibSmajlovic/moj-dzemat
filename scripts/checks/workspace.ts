import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Copy working sources, including uncommitted changes, without sharing writable build caches. */
export function copyWorkspace(root: string, destination: string): void {
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "--deduplicate", "-z"],
    { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  )
    .split("\0")
    .filter(Boolean);
  // Vite and the E2E server load local configuration. Never copy local databases or build output.
  files.push(
    "generated",
    ...fs.readdirSync(root).filter((name) => name === ".env" || name.startsWith(".env.")),
  );
  for (const file of new Set(files)) {
    const source = path.join(root, file);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(destination, file), {
      recursive: true,
      mode: fs.constants.COPYFILE_FICLONE,
      verbatimSymlinks: true,
    });
  }

  const dependencies = path.join(root, "node_modules");
  const target = path.join(destination, "node_modules");
  fs.mkdirSync(target, { recursive: true });
  // Linking node_modules itself would also share Vite and Storybook's writable cache directories.
  for (const name of fs.readdirSync(dependencies)) {
    if (name.startsWith(".") && name !== ".bin") continue;
    fs.symlinkSync(path.join(dependencies, name), path.join(target, name), "junction");
  }
}
