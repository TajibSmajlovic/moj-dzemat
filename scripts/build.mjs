import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const workerModeArgument =
  process.argv.find((argument) => argument.startsWith("--worker-mode=")) ?? "--worker-mode=normal";
const workerMode = workerModeArgument.slice("--worker-mode=".length);

if (workerMode !== "normal" && workerMode !== "recovery") {
  console.error(`[build] Unsupported PWA worker mode: ${workerMode || "<empty>"}`);
  process.exit(1);
}

function run(stepName, command, args, env = process.env) {
  console.log(`[build] ${stepName}`);

  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("client", "react-router", ["build"], {
  ...process.env,
  ENABLE_TEST_ROUTES: "false",
  // Exclude development-only routes from both production bundles and manifests.
  OMIT_DEV_ROUTES: "true",
});

const pwaArtifactBuilderPath = "build/.pwa-artifact-builder.mjs";

try {
  run("PWA artifact builder", "esbuild", [
    "scripts/build-pwa-artifacts.ts",
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--target=node24",
    `--outfile=${pwaArtifactBuilderPath}`,
    "--packages=external",
    "--tsconfig=tsconfig.server.json",
  ]);
  run(`PWA artifacts (${workerMode} worker)`, "node", [
    pwaArtifactBuilderPath,
    `--worker-mode=${workerMode}`,
  ]);
} finally {
  rmSync(pwaArtifactBuilderPath, { force: true });
}

run("server", "esbuild", [
  "server/index.ts",
  "--bundle",
  "--platform=node",
  "--format=esm",
  "--target=node24",
  "--outfile=build/server-entry.mjs",
  "--packages=external",
  "--tsconfig=tsconfig.server.json",
]);

run("seed", "esbuild", [
  "prisma/seed.ts",
  "--bundle",
  "--platform=node",
  "--format=esm",
  "--target=node24",
  "--outfile=build/prisma-seed.mjs",
  "--packages=external",
  "--tsconfig=tsconfig.server.json",
]);
