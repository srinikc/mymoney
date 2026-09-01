const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const url = process.argv[2];
const envName = process.argv[3] || "DATABASE_URL";
const envTarget = process.argv[4] || "production";

if (!url) { console.error("Usage: node set-env.mjs <value> [envName] [target]"); process.exit(1); }

const tmpFile = path.join(process.env.TEMP || "/tmp", `vercel-env-${Date.now()}.txt`);
fs.writeFileSync(tmpFile, url);

try {
  const result = execSync(
    `vercel env add ${envName} ${envTarget} < "${tmpFile}"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
  );
  console.log(result);
} catch (e) {
  console.error(e.stderr || e.message);
} finally {
  fs.unlinkSync(tmpFile);
}
