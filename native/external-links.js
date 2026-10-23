export function externalWebUrl(anchor, location) {
  if (!anchor?.href) return null;
  try {
    const url = new URL(anchor.href, location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.origin === location.origin || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function installExternalLinkBrowser({ document, location, open, fallbackOpen = () => {} }) {
  let pending = Promise.resolve();

  const onClick = (event) => {
    if (event.defaultPrevented
        || (event.button !== undefined && event.button !== 0)
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target?.closest?.('a[href]');
    const url = externalWebUrl(anchor, location);
    if (!url) return;

    event.preventDefault();
    document.documentElement.dataset.androidExternalUrl = url;
    pending = pending
      .then(() => open({ url }))
      .then(() => {
        const events = Number(document.documentElement.dataset.androidExternalEvents || '0') + 1;
        document.documentElement.dataset.androidExternalEvents = String(events);
        document.documentElement.dataset.androidExternalLinks = 'active';
      })
      .catch(() => {
        document.documentElement.dataset.androidExternalLinks = 'unavailable';
        try {
          fallbackOpen(url);
        } catch {
          // External browsing is optional; keep the offline app usable.
        }
      });
  };

  document.addEventListener('click', onClick);
  document.documentElement.dataset.androidExternalLinks = 'ready';
  return {
    get pending() { return pending; },
    dispose: () => document.removeEventListener('click', onClick),
  };
}
