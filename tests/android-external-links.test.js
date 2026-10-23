const test = require('node:test');
const assert = require('node:assert/strict');

function fakeDocument() {
  const listeners = new Map();
  return {
    documentElement: { dataset: {} },
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
    click: (anchor, overrides = {}) => {
      const event = {
        button: 0,
        defaultPrevented: false,
        target: { closest: () => anchor },
        preventDefault() { this.defaultPrevented = true; },
        ...overrides,
      };
      listeners.get('click')?.(event);
      return event;
    },
    hasClickListener: () => listeners.has('click'),
  };
}

test('accepts only credential-free external HTTP and HTTPS links', async () => {
  const { externalWebUrl } = await import('../native/external-links.js');
  const location = { href: 'https://localhost/about', origin: 'https://localhost' };
  assert.equal(externalWebUrl({ href: 'https://scical600.pages.dev/download.apk' }, location), 'https://scical600.pages.dev/download.apk');
  assert.equal(externalWebUrl({ href: 'http://example.com/path' }, location), 'http://example.com/path');
  assert.equal(externalWebUrl({ href: '/manual' }, location), null);
  assert.equal(externalWebUrl({ href: 'mailto:hello@example.com' }, location), null);
  assert.equal(externalWebUrl({ href: 'https://user:secret@example.com/' }, location), null);
  assert.equal(externalWebUrl(null, location), null);
});

test('opens Android external links without replacing the offline app', async () => {
  const { installExternalLinkBrowser } = await import('../native/external-links.js');
  const document = fakeDocument();
  const opened = [];
  const installed = installExternalLinkBrowser({
    document,
    location: { href: 'https://localhost/about', origin: 'https://localhost' },
    open: async (options) => opened.push(options),
  });
  assert.equal(document.documentElement.dataset.androidExternalLinks, 'ready');

  const local = document.click({ href: 'https://localhost/manual' });
  const modified = document.click({ href: 'https://example.com/' }, { ctrlKey: true });
  const external = document.click({ href: 'https://example.com/path' });
  await installed.pending;

  assert.equal(local.defaultPrevented, false);
  assert.equal(modified.defaultPrevented, false);
  assert.equal(external.defaultPrevented, true);
  assert.deepEqual(opened, [{ url: 'https://example.com/path' }]);
  assert.equal(document.documentElement.dataset.androidExternalLinks, 'active');
  assert.equal(document.documentElement.dataset.androidExternalEvents, '1');
  assert.equal(document.documentElement.dataset.androidExternalUrl, 'https://example.com/path');
  installed.dispose();
  assert.equal(document.hasClickListener(), false);
});

test('keeps a safe fallback when the Android browser is unavailable', async () => {
  const { installExternalLinkBrowser } = await import('../native/external-links.js');
  const document = fakeDocument();
  const fallbacks = [];
  const installed = installExternalLinkBrowser({
    document,
    location: { href: 'https://localhost/about', origin: 'https://localhost' },
    open: async () => { throw new Error('browser unavailable'); },
    fallbackOpen: (url) => fallbacks.push(url),
  });
  document.click({ href: 'https://example.com/fallback' });
  await installed.pending;
  assert.equal(document.documentElement.dataset.androidExternalLinks, 'unavailable');
  assert.deepEqual(fallbacks, ['https://example.com/fallback']);
});
