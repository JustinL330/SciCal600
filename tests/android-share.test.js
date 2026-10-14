const test = require('node:test');
const assert = require('node:assert/strict');

function fakeDocument({ expression = '1+1', result = '2' } = {}) {
  const listeners = new Map();
  const button = {
    hidden: true,
    disabled: false,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const document = {
    documentElement: { dataset: {} },
    querySelector: (selector) => ({
      '#android-share-result': button,
      '#expression': { textContent: expression },
      '#result': { textContent: result },
    })[selector] || null,
  };
  return { document, button, listeners };
}

test('formats the visible calculation for the Android share sheet', async () => {
  const { calculationShareText } = await import('../native/share-result.js');
  assert.equal(calculationShareText(fakeDocument().document), '1+1 = 2');
  assert.equal(calculationShareText(fakeDocument({ expression: '2', result: '2' }).document), '2');
  assert.equal(calculationShareText(fakeDocument({ expression: '', result: '7' }).document), '7');
});

test('enables Android result sharing only when the native share sheet is available', async () => {
  const { installResultShare } = await import('../native/share-result.js');
  const ready = fakeDocument();
  const payloads = [];
  const cleanup = await installResultShare({
    document: ready.document,
    canShare: async () => ({ value: true }),
    share: async (payload) => payloads.push(payload),
    translate: () => 'Share result',
  });
  assert.equal(ready.button.hidden, false);
  assert.equal(ready.document.documentElement.dataset.androidShare, 'ready');
  await ready.listeners.get('click')();
  assert.deepEqual(payloads, [{ title: 'SciCal600', text: '1+1 = 2', dialogTitle: 'Share result' }]);
  assert.equal(ready.button.disabled, false);
  cleanup();
  assert.equal(ready.listeners.has('click'), false);

  const unavailable = fakeDocument();
  assert.equal(await installResultShare({
    document: unavailable.document,
    canShare: async () => ({ value: false }),
    share: async () => {},
    translate: () => 'Share result',
  }), null);
  assert.equal(unavailable.button.hidden, true);
  assert.equal(unavailable.document.documentElement.dataset.androidShare, 'unavailable');
});
