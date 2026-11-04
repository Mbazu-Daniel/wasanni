import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv, resolveWorkerConfig } from "./cf-config.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(webRoot);
const branch = process.env.WORKERS_CI_BRANCH ?? process.env.GITHUB_REF_NAME ?? "local";

const config = resolveWorkerConfig(process.env);
const configPath = join(webRoot, "dist", ".wrangler.deploy.jsonc");
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(
  `[cf-deploy] branch=${branch} worker=${config.name} routes=${config.routes.length} config=${configPath}`,
);

const result = spawnSync(
  "bun",
  ["x", "wrangler", "deploy", "--config", configPath, "--keep-vars"],
  { cwd: webRoot, stdio: "inherit" },
);

process.exit(result.status ?? 1);
