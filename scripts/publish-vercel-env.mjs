// Explicit production setup only. Values travel via stdin, never CLI arguments.
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { parseEnv } from "node:util";

if (!process.argv.includes("--confirm-production")) {
  console.error("Explicit confirmation required: node scripts/publish-vercel-env.mjs --confirm-production");
  process.exit(1);
}
try {
  const root = new URL("../", import.meta.url);
  const project = JSON.parse(await readFile(new URL(".vercel/project.json", root), "utf8"));
  if (project.projectId !== "prj_hj6f1UVHZzQikHow32P9w4RpPdmy" || project.orgId !== "team_dXMk2WoyygCeflKqvhZ0Uio4") throw Error("target");
  const env = parseEnv(await readFile(new URL(".env", root), "utf8"));
  const values = {
    GOOGLE_ANALYTICS_TAG: env.GOOGLE_ANALYTICS_TAG,
    GOOGLE_CAPTCHA_SITE_KEY: env.GOOGLE_CAPTCHA_SITE_KEY || env.GOOGlE_CAPTCHA_SITE_KEY,
    GOOGLE_CAPTCHA_SECRET_KEY: env.GOOGLE_CAPTCHA_SECRET_KEY,
    UNSAIDBOX_APP_URL: "https://unsaidbox.com",
    UNSAIDBOX_EMAIL_ENABLED: env.UNSAIDBOX_EMAIL_ENABLED,
    UNSAIDBOX_EMAIL_KEY: env.UNSAIDBOX_EMAIL_KEY,
    UNSAIDBOX_EMAIL_WORKER_SECRET: env.UNSAIDBOX_EMAIL_WORKER_SECRET,
    UNSAIDBOX_SMTP_HOST: env.UNSAIDBOX_SMTP_HOST,
    UNSAIDBOX_SMTP_PASSWORD_B64: env.UNSAIDBOX_SMTP_PASSWORD_B64,
    UNSAIDBOX_SMTP_PORT: env.UNSAIDBOX_SMTP_PORT,
    UNSAIDBOX_SMTP_USER: env.UNSAIDBOX_SMTP_USER,
    UNSAIDBOX_RECAPTCHA_HOSTNAMES: "unsaidbox.com,www.unsaidbox.com",
    UNSAIDBOX_RECAPTCHA_MIN_SCORE: "0.5",
  };
  for (const [key, value] of Object.entries(values)) {
    if (!value) throw Error(`missing:${key}`);
    const type = /SECRET|PASSWORD|EMAIL_KEY/.test(key) ? "secret" : "config";
    const success = await new Promise(resolve => {
      const child = spawn("npx", ["--yes", "vercel@62.5.0", "env", "add", key, "production", "--type", type, "--yes", "--project", project.projectId, "--scope", "tochukwu-nkwochas-projects"], { cwd: root, stdio: ["pipe", "ignore", "ignore"] });
      child.on("error", () => resolve(false));
      child.stdin.on("error", () => {});
      child.stdin.end(value);
      child.on("close", code => resolve(code === 0));
    });
    if (!success) throw Error(`upload:${key}`);
    console.log(`Saved production variable: ${key} (${type})`);
  }
  console.log("Production settings saved. Local database URL deliberately excluded: a production-safe database endpoint is still required. No Preview/Development secrets changed.");
} catch (error) {
  const known = /^((missing|upload):[A-Z_]+)$/.test(error?.message || "") ? error.message : "target or configuration validation";
  console.error(`Environment setup stopped: ${known}. Values have not been printed. Check existing variable names before retrying; this script never overwrites them.`);
  process.exitCode = 1;
}
