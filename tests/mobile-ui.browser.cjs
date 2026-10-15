"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const playwrightModule = process.env.SCICAL_PLAYWRIGHT_MODULE || "playwright";
const { chromium } = require(playwrightModule);
const projectRoot = path.resolve(__dirname, "..");
const root = path.join(projectRoot, "dist");
const chromePath = process.env.SCICAL_CHROME_PATH;

const mimeTypes = {
  ".c": "text/plain; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const requestedRoot = pathname.startsWith("/tests/") ? projectRoot : root;
    const candidate = path.join(requestedRoot, pathname === "/" ? "index.html" : pathname);
    const file = candidate.startsWith(requestedRoot) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      ? candidate
      : path.join(root, "index.html");
    response.writeHead(200, { "content-type": mimeTypes[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function chooseMode(page, mode) {
  await page.locator('.utility-key[data-action="mode"]').click();
  const simulator = await page.evaluate(() => window.SciCalApp.getState().interfaceMode === "simulator");
  if (!simulator) {
    await page.locator(`[data-mode="${mode}"]`).click();
    return;
  }
  const number = { COMP: 1, CMPLX: 2, BASE: 3, SD: 4, REG: 5, PRGM: 6 }[mode];
  if (number > 3) await page.locator('.utility-key[data-action="mode"]').click();
  await page.locator(`.calc-key[data-key-label="${number}"]`).click();
}

async function checkLayout(page, viewport) {
  await page.goto("/scientific-calculator", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.SciCalApp && window.SciCalUI);
  assert.equal(new URL(page.url()).pathname, "/scientific-calculator", `${viewport.name}: scientific calculator route`);
  assert.equal(await page.locator('[data-view-panel="calculator"]').isVisible(), true, `${viewport.name}: calculator is visible`);
  const metrics = await page.evaluate(() => {
    const keys = [...document.querySelectorAll(".calc-key")].map((key) => key.getBoundingClientRect());
    const legendMetrics = [...document.querySelectorAll(".calc-key")].map((key) => {
      const legends = [...key.querySelectorAll(".calc-key__shift, .calc-key__alpha, .calc-key__context")]
        .map((legend) => ({ box: legend.getBoundingClientRect(), fontSize: parseFloat(getComputedStyle(legend).fontSize) }))
        .sort((a, b) => a.box.left - b.box.left);
      return {
        fontSizes: legends.map((legend) => legend.fontSize),
        overlaps: legends.slice(1).filter((legend, index) => legends[index].box.right > legend.box.left + 0.5).length,
      };
    });
    const canvas = document.querySelector("#calculator-space").getBoundingClientRect();
    const calculator = document.querySelector(".calculator").getBoundingClientRect();
    const calculatorViewport = document.querySelector("#calculator-viewport");
    const calculatorViewportBox = calculatorViewport.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      minKeyHeight: Math.min(...keys.map((key) => key.height)),
      minKeyWidth: Math.min(...keys.map((key) => key.width)),
      minLegendFontSize: Math.min(...legendMetrics.flatMap((item) => item.fontSizes)),
      legendOverlapCount: legendMetrics.reduce((total, item) => total + item.overlaps, 0),
      calculatorWidth: calculator.width,
      canvasRight: canvas.right,
      canvasLeft: canvas.left,
      calculatorTop: calculator.top,
      calculatorBottom: calculator.bottom,
      viewportTop: calculatorViewportBox.top,
      viewportBottom: calculatorViewportBox.bottom,
      viewportWidth: calculatorViewport.clientWidth,
      viewportScrollHeight: calculatorViewport.scrollHeight,
      viewportClientHeight: calculatorViewport.clientHeight,
      viewportOverflowing: calculatorViewport.classList.contains("is-overflowing"),
      viewportFitLocked: calculatorViewport.classList.contains("is-fit-locked"),
      hiddenDecorations: [".stage-label", ".calculator__topline", ".calculator__footer", ".keyboard-hint"]
        .every((selector) => getComputedStyle(document.querySelector(selector)).display === "none"),
      hasViewportFit: document.querySelector('meta[name="viewport"]').content.includes("viewport-fit=cover"),
      usesSafeArea: [...document.styleSheets].some((sheet) => {
        try { return [...sheet.cssRules].some((rule) => rule.cssText.includes("safe-area-inset")); } catch { return false; }
      }),
    };
  });
  assert.ok(metrics.documentWidth <= metrics.innerWidth, `${viewport.name}: horizontal document overflow`);
  assert.ok(metrics.canvasLeft >= -1, `${viewport.name}: canvas is clipped on the left`);
  assert.ok(metrics.canvasRight <= metrics.innerWidth + 1, `${viewport.name}: canvas is clipped on the right`);
  assert.ok(metrics.minKeyWidth >= 40, `${viewport.name}: key width ${metrics.minKeyWidth} is too small`);
  assert.ok(metrics.minKeyHeight >= 40, `${viewport.name}: key height ${metrics.minKeyHeight} is too small`);
  assert.equal(metrics.legendOverlapCount, 0, `${viewport.name}: upper key legends should not overlap`);
  assert.equal(metrics.hasViewportFit, true, `${viewport.name}: viewport-fit is missing`);
  assert.equal(metrics.usesSafeArea, true, `${viewport.name}: safe-area CSS is missing`);
  if (viewport.landscape) {
    assert.equal(metrics.viewportOverflowing, true, `${viewport.name}: compact landscape should pan vertically`);
    assert.ok(metrics.viewportScrollHeight > metrics.viewportClientHeight, `${viewport.name}: landscape content should be scrollable`);
  } else {
    assert.ok(metrics.calculatorWidth >= metrics.innerWidth * 0.88, `${viewport.name}: calculator should fill the phone width`);
    assert.ok(metrics.minKeyHeight >= 44, `${viewport.name}: portrait key height ${metrics.minKeyHeight} is too small`);
    assert.ok(metrics.minLegendFontSize >= 9, `${viewport.name}: upper key labels should remain readable`);
    assert.equal(metrics.hiddenDecorations, true, `${viewport.name}: nonfunctional hardware should be removed from the phone fit view`);
    assert.equal(metrics.viewportOverflowing, false, `${viewport.name}: phone fit view should not overflow`);
    assert.equal(metrics.viewportFitLocked, true, `${viewport.name}: phone fit view should be locked`);
    assert.ok(metrics.viewportScrollHeight <= metrics.viewportClientHeight + 1, `${viewport.name}: phone fit view should not scroll vertically`);
    assert.ok(metrics.calculatorTop >= metrics.viewportTop - 1, `${viewport.name}: calculator top is clipped`);
    assert.ok(metrics.calculatorBottom <= metrics.viewportBottom + 1, `${viewport.name}: calculator bottom is hidden by the dock`);
    await page.locator("#calculator-viewport").evaluate((element) => { element.scrollTop = 100; });
    assert.equal(await page.locator("#calculator-viewport").evaluate((element) => element.scrollTop), 0, `${viewport.name}: locked fit view accepted programmatic scroll`);

    const touchTarget = await page.locator("#calculator-viewport").boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const touchX = touchTarget.x + 3;
    const touchStartY = touchTarget.y + touchTarget.height * 0.68;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchX, y: touchStartY }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touchX, y: touchStartY - 120 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.deepEqual(
      await page.evaluate(() => [document.scrollingElement.scrollTop, document.querySelector("#calculator-viewport").scrollTop]),
      [0, 0],
      `${viewport.name}: a real touch swipe moved the locked calculator`,
    );

    if (viewport.name === "iPhone 17 Pro browser toolbar") {
      await page.locator('[data-zoom="in"]').click();
      await page.waitForFunction(() => document.querySelector("#calculator-viewport").classList.contains("is-overflowing"));
      assert.equal(await page.locator("#calculator-viewport").evaluate((element) => element.classList.contains("is-fit-locked")), false, "manual zoom should unlock the viewport");
      await page.locator('[data-zoom="out"]').click();
      await page.waitForFunction(() => document.querySelector("#calculator-viewport").classList.contains("is-fit-locked"));
    }
  }
  return metrics;
}

async function checkCompactHome(page, viewport) {
  await page.goto("/", { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".home-tools--primary .home-tool-card")].map((card) => card.getBoundingClientRect());
    const buttons = [...document.querySelectorAll(".home-tools--primary .home-tool-card .primary-action")].map((button) => button.getBoundingClientRect());
    return {
      cardCount: cards.length,
      buttonCount: buttons.length,
      cardBottoms: cards.map((card) => card.bottom),
      buttonHeights: buttons.map((button) => button.height),
      documentWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      removedCopyCount: document.querySelectorAll(".reference-model-banner, .feature-pills, .exam-note, .tool-card--future").length,
    };
  });
  assert.equal(metrics.cardCount, 6, `${viewport.name}: all six calculator choices should be present`);
  assert.equal(metrics.buttonCount, 6, `${viewport.name}: all six calculator choices should have direct actions`);
  assert.ok(metrics.cardBottoms.slice(0, 2).every((bottom) => bottom <= metrics.innerHeight), `${viewport.name}: the first calculator choices should be visible without scrolling`);
  assert.ok(metrics.buttonHeights.every((height) => height >= 44), `${viewport.name}: home actions should have mobile touch targets (${metrics.buttonHeights.join(", ")}px)`);
  assert.ok(metrics.documentWidth <= metrics.innerWidth, `${viewport.name}: home page horizontal overflow`);
  assert.equal(metrics.removedCopyCount, 0, `${viewport.name}: redundant home-page copy should be removed`);
  const lastPrimaryCard = page.locator(".home-tools--primary .home-tool-card").last();
  await lastPrimaryCard.scrollIntoViewIfNeeded();
  const lastPrimaryCardBox = await lastPrimaryCard.boundingBox();
  assert.ok(lastPrimaryCardBox && lastPrimaryCardBox.y >= 0 && lastPrimaryCardBox.y + lastPrimaryCardBox.height <= metrics.innerHeight, `${viewport.name}: all six calculator choices should remain reachable by scrolling`);
  await page.locator("#love-egg-button").click();
  assert.equal(await page.locator("#love-egg-dialog").isVisible(), true, `${viewport.name}: love-heart Easter egg opens from the title`);
  await page.waitForFunction(() => document.querySelector("#love-source-code")?.textContent.includes("int main(void)"));
  assert.match(await page.locator("#love-source-code").textContent(), /SciCal600 colourful love-heart Easter egg/);
  await page.locator("#love-egg-close").click();
  assert.equal(await page.locator("#love-egg-dialog").isHidden(), true, `${viewport.name}: love-heart Easter egg closes`);
  return metrics;
}

