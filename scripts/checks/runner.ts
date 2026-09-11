import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";

type Task = {
  name: string;
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  // These entrypoints handle SIGINT themselves and must finish cleaning up detached servers.
  graceful?: boolean;
};

/** Run a bounded queue, drain running checks on failure, and stop owned processes on cancellation. */
export async function runTasks(tasks: readonly Task[], concurrency = 2): Promise<void> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error("Check concurrency must be a positive integer.");
  }
  const active = new Map<ChildProcess, Task>();
  let next = 0;
  let failure: Error | undefined;
  let cancelled = false;
  let killTimer: ReturnType<typeof setTimeout> | undefined;

  function cancel(signal: NodeJS.Signals): void {
    if (cancelled) return;
    cancelled = true;
    failure = new Error(`Checks cancelled by ${signal}.`);
    process.exitCode = signal === "SIGINT" ? 130 : 143;
    for (const [child, task] of active) {
      if (task.graceful) child.kill("SIGINT");
      else stop(child, "SIGTERM");
    }
    killTimer = setTimeout(() => {
      for (const [child, task] of active) {
        if (!task.graceful) stop(child, "SIGKILL");
      }
    }, 5000);
  }

  async function worker(): Promise<void> {
    while (!failure && next < tasks.length) {
      const task = tasks[next++];
      if (!task) return;
      const started = performance.now();
      console.log(`[verify] ${task.name} started`);
      try {
        await new Promise<void>((resolve, reject) => {
          const child = spawn(task.command, task.args, {
            cwd: task.cwd,
            env: task.env,
            stdio: ["ignore", "pipe", "pipe"],
            detached: process.platform !== "win32",
            shell: process.platform === "win32" && task.command !== process.execPath,
          });
          active.set(child, task);
          for (const stream of [child.stdout, child.stderr]) {
            if (stream) {
              createInterface({ input: stream }).on("line", (line: string) => {
                console.log(`[${task.name}] ${line}`);
              });
            }
          }
          child.once("error", reject);
          child.once("close", (code, signal) => {
            // A shell can exit before its children. Cancellation must also stop those children.
            if (cancelled && !task.graceful) stop(child, "SIGKILL");
            active.delete(child);
            if (code === 0) resolve();
            else reject(new Error(`${task.name} failed (${signal ?? code ?? "spawn error"}).`));
          });
        });
        console.log(
          `[verify] ${task.name} passed in ${((performance.now() - started) / 1000).toFixed(1)}s`,
        );
      } catch (error) {
        failure ??= error instanceof Error ? error : new Error(String(error));
        console.error(`[verify] ${task.name} failed`);
      }
    }
  }

  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
    if (failure) throw failure;
  } finally {
    clearTimeout(killTimer);
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
  }
}

function stop(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-child.pid, signal);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}
