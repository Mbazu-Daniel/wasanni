import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv, resolveBuildEnvironment } from "./cf-config.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(webRoot);
const buildEnv = resolveBuildEnvironment(process.env);
const branch = buildEnv.WORKERS_CI_BRANCH ?? buildEnv.GITHUB_REF_NAME ?? "local";

console.log(`[cf-build] branch=${branch} api=${buildEnv.VITE_API_URL}`);

const build = spawnSync("bun", ["run", "build"], {
  cwd: webRoot,
  env: buildEnv,
  stdio: "inherit",
});

process.exit(build.status ?? 1);
