const test = require('node:test');
const assert = require('node:assert/strict');

test('configures visible Android system bars with light content for the dark app shell', async () => {
  const { configureAndroidSystemBars } = await import('../native/system-bars.js');
  const calls = [];
  const document = { documentElement: { dataset: {} } };
  const systemBars = {
    setStyle: async (options) => calls.push(['style', options]),
    show: async () => calls.push(['show']),
  };

  const configured = await configureAndroidSystemBars({ document, systemBars, style: 'DARK' });
  assert.deepEqual(calls, [['style', { style: 'DARK' }], ['show']]);
  assert.equal(configured, true);
  assert.equal(document.documentElement.dataset.androidSystemBars, 'ready');
});

test('keeps the Android calculator usable when system-bar control is unavailable', async () => {
  const { configureAndroidSystemBars } = await import('../native/system-bars.js');
  const document = { documentElement: { dataset: {} } };
  const result = await configureAndroidSystemBars({
    document,
    systemBars: { setStyle: async () => { throw new Error('unavailable'); } },
    style: 'DARK',
  });
  assert.equal(result, false);
  assert.equal(document.documentElement.dataset.androidSystemBars, 'unavailable');
});