async function checkLanguagePersistence(page) {
  const localeExpectations = {
    "en-GB": { hero: /Maths/i, download: /Verified testing build/, native: /Downloads and platform limits/ },
    "zh-Hant": { hero: /實用數學/, download: /已驗證測試版/, native: /下載與平台限制/ },
    "zh-Hans": { hero: /实用数学/, download: /已验证测试版/, native: /下载与平台限制/ },
    ja: { hero: /数学ツール/, download: /検証済みテスト版/, native: /ダウンロード/ },
    ko: { hero: /수학 도구/, download: /검증된 테스트 빌드/, native: /다운로드/ },
    ms: { hero: /Alat matematik/, download: /binaan ujian disahkan/i, native: /Muat turun/ },
    fr: { hero: /maths/i, download: /version de test vérifiée/i, native: /Téléchargements/ },
    de: { hero: /Mathematik/, download: /geprüfte Testversion/i, native: /Downloads/ },
    es: { hero: /Matemáticas/, download: /versión de prueba verificada/i, native: /Descargas/ },
    ar: { hero: /رياضيات/, download: /إصدار اختباري/, native: /التنزيلات/ },
    th: { hero: /คณิตศาสตร์/, download: /รุ่นทดสอบ/, native: /ไฟล์ดาวน์โหลด/ },
    "yue-Hant-HK": { hero: /搞掂/, download: /已驗證測試版/, native: /下載同平台限制/ },
  };

  await page.goto("/", { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "ja", "browser Japanese should be used before a manual choice");
  assert.equal(await page.locator("#android-copy-result").isHidden(), true, "native copy action stays hidden on the web");
  assert.equal(await page.locator("#android-share-result").isHidden(), true, "native share action stays hidden on the web");

  await page.locator("#language-select").selectOption("en-GB");
  assert.equal(await page.evaluate(() => localStorage.getItem("scical600.language")), "en-GB", "manual English choice should be persisted");
  const englishSurface = await page.locator('[data-view-panel="about"] [data-i18n]').allTextContents();
  assert.doesNotMatch(englishSurface.join(" "), /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0e00-\u0e7f\u0600-\u06ff]/, "English about page should not retain CJK, Korean, Thai or Arabic prose");
  assert.match(await page.locator(".android-download").getAttribute("aria-label"), /Download the verified Android testing APK/);

  await page.locator('[data-view-target="linear-algebra"]').first().click();
  assert.equal(await page.locator("html").getAttribute("lang"), "en-GB", "route changes should preserve the manual locale");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "en-GB", "reload should preserve the manual locale");
  assert.equal(new URL(page.url()).pathname, "/linear-algebra", "reload should preserve the route while restoring locale");

  await page.goto("/about", { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "en-GB", "formal routes should respect the saved locale");
  await page.evaluate(() => localStorage.setItem("scical600.language", "ja"));
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "ja", "a pre-existing Japanese choice should load from storage");
  await page.locator("#language-select").selectOption("en-GB");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "en-GB", "manual English should override stored Japanese after reload");

  for (const [language, expected] of Object.entries(localeExpectations)) {
    await page.locator("#language-select").selectOption(language);
    const releaseDictionary = await page.evaluate((selected) => {
      const dictionary = window.SciCalAdditionalLocales?.[selected] || {};
      return Object.fromEntries(Object.entries(dictionary).filter(([key]) => key.startsWith("android") || key.startsWith("native")));
    }, language);
    assert.equal(await page.locator("html").getAttribute("lang"), language, `${language} language selection`);
    assert.equal(await page.locator("html").getAttribute("dir"), language === "ar" ? "rtl" : "ltr", `${language} writing direction`);
    assert.match(await page.locator('[data-view-panel="about"] h1').textContent(), expected.hero, `${language} hero`);
    assert.match(await page.locator('[data-i18n="androidDownload"]').textContent(), expected.download, `${language} Android label`);
    assert.match(await page.locator('[data-i18n="nativeAvailabilityTitle"]').textContent(), expected.native, `${language} native availability title`);
    assert.equal(await page.locator(".android-download").getAttribute("aria-label"), releaseDictionary.androidDownloadAria, `${language} Android download aria-label`);
    for (const key of [
      "androidDownload", "androidReleaseDetails", "androidChecksum", "androidFileSize", "androidDownloadDisclosure",
      "nativeAvailabilityEyebrow", "nativeAvailabilityTitle", "nativeAvailabilityIntro",
      "nativeAndroidDescription", "nativeWindowsDescription", "nativeMacosDescription", "nativeIosDescription",
    ]) {
      assert.equal((await page.locator(`[data-i18n="${key}"]`).textContent()).trim(), releaseDictionary[key], `${language} ${key}`);
    }
  }
}

