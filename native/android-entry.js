import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { handleBack } from './back.js';

if (Capacitor.isNativePlatform()) {
  document.documentElement.dataset.native = 'android';
  App.addListener('backButton', ({ canGoBack }) => {
    const handled = Number(document.documentElement.dataset.androidBackEvents || '0') + 1;
    document.documentElement.dataset.androidBackEvents = String(handled);
    handleBack({ window, document, canGoBack, minimize: () => App.minimizeApp() });
  }).then(async () => {
    // addListener posts registration to Capacitor's native handler. A native
    // App call queued behind it is the readiness barrier used by CI before
    // sending exactly one system Back event.
    await App.getState();
    document.documentElement.dataset.androidBackReady = 'true';
  }).catch((error) => {
    document.documentElement.dataset.androidBackReady = 'error';
    console.error(error);
  });
}
