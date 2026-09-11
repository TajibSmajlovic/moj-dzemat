import { runTasks } from "./checks/runner";

const mode = process.argv[2];
const npm = (name: string, ...args: string[]) => ({
  name,
  command: "npm",
  args: ["run", name, ...(args.length ? ["--", ...args] : [])],
});
const types = [
  "tsconfig.json",
  "tsconfig.node.json",
  "tsconfig.server.json",
  "tsconfig.worker.json",
].map((config) => ({ name: config, command: "tsc", args: ["-p", config, "--noEmit"] }));

try {
  if (mode !== "types" && mode !== "static" && mode !== "push") {
    throw new Error("Usage: scripts/verify.ts <types|static|push>");
  }
  const started = performance.now();
  // React Router replaces its generated directory. Finish that write before any typed reader starts.
  await runTasks([{ name: "route types", command: "react-router", args: ["typegen"] }]);
  await runTasks(
    mode === "types"
      ? types
      : [
          npm("lint", "--max-warnings=0"),
          ...types,
          npm("format:check"),
          npm("harness:check"),
          ...(mode === "push" ? [npm("knip"), npm("test:run")] : []),
        ],
  );
  console.log(
    `[verify] ${mode} checks passed in ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode ??= 1;
}
