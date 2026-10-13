const test = require('node:test');
const assert = require('node:assert/strict');

test('maps only SciCal600 launcher shortcut URLs to supported workspaces', async () => {
  const { viewFromAndroidShortcutUrl } = await import('../native/android-shortcuts.js');
  assert.equal(viewFromAndroidShortcutUrl('scical600://scientific-calculator'), 'calculator');
  assert.equal(viewFromAndroidShortcutUrl('scical600://linear-algebra'), 'linear-algebra');
  assert.equal(viewFromAndroidShortcutUrl('scical600://computer-calculator'), 'computer-calculator');
  assert.equal(viewFromAndroidShortcutUrl('scical600://economics-calculator'), 'economics-calculator');
  assert.equal(viewFromAndroidShortcutUrl('scical600:///linear-algebra/'), 'linear-algebra');
  assert.equal(viewFromAndroidShortcutUrl('https://scical600.pages.dev/linear-algebra'), null);
  assert.equal(viewFromAndroidShortcutUrl('scical600://unknown'), null);
  assert.equal(viewFromAndroidShortcutUrl('not a URL'), null);
  assert.equal(viewFromAndroidShortcutUrl(), null);
});
