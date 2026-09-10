import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as prettier from "prettier";

import { runTasks } from "./runner";

/** Check index contents without stashing, formatting, or changing the working tree. */
export async function checkStaged(root = process.cwd()): Promise<boolean> {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const files = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
    .split("\0")
    .filter(Boolean);
  if (!files.length) {
    console.log("No staged files to check.");
    return true;
  }

  let passed = true;
  const sources: { filePath: string; text: string }[] = [];
  for (const file of files) {
    // Symlinks and submodules contain Git metadata, not source text to format or lint.
    const entry = git("--literal-pathspecs", "ls-files", "--stage", "-z", "--", file);
    if (!entry.startsWith("100644 ") && !entry.startsWith("100755 ")) continue;
    const filePath = path.join(root, file);
    const options = await prettier.resolveConfig(filePath, { editorconfig: true });
    const info = await prettier.getFileInfo(filePath, {
      ignorePath: [path.join(root, ".gitignore"), path.join(root, ".prettierignore")],
      plugins: options?.plugins,
    });
    const source = /\.[cm]?[jt]sx?$/u.test(file);
    const formatted = !info.ignored && Boolean(info.inferredParser);
    if (!source && !formatted) continue;
    const text = git("show", `:${file}`);
    if (formatted && !(await prettier.check(text, { ...options, filepath: filePath }))) {
      console.error(`Staged formatting: ${file}`);
      passed = false;
    }
    if (source) sources.push({ filePath, text });
  }

  if (sources.length) {
    const { ESLint } = await import("eslint");
    const eslint = new ESLint({ cwd: root });
    const included = [];
    for (const source of sources) {
      if (!(await eslint.isPathIgnored(source.filePath))) included.push(source);
    }
    if (included.some(({ filePath }) => /\.[cm]?tsx?$/u.test(filePath))) {
      await runTasks([
        { name: "route types", command: "react-router", args: ["typegen"], cwd: root },
      ]);
    }
    const results = [];
    for (const source of included) {
      results.push(...(await eslint.lintText(source.text, { filePath: source.filePath })));
    }
    const formatter = await eslint.loadFormatter("stylish");
    const output = formatter.format(results);
    if (output) console.error(output);
    if (results.some((result) => result.errorCount > 0 || result.warningCount > 0)) passed = false;
  }
  if (passed) console.log(`Staged checks passed (${files.length} files).`);
  return passed;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (!(await checkStaged())) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode ??= 1;
  }
}