async function runFunctionalChecks(page) {
  const firstKey = page.locator(".calc-key").first();
  await firstKey.dispatchEvent("pointerdown", { pointerId: 41, pointerType: "touch", isPrimary: true, buttons: 1 });
  assert.equal(await firstKey.evaluate((element) => element.classList.contains("is-pressed")), true, "touch pointerdown should press immediately");
  await firstKey.dispatchEvent("pointerup", { pointerId: 41, pointerType: "touch", isPrimary: true, buttons: 0 });
  assert.equal(await firstKey.evaluate((element) => element.classList.contains("is-pressed")), false, "pointerup should clear press state");
  await firstKey.dispatchEvent("pointerdown", { pointerId: 42, pointerType: "touch", isPrimary: true, buttons: 1 });
  await firstKey.dispatchEvent("pointercancel", { pointerId: 42, pointerType: "touch", isPrimary: true, buttons: 0 });
  assert.equal(await firstKey.evaluate((element) => element.classList.contains("is-pressed")), false, "pointercancel should clear press state");

  await chooseMode(page, "CMPLX");
  assert.equal(await page.locator("#mode-workbench").isVisible(), true, "web mode should show the complex workbench");
  await page.locator("#interface-mode-toggle").click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().interfaceMode), "simulator");
  assert.equal(await page.locator("#mode-workbench").isHidden(), true, "simulator mode should hide the specialist workbench");
  await page.keyboard.type("(2+3i)+(4-5i)");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#result").textContent(), "6 − 2i", "complex simulator calculation");

  await page.locator('.calc-key[data-key-label="AC"]').click();
  await page.locator('.calc-key[data-key-label="ENG"]').click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().expression), "i", "ENG should input i directly in CMPLX mode");

  await chooseMode(page, "BASE");
  const baseLegends = await page.locator(".calc-key__context--base").allTextContents();
  for (const label of ["LOGIC", "DEC", "HEX", "BIN", "OCT", "E", "F"]) {
    assert.ok(baseLegends.includes(label), `physical BASE legend ${label} should be visible`);
  }
  await page.locator('.calc-key[data-key-label="ln"]').click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().base), 8, "OCT key should select octal directly");
  await page.locator('.calc-key[data-key-label="x²"]').click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().base), 10, "DEC key should select decimal directly");
  await page.locator('.calc-key[data-key-label="log"]').click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().base), 2, "BIN key should select binary directly");
  await page.keyboard.type("1+1");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#result").textContent(), "10", "binary simulator calculation");

  await page.locator('.calc-key[data-key-label="^"]').click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().base), 16, "HEX key should select hexadecimal directly");
  await page.locator('.calc-key[data-key-label="AC"]').click();
  await page.locator('.calc-key[data-key-label="1"]').click();
  await page.locator('.calc-key[data-key-label="tan"]').click();
  await page.locator('.calc-key[data-key-label="+"]').click();
  await page.locator('.calc-key[data-key-label="1"]').click();
  await page.locator('.calc-key[data-key-label="EXE"]').click();
  assert.equal(await page.locator("#result").textContent(), "20", "A-F should be direct BASE digits without Alpha");

  await page.locator('.calc-key[data-key-label="log"]').click();
  await page.locator('.calc-key[data-key-label="AC"]').click();
  await page.keyboard.type("101");
  await page.locator('.calc-key[data-key-label="x⁻¹"]').click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().screenMenu?.type), "logic", "LOGIC should open its LCD menu");
  await page.locator('.calc-key[data-key-label="1"]').click();
  await page.keyboard.type("11");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#result").textContent(), "1", "LOGIC menu AND calculation");

  await page.locator('.calc-key[data-key-label="AC"]').click();
  await page.locator('.calc-key[data-key-label="x⁻¹"]').click();
  await page.locator('.replay-pad [data-action="right"]').evaluate((button) => button.click());
  await page.locator('.replay-pad [data-action="right"]').evaluate((button) => button.click());
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().screenMenu?.page), 2, "LOGIC should expose its third prefix page");
  await page.locator('.calc-key[data-key-label="2"]').click();
  await page.locator('.calc-key[data-key-label="tan"]').click();
  await page.locator('.calc-key[data-key-label="+"]').click();
  await page.locator('.calc-key[data-key-label="x⁻¹"]').click();
  await page.locator('.replay-pad [data-action="left"]').evaluate((button) => button.click());
  await page.locator('.calc-key[data-key-label="1"]').click();
  await page.locator('.calc-key[data-key-label="1"]').click();
  await page.locator('.calc-key[data-key-label="EXE"]').click();
  assert.equal(await page.locator("#result").textContent(), "10000", "mixed h/d LOGIC prefixes should calculate in BIN output");

  await chooseMode(page, "COMP");
  await page.locator('.calc-key[data-key-label="5"]').click();
  await page.locator('.utility-key[data-action="shift"]').evaluate((button) => button.click());
  await page.locator('.calc-key[data-key-label="x⁻¹"]').click();
  await page.locator('.calc-key[data-key-label="EXE"]').click();
  assert.equal(await page.locator("#result").textContent(), "120", "Shift x reciprocal should be factorial");

  await chooseMode(page, "SD");
  await page.keyboard.type("12");
  await page.keyboard.press("Backspace");
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().expression), "1", "simulator DEL state");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().expression), "", "simulator AC state");
  await page.keyboard.type("1,1");
  await page.keyboard.press("Enter");
  await page.keyboard.type("3,2");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().sdEntries), 2, "SD continuous sample entry");
  assert.match(await page.locator("#result").textContent(), /n=3\s+x̄=2\.333/);
  await page.keyboard.type("5");
  await page.locator('.calc-key[data-key-label="M+"]').click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().sdEntries), 3, "DT should register statistical data directly");
  await page.locator('.utility-key[data-action="shift"]').evaluate((button) => button.click());
  await page.locator('.calc-key[data-key-label="M+"]').click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().sdEntries), 0, "Shift CL should clear statistical data");

  await chooseMode(page, "REG");
  for (const sample of ["1,3", "2,5", "3,7"]) {
    await page.keyboard.type(sample);
    await page.keyboard.press("Enter");
  }
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().regEntries), 3, "REG continuous sample entry");
  assert.match(await page.locator("#result").textContent(), /a=1 b=2/);

  await chooseMode(page, "PRGM");
  await page.keyboard.type("2");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#result").textContent(), "5.08", "program simulator execution");
  await page.locator("#interface-mode-toggle").click();
  assert.equal(await page.evaluate(() => window.SciCalApp.getState().interfaceMode), "web");
  assert.equal(await page.locator("#mode-workbench").isVisible(), true, "returning to web mode should restore the program workbench");
  assert.match(await page.locator("[data-program-source]").inputValue(), /A×2\.54/);

  await page.goto("/", { waitUntil: "networkidle" });
  assert.equal(await page.locator('[data-view-panel="about"]').isVisible(), true, "root platform page");
  assert.match(await page.locator('[data-view-panel="about"] h1').textContent(), /math/i);
  assert.equal(await page.locator(".home-tools:not(.native-availability) .home-tool-card").count(), 8, "home should show six primary and two companion calculators");
  assert.equal(await page.locator("#language-select option").count(), 12, "language picker should expose twelve languages");
  const localizedTitles = new Set();
  const localizedAndroidLabels = new Set();
  for (const [language, direction] of [
    ["fr", "ltr"],
    ["de", "ltr"],
    ["es", "ltr"],
    ["ar", "rtl"],
    ["th", "ltr"],
    ["yue-Hant-HK", "ltr"],
  ]) {
    await page.locator("#language-select").selectOption(language);
    assert.equal(await page.locator("#language-select").inputValue(), language, `${language} language picker value`);
    assert.equal(await page.locator("html").getAttribute("lang"), language, `${language} language selection`);
    assert.equal(await page.locator("html").getAttribute("dir"), direction, `${language} writing direction`);
    const title = (await page.locator('[data-view-panel="about"] h1').textContent()).trim();
    const androidLabel = (await page.locator(".android-download").textContent()).trim();
    assert.ok(title.length > 0, `${language} About translation should be non-empty`);
    assert.ok(androidLabel.length > 0, `${language} Android download label should be non-empty`);
    localizedTitles.add(title);
    localizedAndroidLabels.add(androidLabel);
  }
  assert.equal(localizedTitles.size, 6, "language switching should render distinct localized About titles");
  assert.equal(localizedAndroidLabels.size, 6, "language switching should render distinct localized Android download labels");
  await page.goto("/about", { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/about", "/about is a stable formal route");
  assert.equal(await page.locator('[data-view-panel="about"]').isVisible(), true, "/about opens platform page");
  await page.locator("#language-select").selectOption("en-GB");
  await page.locator('[data-view-target="linear-algebra"]').first().click();
  assert.equal(new URL(page.url()).pathname, "/linear-algebra", "linear algebra navigation path");
  assert.equal(await page.locator("#matrix-a").getAttribute("inputmode"), "text", "matrix A uses a text keyboard with spaces and Return");
  assert.equal(await page.locator("[data-matrix-operation]").count(), 13, "all thirteen matrix operations are prominent");
  const linearLayout = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("#matrix-workspace button")]
      .filter((button) => button.offsetParent && !button.hidden)
      .map((button) => button.getBoundingClientRect().height);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      minButtonHeight: Math.min(...buttons),
    };
  });
  assert.ok(linearLayout.scrollWidth <= linearLayout.innerWidth, "Linear Algebra has no mobile horizontal overflow");
  assert.ok(linearLayout.minButtonHeight >= 44, `Linear Algebra minimum touch target is ${linearLayout.minButtonHeight}`);
  const operationShortcut = page.locator('[data-matrix-operation="multiply"]');
  await operationShortcut.dispatchEvent("pointerdown", { pointerId: 61, pointerType: "touch", isPrimary: true, buttons: 1 });
  assert.equal(await operationShortcut.evaluate((element) => element.classList.contains("is-pressed")), true, "matrix shortcut has immediate touch feedback");
  await operationShortcut.dispatchEvent("pointerup", { pointerId: 61, pointerType: "touch", isPrimary: true, buttons: 0 });
  assert.equal(await operationShortcut.evaluate((element) => element.classList.contains("is-pressed")), false, "matrix shortcut clears touch feedback");
  await page.locator("#matrix-a").fill("1 2\r\n3 4");
  await page.locator("#matrix-b").fill("5,6\n7,8");
  await page.locator("#matrix-operation").selectOption("multiply");
  assert.equal(await operationShortcut.getAttribute("aria-pressed"), "true", "select and shortcut stay synchronized");
  await page.locator("#matrix-calculate").click();
  assert.deepEqual(await page.locator("#matrix-result td").allTextContents(), ["19", "22", "43", "50"], "matrix multiplication UI");
  assert.equal(await page.locator("#matrix-result-shape").textContent(), "2 × 2", "matrix result reports its dimensions");
  await page.locator("#matrix-swap").click();
  assert.equal(await page.locator("#matrix-a").inputValue(), "5,6\n7,8", "swap exchanges matrix A");
  assert.equal(await page.locator("#matrix-b").inputValue(), "1 2\n3 4", "swap exchanges matrix B");
  await page.locator('[data-matrix-example="determinant"]').click();
  assert.equal(await page.locator("#matrix-operation").inputValue(), "determinant", "example selects its operation");
  assert.equal(await page.locator("#matrix-b-card").isHidden(), true, "unary operation hides matrix B");
  assert.equal(await page.locator("#matrix-result").textContent(), "4", "determinant example calculates immediately");
  await page.locator('[data-matrix-target="a"][data-matrix-template="identity"]').click();
  assert.equal(await page.locator("#matrix-a").inputValue(), "1 0 0\n0 1 0\n0 0 1", "identity template follows the current square dimension");
  assert.equal(await page.locator("#matrix-a-shape").textContent(), "3 × 3", "matrix dimension updates live");
  await page.locator('[data-matrix-target="a"][data-matrix-template="clear"]').click();
  await page.locator("#matrix-calculate").click();
  assert.equal(await page.locator("#matrix-a").getAttribute("aria-invalid"), "true", "invalid input is associated with matrix A");
  await page.locator('[data-matrix-example="product"]').click();
  assert.equal(await page.locator("#matrix-a-shape").textContent(), "2 × 3", "rectangular example reports matrix A dimensions");
  assert.equal(await page.locator("#matrix-b-shape").textContent(), "3 × 2", "rectangular example reports matrix B dimensions");
  assert.deepEqual(await page.locator("#matrix-result td").allTextContents(), ["58", "64", "139", "154"], "rectangular example calculates immediately");
  await page.locator('[data-matrix-example="solve"]').click();
  assert.equal(await page.locator("#matrix-operation").inputValue(), "solve", "linear-system example selects solve");
  assert.deepEqual(await page.locator("#matrix-result td").allTextContents(), ["1", "-1"], "AX = B solver returns the solution vector");
  await page.locator('[data-matrix-operation="rref"]').click();
  await page.locator("#matrix-a").fill("1 2 3\n2 4 6\n1 1 1");
  await page.locator("#matrix-calculate").click();
  assert.deepEqual(await page.locator("#matrix-result td").allTextContents(), ["1", "0", "-1", "0", "1", "2", "0", "0", "0"], "RREF operation renders reduced rows");
  await page.locator('[data-matrix-example="eigen"]').click();
  assert.equal(await page.locator("#matrix-result-shape").textContent(), "2 eigenpairs", "eigen result context starts in English");
  await page.locator("#language-select").selectOption("zh-Hans");
  await page.evaluate(() => new Promise(requestAnimationFrame));
  assert.equal(await page.locator('[data-matrix-operation="inverse"] span').textContent(), "逆矩阵", "matrix workspace is localized");
  assert.equal(await page.locator("#matrix-result-shape").textContent(), "2 组特征对", "dynamic eigen context follows the selected language");
  assert.match(await page.locator("#matrix-result-summary").textContent(), /A 2 × 2/, "language changes preserve dynamic result dimensions");
  await page.locator("#language-select").selectOption("th");
  assert.match(await page.locator('[data-view-panel="linear-algebra"] h1').textContent(), /เมทริกซ์/, "Thai Linear Algebra translation");
  assert.equal(await page.locator('[data-matrix-operation="inverse"] span').textContent(), "อินเวอร์ส", "Thai matrix shortcut translation");
  await page.locator("#language-select").selectOption("yue-Hant-HK");
  assert.match(await page.locator('[data-view-panel="linear-algebra"] h1').textContent(), /唔使/, "Cantonese Linear Algebra translation");
  assert.match(await page.locator(".matrix-input-hint").textContent(), /或者/, "Cantonese matrix input guidance");
  await page.locator("#language-select").selectOption("ar");
  const rtlHeader = await page.evaluate(() => {
    const boxes = [".language-picker", ".app-nav-button", ".app-bar .brand"]
      .map((selector) => document.querySelector(selector).getBoundingClientRect());
    const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return { overlaps: overlap(boxes[0], boxes[1]) || overlap(boxes[0], boxes[2]) };
  });
  assert.equal(rtlHeader.overlaps, false, "RTL Linear Algebra header controls should not overlap");
  await page.locator("#language-select").selectOption("en-GB");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator('[data-view-panel="linear-algebra"]').isVisible(), true, "direct /linear-algebra refresh route");
  await page.goto("/statistics-calculator", { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/statistics-calculator", "Statistics Calculator formal route");
  assert.equal(await page.locator('[data-view-panel="statistics-calculator"]').isVisible(), true, "Statistics Calculator direct route");
  await page.locator("#statistics-example").click();
  assert.match(await page.locator("#statistics-summary").textContent(), /Mean4\.5/, "descriptive statistics calculate from example data");
  assert.equal(await page.locator("#statistics-frequency-body tr").count(), 8, "frequency table renders each distinct value");
  assert.match(await page.locator("#statistics-bivariate").textContent(), /Pearson correlation r/, "paired analysis renders correlation and regression");
  const statisticsLayout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, minButtonHeight: Math.min(...[...document.querySelectorAll("#statistics-calculator button")].filter((button) => button.offsetParent).map((button) => button.getBoundingClientRect().height)) }));
  assert.ok(statisticsLayout.scrollWidth <= statisticsLayout.innerWidth, "Statistics Calculator has no mobile horizontal overflow");
  assert.ok(statisticsLayout.minButtonHeight >= 44, `Statistics Calculator minimum touch target is ${statisticsLayout.minButtonHeight}`);
  await page.goto("/probability-calculator", { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/probability-calculator", "Probability Calculator formal route");
  assert.equal(await page.locator('[data-view-panel="probability-calculator"]').isVisible(), true, "Probability Calculator direct route");
  assert.match(await page.locator("#binomial-result").textContent(), /0\.1171875/, "binomial distribution calculates exact probability");
  assert.match(await page.locator("#poisson-result").textContent(), /0\.146525/, "Poisson distribution calculates exact probability");
  assert.match(await page.locator("#normal-result").textContent(), /0\.95000/, "normal distribution calculates interval probability");
  assert.match(await page.locator("#event-probability-result").textContent(), /0\.7/, "event calculator renders the union probability");
  const probabilityLayout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, minButtonHeight: Math.min(...[...document.querySelectorAll("#probability-calculator button")].filter((button) => button.offsetParent).map((button) => button.getBoundingClientRect().height)) }));
  assert.ok(probabilityLayout.scrollWidth <= probabilityLayout.innerWidth, "Probability Calculator has no mobile horizontal overflow");
  assert.ok(probabilityLayout.minButtonHeight >= 44, `Probability Calculator minimum touch target is ${probabilityLayout.minButtonHeight}`);
  await page.goto("/computer-calculator", { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).pathname, "/computer-calculator", "Computer Calculator formal route");
  assert.equal(await page.locator('[data-view-panel="computer-calculator"]').isVisible(), true, "Computer Calculator direct refresh");
  const computerLayout = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("#computer-calculator button")].filter((button) => button.offsetParent).map((button) => ({ id: button.id, className: button.className, height: button.getBoundingClientRect().height }));
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, minButton: buttons.sort((a,b) => a.height-b.height)[0] };
  });
  assert.ok(computerLayout.scrollWidth <= computerLayout.innerWidth, "Computer Calculator has no mobile horizontal overflow");
  assert.ok(computerLayout.minButton.height >= 44, `Computer Calculator minimum visible touch target is ${JSON.stringify(computerLayout.minButton)}`);
  assert.equal(await page.locator("#radix-results .radix-result").count(), 5, "live radix converter renders standard and custom bases");
  await page.locator("#integer-width").selectOption("64");
  await page.locator("#integer-a").fill("18446744073709551615");
  await page.locator("#integer-operation").selectOption("NOT");
  await page.locator("#integer-calculate").click();
  assert.match(await page.locator("#integer-result").textContent(), /0xFFFFFFFFFFFFFFFF/, "64-bit BigInt UI path");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator('[data-view-panel="computer-calculator"]').isVisible(), true, "direct Computer Calculator refresh route");
  await page.goto("/economics-calculator", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.SciCalUI && window.EconomicsCalculatorCore);
  assert.equal(new URL(page.url()).pathname, "/economics-calculator", "Economics Calculator formal route");
  assert.equal(await page.locator('[data-view-panel="economics-calculator"]').isVisible(), true, "Economics Calculator direct route");
  const economicsLayout = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("#economics-calculator button")].filter((button) => button.offsetParent).map((button) => ({ id: button.id, className: button.className, height: button.getBoundingClientRect().height }));
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, minButton: buttons.sort((a,b) => a.height-b.height)[0] };
  });
  assert.ok(economicsLayout.scrollWidth <= economicsLayout.innerWidth, "Economics Calculator has no mobile horizontal overflow");
  assert.ok(economicsLayout.minButton.height >= 44, `Economics Calculator minimum visible touch target is ${JSON.stringify(economicsLayout.minButton)}`);
  await page.locator("#fx-manual-rate").fill("0.1282");
  await page.locator("#fx-convert").click();
  assert.match(await page.locator("#fx-result").textContent(), /128\.20|128,20/, "manual FX fallback calculates without network");
  await page.locator('[data-economics-section="interest"]').click();
  await page.locator("#interest-calculate").click();
  assert.match(await page.locator("#interest-result").textContent(), /Future value/, "interest tool calculates");
  await page.locator('[data-economics-section="loans"]').click();
  await page.locator("#loan-calculate").click();
  assert.match(await page.locator("#loan-result").textContent(), /P-plan rate/, "mortgage comparison calculates");
  await page.locator("#language-select").selectOption("ar");
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl", "Economics Calculator supports Arabic RTL");
  assert.match(await page.locator('[data-view-panel="economics-calculator"] h1').textContent(), /أسعار/);
  await page.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await page.locator('[data-view-panel="economics-calculator"]').isVisible(), true, "direct Economics Calculator refresh route");
}

