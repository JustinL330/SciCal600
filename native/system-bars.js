export async function configureAndroidSystemBars({ document, systemBars, style }) {
  try {
    await systemBars.setStyle({ style });
    await systemBars.show();
    document.documentElement.dataset.androidSystemBars = 'ready';
    return true;
  } catch {
    document.documentElement.dataset.androidSystemBars = 'unavailable';
    return false;
  }
}
