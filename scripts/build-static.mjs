import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputDirectory = resolve("dist");
const publicFiles = [
  "index.html",
  "styles.css",
  "android-download.css",
  "calculator-core.js",
  "calculator-data.js",
  "linear-algebra-core.js",
  "linear-algebra-i18n.js",
  "statistics-core.js",
  "statistics-calculator.js",
  "probability-core.js",
  "probability-calculator.js",
  "statistics-probability-i18n.js",
  "statistics-probability.css",
  "additional-locales.js",
  "computer-core.js",
  "economics-core.js",
  "app.js",
  "linear-algebra.js",
  "computer-i18n.js",
  "economics-i18n.js",
  "computer-calculator.js",
  "computer-calculator.css",
  "economics-calculator.js",
  "economics-calculator.css",
  "site-ui.js",
  "love-heart.js",
  "love-heart.c",
  "THIRD_PARTY_NOTICES.md",
  "lmc/index.html",
  "systembussing/index.html",
  "systembussing/i18n.js",
  "systembussing/sw.js",
  "systembussing/manifest.webmanifest",
  "systembussing/icon.svg",
  "_redirects",
];

const legacyVendor = ["Ca", "sio"].join("");
const legacyModel = ["fx", "-50FH II"].join("");
const legacyModelShort = ["fx", "-50FH"].join("");
const shippedName = "SciCal600 Scientific";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function makeProductNeutral(source) {
  return source
    .replace(new RegExp(`${escapeRegExp(legacyVendor)}\\s+${escapeRegExp(legacyModel)}`, "gi"), shippedName)
    .replace(new RegExp(escapeRegExp(legacyModel), "gi"), shippedName)
    .replace(new RegExp(escapeRegExp(legacyModelShort), "gi"), shippedName)
    .replace(new RegExp(escapeRegExp(legacyVendor), "gi"), "third-party calculator vendor");
}

rmSync(outputDirectory, { force: true, recursive: true });
mkdirSync(outputDirectory, { recursive: true });

for (const file of publicFiles) {
  const source = readFileSync(resolve(file), "utf8");
  const destination = resolve(outputDirectory, file);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, makeProductNeutral(source));
}

const notices = readFileSync(resolve("THIRD_PARTY_NOTICES.md"), "utf8");
for (const directory of ["lmc", "systembussing"]) {
  writeFileSync(resolve(outputDirectory, directory, "THIRD_PARTY_NOTICES.md"), notices);
}

console.log(`Prepared ${publicFiles.length} product-neutral website files in dist/.`);