(async () => {
  const server = await startServer();
  const address = server.address();
  // Let Playwright select its compatible bundled headless executable by
  // default. CI callers can still supply a deliberate browser override.
  const browser = await chromium.launch({
    headless: true,
    ...(chromePath ? { executablePath: chromePath } : {}),
  });
  const viewports = [
    { name: "iPhone 13", width: 390, height: 844 },
    { name: "iPhone 15", width: 393, height: 852 },
    { name: "iPhone 16/17 Pro", width: 402, height: 874 },
    { name: "iPhone 17 Pro browser toolbar", width: 402, height: 720 },
    { name: "iPhone 17 Pro Max", width: 440, height: 956 },
    { name: "Xiaomi 13+", width: 393, height: 873 },
    { name: "iPhone landscape", width: 844, height: 390, landscape: true },
    { name: "Xiaomi landscape", width: 873, height: 393, landscape: true },
  ];
  let iPhone17Metrics;
  try {
    {
      const context = await browser.newContext({ baseURL: `http://127.0.0.1:${address.port}` });
      const page = await context.newPage();
      await page.goto("/tests/ui-smoke.html", { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.querySelector("#report")?.dataset.status);
      assert.equal(await page.locator("#report").getAttribute("data-status"), "passed", await page.locator("#report").textContent());
      console.log("PASS existing UI smoke test");
      await context.close();
    }
    {
      const context = await browser.newContext({
        baseURL: `http://127.0.0.1:${address.port}`,
        locale: "ja-JP",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await checkLanguagePersistence(page);
      console.log("PASS twelve-language Android/native content and manual locale persistence");
      await context.close();
    }
    {
      const context = await browser.newContext({
        baseURL: `http://127.0.0.1:${address.port}`,
        viewport: { width: 393, height: 873 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto("/systembussing/index.html", { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.SystemBussingApp);
      assert.equal(await page.locator("html").getAttribute("lang"), "en", "SystemBussing defaults to English");
      assert.equal(await page.locator("#language option").count(), 8, "SystemBussing exposes all requested languages");
      const localeExpectations = {
        en: [/Device input/, /Ready/],
        ja: [/デバイス入力/, /準備完了/],
        "zh-Hant": [/裝置輸入/, /準備就緒/],
        "zh-Hans": [/设备输入/, /准备就绪/],
        ko: [/장치 입력/, /준비/],
        fr: [/Entrée du périphérique/, /Prêt/],
        de: [/Geräteeingabe/, /Bereit/],
        es: [/Entrada del dispositivo/, /Listo/],
      };
      for (const [locale, [label, stage]] of Object.entries(localeExpectations)) {
        await page.locator("#language").selectOption(locale);
        assert.equal(await page.locator("html").getAttribute("lang"), locale, `${locale} document language`);
        assert.match(await page.locator('label[for="device"]').textContent(), label, `${locale} static controls`);
        assert.match(await page.locator("#stage").textContent(), stage, `${locale} changing step title`);
        assert.ok((await page.locator("#explanation").textContent()).trim().length > 20, `${locale} changing explanation`);
      }
      await page.locator("#language").selectOption("fr");
      await page.locator("#mobile-next").click();
      assert.match(await page.locator("#stage").textContent(), /Chargement/, "translated steps remain interactive");
      await page.locator("#language").selectOption("de");
      await page.reload({ waitUntil: "networkidle" });
      assert.equal(await page.locator("html").getAttribute("lang"), "de", "SystemBussing locale persists");
      const systemBussingLayout = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        minControlHeight: Math.min(...[...document.querySelectorAll("button, select")].filter((element) => element.offsetParent).map((element) => element.getBoundingClientRect().height)),
      }));
      assert.ok(systemBussingLayout.scrollWidth <= systemBussingLayout.innerWidth, "SystemBussing has no mobile horizontal overflow");
      assert.ok(systemBussingLayout.minControlHeight >= 44, "SystemBussing controls retain mobile touch targets");
      console.log("PASS SystemBussing English default and eight-language interactive UI");
      await context.close();
    }
    for (const viewport of viewports) {
      const context = await browser.newContext({
        baseURL: `http://127.0.0.1:${address.port}`,
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
        reducedMotion: "reduce",
        userAgent: viewport.name.startsWith("Xiaomi")
          ? "Mozilla/5.0 (Linux; Android 15; 23127PN0CC) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36"
          : "Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
      });
      const page = await context.newPage();
      const metrics = await checkLayout(page, viewport);
      if (viewport.name === "iPhone 16/17 Pro") iPhone17Metrics = metrics;
      if (viewport.name === "iPhone 17 Pro browser toolbar") {
        assert.ok(iPhone17Metrics, "standard iPhone 17 Pro metrics should be available");
        assert.ok(metrics.minKeyHeight >= 44, "browser toolbar height changes should preserve comfortable calculator keys");
        assert.ok(metrics.calculatorWidth >= iPhone17Metrics.calculatorWidth * 0.9, "browser toolbar height changes should preserve a full-width calculator body");
        const homeMetrics = await checkCompactHome(page, viewport);
        console.log(`PASS ${viewport.name} home: ${homeMetrics.cardCount} primary calculator choices remain mobile-accessible`);
      }
      console.log(`PASS ${viewport.name}: keys ${metrics.minKeyWidth.toFixed(1)} × ${metrics.minKeyHeight.toFixed(1)} CSS px`);
      if (viewport.name === "iPhone 16/17 Pro") await runFunctionalChecks(page);
      await context.close();
    }
    console.log("PASS touch feedback, modes 02–06, direct routes, twelve-language release UI, and Linear Algebra UI");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
