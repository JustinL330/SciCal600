const test = require('node:test');
const assert = require('node:assert/strict');

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    value: (key) => values.get(key),
  };
}

function fakeDocument() {
  const listeners = new Map();
  return {
    documentElement: { dataset: {} },
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
    dispatchView: (view) => listeners.get('scical600:viewchange')?.({ detail: { view } }),
    hasViewListener: () => listeners.has('scical600:viewchange'),
  };
}

test('restores the last valid Android workspace when no deep link launches the app', async () => {
  const { ANDROID_LAST_VIEW_KEY, installAndroidViewResume } = await import('../native/android-resume.js');
  const document = fakeDocument();
  const storage = memoryStorage({ [ANDROID_LAST_VIEW_KEY]: 'statistics-calculator' });
  const calls = [];
  const ui = { view: 'about', showView(view, addHistory) { calls.push([view, addHistory]); this.view = view; } };
  const app = {
    addListener: async () => ({ remove: async () => {} }),
    getLaunchUrl: async () => null,
  };

  const installed = installAndroidViewResume({ document, app, ui, storage });
  assert.equal(await installed.ready, 'saved-view');
  assert.deepEqual(calls, [['statistics-calculator', false]]);
  assert.equal(document.documentElement.dataset.androidResume, 'ready');
  document.dispatchView('linear-algebra');
  assert.equal(storage.value(ANDROID_LAST_VIEW_KEY), 'linear-algebra');
  document.dispatchView('not-a-workspace');
  assert.equal(storage.value(ANDROID_LAST_VIEW_KEY), 'linear-algebra');
  await installed.dispose();
  assert.equal(document.hasViewListener(), false);
});

test('gives a valid Android launch URL priority over the saved workspace', async () => {
  const { ANDROID_LAST_VIEW_KEY, installAndroidViewResume } = await import('../native/android-resume.js');
  const document = fakeDocument();
  const storage = memoryStorage({ [ANDROID_LAST_VIEW_KEY]: 'statistics-calculator' });
  const calls = [];
  const ui = { view: 'about', showView(view, addHistory) { calls.push([view, addHistory]); this.view = view; } };
  const app = {
    addListener: async () => ({ remove: async () => {} }),
    getLaunchUrl: async () => ({ url: 'scical600://economics-calculator' }),
  };

  const installed = installAndroidViewResume({ document, app, ui, storage });
  assert.equal(await installed.ready, 'deep-link');
  assert.deepEqual(calls, [['economics-calculator', undefined]]);
  assert.equal(storage.value(ANDROID_LAST_VIEW_KEY), 'economics-calculator');
  assert.equal(document.documentElement.dataset.androidDeepLink, 'economics-calculator');
});

test('ignores invalid or unavailable Android workspace storage', async () => {
  const { readLastAndroidView, saveLastAndroidView } = await import('../native/android-resume.js');
  const storage = memoryStorage({ 'scical600.android.lastView': 'https://example.com' });
  assert.equal(readLastAndroidView(storage), null);
  assert.equal(saveLastAndroidView(storage, 'https://example.com'), false);
  assert.equal(readLastAndroidView({ getItem: () => { throw new Error('blocked'); } }), null);
  assert.equal(saveLastAndroidView({ setItem: () => { throw new Error('blocked'); } }, 'calculator'), false);
});
