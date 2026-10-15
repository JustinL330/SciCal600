"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadI18n() {
  const context = { window: {} };
  vm.runInNewContext(read("systembussing/i18n.js"), context, { filename: "systembussing/i18n.js" });
  return context.window.SystemBussingI18n;
}

test("SystemBussing provides complete translations for all requested locales", () => {
  const i18n = loadI18n();
  const expectedLocales = ["en", "ja", "zh-Hant", "zh-Hans", "ko", "fr", "de", "es"];
  assert.deepEqual([...i18n.locales], expectedLocales);

  const englishKeys = Object.keys(i18n.translations.en).sort();
  assert.ok(englishKeys.length > 100, "the catalogue covers static and changing simulator content");
  for (const locale of expectedLocales) {
    const dictionary = i18n.translations[locale];
    assert.ok(dictionary, `${locale} dictionary exists`);
    assert.deepEqual(Object.keys(dictionary).sort(), englishKeys, `${locale} has exactly the English keys`);
    assert.ok(Object.values(dictionary).every((value) => typeof value === "string" && value.trim()), `${locale} has no empty translations`);
  }
});

test("SystemBussing translation formatting preserves dynamic CPU values", () => {
  const i18n = loadI18n();
  assert.equal(i18n.translate("en", "readyTitle", { input: 10 }), "Ready · Device will supply 10");
  assert.match(i18n.translate("ja", "executeLoadReadDescription", { address: 200 }), /200/);
  assert.match(i18n.translate("zh-Hans", "executeStoreWriteDescription", { address: 201, value: 13 }), /201/);
  assert.match(i18n.translate("de", "deviceInputValue", { value: -7 }), /-7/);
});

test("SystemBussing keeps English as the document and manifest default", () => {
  const html = read("systembussing/index.html");
  const manifest = JSON.parse(read("systembussing/manifest.webmanifest"));
  const worker = read("systembussing/sw.js");
  assert.match(html, /^<!doctype html>\s*<html lang="en">/);
  assert.match(html, /<option value="en">English<\/option>/);
  assert.match(html, /<script src="\.\/i18n\.js"><\/script>/);
  assert.equal(manifest.lang, "en");
  assert.match(worker, /scical600-systembussing-v2/);
  assert.match(worker, /"\.\/i18n\.js"/);
});
