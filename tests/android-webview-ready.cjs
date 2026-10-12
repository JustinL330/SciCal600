const DEFAULT_PACKAGE = 'io.github.justinfromhkg.scical600';
const DEFAULT_ACTIVITY = `${DEFAULT_PACKAGE}/.MainActivity`;

class StartupWebViewClosedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StartupWebViewClosedError';
  }
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function isTargetClosedError(error) {
  if (!error) return false;
  if (error instanceof StartupWebViewClosedError || error.name === 'TargetClosedError') return true;
  return /Target (?:page, context or browser|page|context|browser).*closed/i.test(String(error.message || error));
}

function focusedWindow(output) {
  return String(output || '')
    .split(/\r?\n/)
    .find(line => line.includes('mCurrentFocus=')) || '';
}

async function ensureAppWindowFocus(device, options = {}) {
  const pkg = options.pkg || DEFAULT_PACKAGE;
  const activity = options.activity || DEFAULT_ACTIVITY;
  const maxAttempts = options.maxAttempts || 4;
  const quietPeriodMs = options.quietPeriodMs || 500;
  const sleep = options.sleep || delay;
  const onRetry = options.onRetry || (() => {});
  let focus = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    focus = focusedWindow(await device.shell('dumpsys window windows'));
    if (focus.includes(pkg)) return focus;

    onRetry({ attempt, focus });
    // A freshly booted emulator can leave a launcher/system ANR dialog above
    // the already-resumed app. Dismiss only a confirmed non-app window, then
    // bring the target activity to the foreground and verify it owns focus.
    if (focus) await device.shell('input keyevent KEYCODE_BACK');
    await device.shell(`am start -W -n ${activity}`);
    await sleep(quietPeriodMs);
  }

  focus = focusedWindow(await device.shell('dumpsys window windows'));
  if (focus.includes(pkg)) return focus;
  throw new Error(`Android window focus did not reach ${pkg}; current focus: ${focus || 'unknown'}`);
}

async function waitForReplacementWebView(device, previousWebView, pkg, timeoutMs, sleep, now) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const replacement = device.webViews().find(view => view !== previousWebView && view.pkg() === pkg);
    if (replacement) return replacement;
    await sleep(Math.min(100, Math.max(1, deadline - now())));
  }
  throw new StartupWebViewClosedError(`replacement WebView for ${pkg} did not appear within ${timeoutMs}ms`);
}

async function attachStableAppPage(device, options = {}) {
  const pkg = options.pkg || DEFAULT_PACKAGE;
  const maxAttempts = options.maxAttempts || 4;
  const totalTimeoutMs = options.totalTimeoutMs || 45_000;
  const attachTimeoutMs = options.attachTimeoutMs || 15_000;
  const readyTimeoutMs = options.readyTimeoutMs || 20_000;
  const quietPeriodMs = options.quietPeriodMs || 750;
  const sleep = options.sleep || delay;
  const now = options.now || Date.now;
  const onRetry = options.onRetry || (() => {});
  const deadline = now() + totalTimeoutMs;
  let previousWebView;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remaining = deadline - now();
    if (remaining <= 0) break;
    let webView;
    let rejectClosed;
    const closed = new Promise((_, reject) => {
      rejectClosed = () => reject(new StartupWebViewClosedError(`startup WebView closed on attempt ${attempt}`));
    });

    try {
      webView = previousWebView
        ? await waitForReplacementWebView(device, previousWebView, pkg, Math.min(attachTimeoutMs, remaining), sleep, now)
        : await device.webView({ pkg }, { timeout: Math.min(attachTimeoutMs, remaining) });
      webView.on('close', rejectClosed);

      const page = await Promise.race([webView.page(), closed]);
      if (!page || page.isClosed()) throw new StartupWebViewClosedError(`startup page was already closed on attempt ${attempt}`);

      const readinessTimeout = Math.min(readyTimeoutMs, Math.max(1, deadline - now()));
      await Promise.race([
        (async () => {
          await page.waitForFunction(
            () => window.SciCalUI && document.documentElement.dataset.native === 'android',
            undefined,
            { timeout: readinessTimeout },
          );
          await page.waitForFunction(
            () => ['true', 'error'].includes(document.documentElement.dataset.androidBackReady),
            undefined,
            { timeout: readinessTimeout },
          );
          await sleep(quietPeriodMs);
        })(),
        closed,
      ]);

      if (page.isClosed() || !device.webViews().includes(webView)) {
        throw new StartupWebViewClosedError(`startup WebView did not survive the quiet window on attempt ${attempt}`);
      }
      return page;
    } catch (error) {
      if (!isTargetClosedError(error)) throw error;
      const processIds = String(await device.shell(`pidof ${pkg}`)).trim();
      if (!processIds) {
        const processFailure = new Error(`Android process ${pkg} stopped while its startup WebView was closing`);
        processFailure.cause = error;
        throw processFailure;
      }
      lastError = error;
      previousWebView = webView || previousWebView;
      onRetry({ attempt, error, pid: webView && webView.pid(), processIds });
    } finally {
      if (webView) webView.off('close', rejectClosed);
    }
  }

  const failure = new Error(`Android startup WebView closed before becoming stable after ${maxAttempts} attempts`);
  failure.cause = lastError;
  throw failure;
}

module.exports = {
  attachStableAppPage,
  ensureAppWindowFocus,
  focusedWindow,
  isTargetClosedError,
  StartupWebViewClosedError,
};
