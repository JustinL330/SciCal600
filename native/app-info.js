export function formatAndroidAppVersion(info) {
  const version = typeof info?.version === 'string' ? info.version.trim() : '';
  const build = typeof info?.build === 'string' ? info.build.trim() : '';
  if (!version) return null;
  return build ? `${version} (${build})` : version;
}

export async function installAndroidAppInfo({ document, getInfo }) {
  const container = document.querySelector('#android-installed-version');
  const value = container?.querySelector('[data-android-version-value]');
  if (!container || !value) return null;

  document.documentElement.dataset.androidAppInfo = 'loading';
  try {
    const info = await getInfo();
    const formatted = formatAndroidAppVersion(info);
    if (!formatted) throw new Error('Android app version is unavailable');
    value.textContent = formatted;
    container.hidden = false;
    document.documentElement.dataset.androidAppInfo = 'ready';
    document.documentElement.dataset.androidAppVersion = info.version.trim();
    document.documentElement.dataset.androidAppBuild = typeof info.build === 'string' ? info.build.trim() : '';
    return info;
  } catch {
    container.hidden = true;
    document.documentElement.dataset.androidAppInfo = 'unavailable';
    delete document.documentElement.dataset.androidAppVersion;
    delete document.documentElement.dataset.androidAppBuild;
    return null;
  }
}
