export function calculationShareText(document) {
  const expression = document.querySelector('#expression')?.textContent?.trim() || '';
  const result = document.querySelector('#result')?.textContent?.trim() || '';
  if (expression && result && expression !== result) return `${expression} = ${result}`;
  return result || expression;
}

export async function installResultShare({ document, canShare, share, translate }) {
  const button = document.querySelector('#android-share-result');
  if (!button) return null;

  try {
    const capability = await canShare();
    if (!capability?.value) {
      document.documentElement.dataset.androidShare = 'unavailable';
      return null;
    }

    const onClick = async () => {
      const text = calculationShareText(document);
      if (!text) return;
      button.disabled = true;
      try {
        await share({
          title: 'SciCal600',
          text,
          dialogTitle: translate('shareResult'),
        });
      } catch {
        // Cancelling or lacking a share target must not interrupt calculation.
      } finally {
        button.disabled = false;
      }
    };

    button.addEventListener('click', onClick);
    button.hidden = false;
    document.documentElement.dataset.androidShare = 'ready';
    return () => button.removeEventListener('click', onClick);
  } catch {
    document.documentElement.dataset.androidShare = 'unavailable';
    return null;
  }
}
