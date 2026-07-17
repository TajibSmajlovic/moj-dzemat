import { spawnSync } from "node:child_process";

function run(stepName, command, args) {
  console.log(`[build] ${stepName}`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("client", "react-router", ["build"]);

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
