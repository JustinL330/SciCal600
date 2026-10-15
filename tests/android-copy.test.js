const test = require('node:test');
const assert = require('node:assert/strict');

function fakeDocument({ expression = '1+1', result = '2' } = {}) {
  const listeners = new Map();
  const attributes = new Map();
  const icon = { textContent: '⧉' };
  const label = { textContent: 'Copy result' };
  const button = {
    hidden: true,
    disabled: false,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    querySelector: (selector) => ({
      '[data-copy-icon]': icon,
      '[data-copy-label]': label,
    })[selector] || null,
    setAttribute: (name, value) => attributes.set(name, value),
  };
  const document = {
    documentElement: { dataset: {} },
    querySelector: (selector) => ({
      '#android-copy-result': button,
      '#expression': { textContent: expression },
      '#result': { textContent: result },
    })[selector] || null,
  };
  return { document, button, icon, label, attributes, listeners };
}

test('copies the visible Android result and confirms it without blocking calculation', async () => {
  const { installResultCopy } = await import('../native/copy-result.js');
  const ready = fakeDocument();
  const writes = [];
  const scheduled = [];
  const cleanup = installResultCopy({
    document: ready.document,
    write: async (payload) => writes.push(payload),
    translate: (key) => ({ copyResult: 'Copy result', copiedResult: 'Result copied' })[key],
    schedule: (callback, delay) => scheduled.push({ callback, delay }),
  });

  assert.equal(ready.button.hidden, false);
  assert.equal(ready.document.documentElement.dataset.androidCopy, 'ready');
  await ready.listeners.get('click')();
  assert.deepEqual(writes, [{ string: '1+1 = 2' }]);
  assert.equal(ready.document.documentElement.dataset.androidCopy, 'copied');
  assert.equal(ready.document.documentElement.dataset.androidCopyEvents, '1');
  assert.equal(ready.attributes.get('aria-label'), 'Result copied');
  assert.equal(ready.label.textContent, 'Result copied');
  assert.equal(ready.icon.textContent, '✓');
  assert.equal(ready.button.disabled, false);
  assert.equal(scheduled[0].delay, 1600);
  scheduled[0].callback();
  assert.equal(ready.document.documentElement.dataset.androidCopy, 'ready');
  assert.equal(ready.document.documentElement.dataset.androidCopyEvents, '1');
  assert.equal(ready.attributes.get('aria-label'), 'Copy result');
  cleanup();
  assert.equal(ready.listeners.has('click'), false);
});

test('keeps the Android calculator usable when clipboard writing fails', async () => {
  const { installResultCopy } = await import('../native/copy-result.js');
  const failing = fakeDocument();
  installResultCopy({
    document: failing.document,
    write: async () => { throw new Error('unavailable'); },
    translate: (key) => key,
  });
  await failing.listeners.get('click')();
  assert.equal(failing.document.documentElement.dataset.androidCopy, 'error');
  assert.equal(failing.button.disabled, false);
});
