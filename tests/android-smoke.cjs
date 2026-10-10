const assert = require('node:assert/strict');
const { _android: android } = require('playwright');
(async () => {
  const [device] = await android.devices();
  assert.ok(device, 'Android emulator exists');
  try {
    const webview = await device.webView({ pkg: 'io.github.justinfromhkg.scical600' });
    const page = await webview.page();
    assert.ok(page, 'offline WebView page exists');
    await page.waitForFunction(() => window.SciCalUI && document.documentElement.dataset.native === 'android');
    await page.waitForFunction(() => ['true', 'error'].includes(document.documentElement.dataset.androidBackReady));
    assert.equal(await page.locator('html').getAttribute('data-android-back-ready'), 'true', 'native Back listener registered');
    const external = await page.evaluate(() => [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(e => e.src || e.href).filter(url => new URL(url).origin !== location.origin));
    assert.deepEqual(external, [], 'all application scripts/styles are bundled locally');
    for (const view of ['calculator', 'linear-algebra', 'computer-calculator', 'economics-calculator']) {
      await page.evaluate(view => window.SciCalUI.showView(view), view);
      assert.ok(await page.locator('[data-view-panel="' + view + '"]').isVisible(), view + ' works offline');
    }
    await page.evaluate(() => window.SciCalUI.showView('calculator'));
    for (const key of ['AC', '1', '+', '1', 'EXE']) await page.locator('.calc-key[data-key-label="' + key + '"]').click();
    assert.equal((await page.locator('#result').textContent()).trim(), '2', 'offline 1+1');
    const pressBackOnce = async (description, condition) => {
      const before = Number(await page.locator('html').getAttribute('data-android-back-events') || '0');
      await device.shell('input keyevent KEYCODE_BACK');
      await page.waitForFunction((previous) => Number(document.documentElement.dataset.androidBackEvents || '0') > previous, before);
      const after = Number(await page.locator('html').getAttribute('data-android-back-events') || '0');
      assert.equal(after, before + 1, `${description}: exactly one native Back event`);
      for (let poll = 0; poll < 20; poll += 1) {
        if (await condition()) return;
        await page.waitForTimeout(250);
      }
      throw new Error(`Android Back event fired once but did not ${description}`);
    };
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await page.evaluate(() => document.querySelector('#settings-dialog').showModal());
      await pressBackOnce(`close the settings dialog (cycle ${cycle})`, () => page.evaluate(() => !document.querySelector('#settings-dialog').open));
      assert.equal(await page.evaluate(() => window.SciCalUI.view), 'calculator', 'Back closes dialog before navigation');
      await page.evaluate(() => window.SciCalUI.showView('linear-algebra'));
      await pressBackOnce(`return to the calculator (cycle ${cycle})`, () => page.evaluate(() => window.SciCalUI.view === 'calculator'));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal document overflow');
    await page.screenshot({ path: 'artifacts/android-offline.png' });
    console.log('ANDROID_SMOKE_OK: installed APK, offline four workspaces, 1+1, six native Back events, viewport');
  } finally {
    await device.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
