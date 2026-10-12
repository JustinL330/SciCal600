const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { attachStableAppPage, isTargetClosedError } = require('./android-webview-ready.cjs');

class FakeWebView extends EventEmitter {
  constructor(pid, page) {
    super();
    this._pid = pid;
    this._page = page;
  }
  pkg() { return 'io.github.justinfromhkg.scical600'; }
  pid() { return this._pid; }
  async page() { return this._page; }
}

function readyPage(overrides = {}) {
  return {
    isClosed: () => false,
    waitForFunction: async () => {},
    ...overrides,
  };
}

function fakeDevice(views) {
  return {
    views,
    webViews() { return this.views; },
    async webView() { return this.views[0]; },
    async shell() { return Buffer.from('999\n'); },
  };
}

test('reattaches when Android recreates the startup WebView', async () => {
  const replacementPage = readyPage();
  const replacement = new FakeWebView(102, replacementPage);
  const firstPage = readyPage({
    waitForFunction: async () => {
      first.emit('close');
      device.views = [replacement];
      throw new Error('page.waitForFunction: Target page, context or browser has been closed');
    },
  });
  const first = new FakeWebView(101, firstPage);
  const device = fakeDevice([first]);
  const retries = [];

  const page = await attachStableAppPage(device, {
    sleep: async () => {},
    onRetry: retry => retries.push(retry),
  });

  assert.equal(page, replacementPage);
  assert.equal(retries.length, 1);
  assert.equal(retries[0].pid, 101);
  assert.equal(first.listenerCount('close'), 0);
  assert.equal(replacement.listenerCount('close'), 0);
});

test('reattaches when a ready WebView closes during the quiet window', async () => {
  const replacementPage = readyPage();
  const replacement = new FakeWebView(202, replacementPage);
  const firstPage = readyPage();
  const first = new FakeWebView(201, firstPage);
  const device = fakeDevice([first]);
  let delays = 0;

  const page = await attachStableAppPage(device, {
    quietPeriodMs: 5,
    sleep: async () => {
      delays += 1;
      if (delays === 1) {
        device.views = [replacement];
        first.emit('close');
      }
    },
  });

  assert.equal(page, replacementPage);
  assert.equal(first.listenerCount('close'), 0);
  assert.equal(replacement.listenerCount('close'), 0);
});

test('does not retry a functional readiness failure', async () => {
  const failure = new Error('calculator bootstrap failed');
  const page = readyPage({ waitForFunction: async () => { throw failure; } });
  const view = new FakeWebView(301, page);
  const device = fakeDevice([view]);
  let retries = 0;

  await assert.rejects(
    attachStableAppPage(device, { sleep: async () => {}, onRetry: () => { retries += 1; } }),
    error => error === failure,
  );
  assert.equal(retries, 0);
  assert.equal(view.listenerCount('close'), 0);
});

test('does not hide an app-process crash behind a WebView retry', async () => {
  const page = readyPage({
    waitForFunction: async () => { throw new Error('Target page, context or browser has been closed'); },
  });
  const view = new FakeWebView(350, page);
  const device = fakeDevice([view]);
  device.shell = async () => Buffer.from('');
  let retries = 0;

  await assert.rejects(
    attachStableAppPage(device, { sleep: async () => {}, onRetry: () => { retries += 1; } }),
    /Android process .* stopped while its startup WebView was closing/,
  );
  assert.equal(retries, 0);
  assert.equal(view.listenerCount('close'), 0);
});

test('fails after the bounded number of startup closures', async () => {
  const views = Array.from({ length: 3 }, (_, index) => new FakeWebView(400 + index, readyPage()));
  const device = fakeDevice([views[0]]);
  let attempt = 0;
  for (const view of views) {
    view._page.waitForFunction = async () => {
      const next = views[attempt + 1];
      device.views = next ? [next] : [];
      view.emit('close');
      attempt += 1;
      throw new Error('Target page, context or browser has been closed');
    };
  }

  await assert.rejects(
    attachStableAppPage(device, { maxAttempts: 3, sleep: async () => {} }),
    /closed before becoming stable after 3 attempts/,
  );
  assert.equal(attempt, 3);
  for (const view of views) assert.equal(view.listenerCount('close'), 0);
});

test('recognizes only lifecycle closure failures as retryable', () => {
  assert.equal(isTargetClosedError({ name: 'TargetClosedError', message: 'closed' }), true);
  assert.equal(isTargetClosedError(new Error('Target page, context or browser has been closed')), true);
  assert.equal(isTargetClosedError(new Error('calculator assertion failed')), false);
});
