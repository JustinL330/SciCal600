export function hapticButtonFromTarget(target) {
  if (!target || typeof target.closest !== 'function') return null;
  const button = target.closest('button');
  if (!button || button.disabled || button.getAttribute?.('aria-disabled') === 'true') return null;
  return button;
}

export function installButtonHaptics({ document, impact }) {
  const onPointerDown = (event) => {
    if (event.isPrimary === false || (event.button ?? 0) !== 0) return;
    if (!hapticButtonFromTarget(event.target)) return;
    try {
      Promise.resolve(impact()).catch(() => {});
    } catch {
      // Haptics are an enhancement; button actions must still work if unavailable.
    }
  };

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  return () => document.removeEventListener('pointerdown', onPointerDown);
}
