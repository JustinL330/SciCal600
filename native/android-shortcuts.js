const androidRouteViews = Object.freeze({
  'scientific-calculator': 'calculator',
  calculator: 'calculator',
  'linear-algebra': 'linear-algebra',
  'statistics-calculator': 'statistics-calculator',
  statistics: 'statistics-calculator',
  'probability-calculator': 'probability-calculator',
  probability: 'probability-calculator',
  'computer-calculator': 'computer-calculator',
  'economics-calculator': 'economics-calculator',
  manual: 'manual',
  about: 'about',
});

export function viewFromAndroidUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'scical600:') return null;
    if (url.username || url.password || url.port) return null;
    const route = `${url.hostname}${url.pathname}`.replace(/^\/+|\/+$/g, '');
    return androidRouteViews[route] || null;
  } catch (_error) {
    return null;
  }
}
