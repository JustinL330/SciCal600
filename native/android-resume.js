import { isAndroidView, viewFromAndroidUrl } from './android-shortcuts.js';

export const ANDROID_LAST_VIEW_KEY = 'scical600.android.lastView';

export function readLastAndroidView(storage) {
  try {
    const view = storage.getItem(ANDROID_LAST_VIEW_KEY);
    return isAndroidView(view) ? view : null;
  } catch {
    return null;
  }
}

export function saveLastAndroidView(storage, view) {
  if (!isAndroidView(view)) return false;
  try {
    storage.setItem(ANDROID_LAST_VIEW_KEY, view);
    return true;
  } catch {
    return false;
  }
}

export function installAndroidViewResume({ document, app, ui, storage }) {
  let openedUrl = false;
  let listenerHandle = null;

  const openAndroidUrl = (event = {}) => {
    const url = event?.url;
    const view = viewFromAndroidUrl(url);
    if (!view) return false;
    openedUrl = true;
    saveLastAndroidView(storage, view);
    if (document.documentElement.dataset.androidDeepLinkUrl !== url || ui.view !== view) {
      ui.showView(view);
      document.documentElement.dataset.androidDeepLinkUrl = url;
      document.documentElement.dataset.androidDeepLink = view;
    }
    return true;
  };

  const onViewChange = (event) => saveLastAndroidView(storage, event.detail?.view);
  document.addEventListener('scical600:viewchange', onViewChange);

  const listenerReady = Promise.resolve()
    .then(() => app.addListener('appUrlOpen', openAndroidUrl))
    .then((handle) => { listenerHandle = handle; })
    .catch(() => {});

  const ready = Promise.all([
    listenerReady,
    Promise.resolve().then(() => app.getLaunchUrl()).catch(() => null),
  ]).then(([, launchUrl]) => {
    const openedLaunchUrl = openedUrl || openAndroidUrl(launchUrl);
    if (!openedLaunchUrl) {
      const savedView = readLastAndroidView(storage);
      if (savedView && ui.view !== savedView) ui.showView(savedView, false);
    }
    document.documentElement.dataset.androidResume = 'ready';
    return openedLaunchUrl ? 'deep-link' : 'saved-view';
  }).catch(() => {
    document.documentElement.dataset.androidResume = 'unavailable';
    return null;
  });

  return {
    ready,
    openAndroidUrl,
    dispose: async () => {
      document.removeEventListener('scical600:viewchange', onViewChange);
      await listenerReady;
      await listenerHandle?.remove?.();
    },
  };
}
