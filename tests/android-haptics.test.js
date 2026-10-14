const test = require('node:test');
const assert = require('node:assert/strict');

test('Android haptics respond only to primary presses on enabled buttons', async () => {
  const { hapticButtonFromTarget, installButtonHaptics } = await import('../native/haptics.js');
  const enabledButton = { disabled: false, getAttribute: () => null };
  const disabledButton = { disabled: true, getAttribute: () => null };
  const ariaDisabledButton = { disabled: false, getAttribute: (name) => name === 'aria-disabled' ? 'true' : null };
  const target = (closest) => ({ closest: (selector) => selector === 'button' ? closest : null });

  assert.equal(hapticButtonFromTarget(target(enabledButton)), enabledButton);
  assert.equal(hapticButtonFromTarget(target(disabledButton)), null);
  assert.equal(hapticButtonFromTarget(target(ariaDisabledButton)), null);
  assert.equal(hapticButtonFromTarget(target(null)), null);
  assert.equal(hapticButtonFromTarget(null), null);

  let handler;
  let removed;
  let impacts = 0;
  const document = {
    addEventListener: (type, listener, options) => {
      assert.equal(type, 'pointerdown');
      assert.deepEqual(options, { passive: true });
      handler = listener;
    },
    removeEventListener: (type, listener) => {
      assert.equal(type, 'pointerdown');
      removed = listener;
    },
  };
  const cleanup = installButtonHaptics({ document, impact: () => { impacts += 1; } });
  handler({ target: target(enabledButton), isPrimary: true, button: 0 });
  handler({ target: target(enabledButton), isPrimary: false, button: 0 });
  handler({ target: target(enabledButton), isPrimary: true, button: 1 });
  handler({ target: target(disabledButton), isPrimary: true, button: 0 });
  assert.equal(impacts, 1);
  cleanup();
  assert.equal(removed, handler);
});

test('Android haptics never interrupt a button when the native effect fails', async () => {
  const { installButtonHaptics } = await import('../native/haptics.js');
  const button = { disabled: false, getAttribute: () => null };
  const target = { closest: () => button };
  let handler;
  const document = {
    addEventListener: (_type, listener) => { handler = listener; },
    removeEventListener: () => {},
  };

  installButtonHaptics({ document, impact: () => { throw new Error('not supported'); } });
  assert.doesNotThrow(() => handler({ target, isPrimary: true, button: 0 }));

  installButtonHaptics({ document, impact: () => Promise.reject(new Error('not supported')) });
  assert.doesNotThrow(() => handler({ target, isPrimary: true, button: 0 }));
  await new Promise((resolve) => setImmediate(resolve));
});
