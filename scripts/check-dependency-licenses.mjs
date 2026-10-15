import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const reviewedLicenses = new Set([
  "(MIT OR CC0-1.0)",
  "(WTFPL OR MIT)",
  "0BSD",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "ISC",
  "MIT",
  "Python-2.0",
  "Unlicense",
  "WTFPL",
  "WTFPL OR ISC",
]);

const lock = JSON.parse(readFileSync(resolve("package-lock.json"), "utf8"));
const problems = [];

for (const [path, metadata] of Object.entries(lock.packages || {})) {
  if (!path) continue;
  if (!metadata.license) {
    problems.push(`${path}: missing license metadata`);
    continue;
  }
  if (!reviewedLicenses.has(metadata.license)) {
    problems.push(`${path}: unreviewed license ${metadata.license}`);
  }
}

if (problems.length) {
  console.error("Dependency-license review failed:\n" + problems.join("\n"));
  process.exit(1);
}

console.log(`Dependency-license review passed for ${Object.keys(lock.packages || {}).length - 1} locked packages.`);
