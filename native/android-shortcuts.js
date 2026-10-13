const shortcutViews = Object.freeze({
  'scientific-calculator': 'calculator',
  'linear-algebra': 'linear-algebra',
  'computer-calculator': 'computer-calculator',
  'economics-calculator': 'economics-calculator',
});

export function viewFromAndroidShortcutUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'scical600:') return null;
    const route = `${url.hostname}${url.pathname}`.replace(/^\/+|\/+$/g, '');
    return shortcutViews[route] || null;
  } catch (_error) {
    return null;
  }
}
