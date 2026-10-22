const test = require('node:test');
const assert = require('node:assert/strict');

function fakeDocument() {
  const value = { textContent: '' };
  const container = {
    hidden: true,
    querySelector: (selector) => selector === '[data-android-version-value]' ? value : null,
  };
  return {
    documentElement: { dataset: {} },
    querySelector: (selector) => selector === '#android-installed-version' ? container : null,
    container,
    value,
  };
}

test('formats the installed Android version and build number', async () => {
  const { formatAndroidAppVersion } = await import('../native/app-info.js');
  assert.equal(formatAndroidAppVersion({ version: '0.3.0-dev.148', build: '148' }), '0.3.0-dev.148 (148)');
  assert.equal(formatAndroidAppVersion({ version: ' 0.4.0 ', build: '' }), '0.4.0');
  assert.equal(formatAndroidAppVersion({ build: '148' }), null);
});

test('shows trusted Android package metadata without injecting markup', async () => {
  const { installAndroidAppInfo } = await import('../native/app-info.js');
  const document = fakeDocument();
  const info = await installAndroidAppInfo({
    document,
    getInfo: async () => ({ version: '<b>0.3.0</b>', build: '148' }),
  });

  assert.equal(info.build, '148');
  assert.equal(document.value.textContent, '<b>0.3.0</b> (148)');
  assert.equal(document.container.hidden, false);
  assert.equal(document.documentElement.dataset.androidAppInfo, 'ready');
  assert.equal(document.documentElement.dataset.androidAppVersion, '<b>0.3.0</b>');
  assert.equal(document.documentElement.dataset.androidAppBuild, '148');
});

test('keeps the Android version badge hidden when native metadata fails', async () => {
  const { installAndroidAppInfo } = await import('../native/app-info.js');
  const document = fakeDocument();
  const info = await installAndroidAppInfo({
    document,
    getInfo: async () => { throw new Error('native bridge unavailable'); },
  });

  assert.equal(info, null);
  assert.equal(document.container.hidden, true);
  assert.equal(document.documentElement.dataset.androidAppInfo, 'unavailable');
});
