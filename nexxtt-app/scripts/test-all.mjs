// Aggregate runner — exits non-zero if any of the three suites fail.
// Use as: `node scripts/test-all.mjs` (server must be running on :3210).
import { spawn } from "node:child_process";

const suites = ["smoke-all.mjs", "route-sweep.mjs", "permission-fuzz.mjs"];

let failures = 0;
for (const s of suites) {
  console.log(`\n══════════ ${s} ══════════`);
  const code = await new Promise((resolve) => {
    const p = spawn(process.execPath, [`scripts/${s}`], { stdio: "inherit" });
    p.on("exit", resolve);
  });
  if (code !== 0) {
    console.log(`✗ ${s} exited ${code}`);
    failures++;
  }
}

console.log(`\n${"=".repeat(40)}`);
console.log(failures === 0 ? "ALL SUITES PASSED" : `${failures} SUITE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
