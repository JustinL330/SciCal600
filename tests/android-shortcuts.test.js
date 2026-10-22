const test = require('node:test');
const assert = require('node:assert/strict');

test('maps only valid SciCal600 Android URLs to supported offline views', async () => {
  const { isAndroidView, viewFromAndroidUrl } = await import('../native/android-shortcuts.js');
  assert.equal(isAndroidView('calculator'), true);
  assert.equal(isAndroidView('economics-calculator'), true);
  assert.equal(isAndroidView('https://example.com'), false);
  assert.equal(viewFromAndroidUrl('scical600://scientific-calculator'), 'calculator');
  assert.equal(viewFromAndroidUrl('scical600://calculator'), 'calculator');
  assert.equal(viewFromAndroidUrl('scical600://linear-algebra'), 'linear-algebra');
  assert.equal(viewFromAndroidUrl('scical600://statistics-calculator'), 'statistics-calculator');
  assert.equal(viewFromAndroidUrl('scical600://statistics'), 'statistics-calculator');
  assert.equal(viewFromAndroidUrl('scical600://probability-calculator'), 'probability-calculator');
  assert.equal(viewFromAndroidUrl('scical600://probability'), 'probability-calculator');
  assert.equal(viewFromAndroidUrl('scical600://computer-calculator'), 'computer-calculator');
  assert.equal(viewFromAndroidUrl('scical600://economics-calculator'), 'economics-calculator');
  assert.equal(viewFromAndroidUrl('scical600://manual'), 'manual');
  assert.equal(viewFromAndroidUrl('scical600://about'), 'about');
  assert.equal(viewFromAndroidUrl('scical600:///linear-algebra/'), 'linear-algebra');
  assert.equal(viewFromAndroidUrl('https://scical600.pages.dev/linear-algebra'), null);
  assert.equal(viewFromAndroidUrl('scical600://user:secret@linear-algebra'), null);
  assert.equal(viewFromAndroidUrl('scical600://unknown'), null);
  assert.equal(viewFromAndroidUrl('not a URL'), null);
  assert.equal(viewFromAndroidUrl(), null);
});
