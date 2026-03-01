import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const combinations = [
  { react: "18", videojs: "7" },
  { react: "18", videojs: "8" },
  { react: "19", videojs: "7" },
  { react: "19", videojs: "8" },
];

const repositoryRoot = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), "react-hook-videojs-matrix-"));
const worktreePath = join(tempRoot, "worktree");

const run = (command, args, cwd, allowFailure = false) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

  if ((result.status ?? 1) !== 0 && !allowFailure) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }

  return result.status ?? 1;
};

let worktreeCreated = false;

try {
  run(
    "git",
    ["worktree", "add", "--detach", worktreePath, "HEAD"],
    repositoryRoot,
  );
  worktreeCreated = true;

  run(
    "pnpm",
    ["install", "--prefer-offline", "--no-frozen-lockfile"],
    worktreePath,
  );
  run("pnpm", ["exec", "playwright", "install", "chromium"], worktreePath);

  const failures = [];

  for (const combination of combinations) {
    const label = `React ${combination.react} / Video.js ${combination.videojs}`;
    console.log(`\n=== ${label} ===`);

    run(
      "pnpm",
      [
        "-w",
        "add",
        "-D",
        "--ignore-scripts",
        `react@${combination.react}`,
        `react-dom@${combination.react}`,
      ],
      worktreePath,
    );
    run(
      "pnpm",
      [
        "--filter",
        "react-hook-videojs",
        "add",
        "-D",
        "--ignore-scripts",
        `react@${combination.react}`,
        `react-dom@${combination.react}`,
        `video.js@${combination.videojs}`,
      ],
      worktreePath,
    );

    const testStatus = run("pnpm", ["run", "test:unit"], worktreePath, true);
    if (testStatus !== 0) {
      failures.push(label);
    }
  }

  if (failures.length > 0) {
    console.error("\nCompatibility matrix failures:");
    failures.forEach((failure) => {
      console.error(`- ${failure}`);
    });
    process.exitCode = 1;
  } else {
    console.log("\nCompatibility matrix passed for all combinations.");
  }
} finally {
  if (worktreeCreated) {
    run(
      "git",
      ["worktree", "remove", "--force", worktreePath],
      repositoryRoot,
      true,
    );
  }

  rmSync(tempRoot, { recursive: true, force: true });
}
