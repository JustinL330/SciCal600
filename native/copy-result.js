import { calculationShareText } from './share-result.js';

export function installResultCopy({ document, write, translate, schedule = setTimeout }) {
  const button = document.querySelector('#android-copy-result');
  if (!button) return null;

  const icon = button.querySelector('[data-copy-icon]');
  const label = button.querySelector('[data-copy-label]');
  const setLabel = (key, symbol) => {
    const text = translate(key);
    button.setAttribute('aria-label', text);
    if (label) label.textContent = text;
    if (icon) icon.textContent = symbol;
  };
  const restore = () => {
    document.documentElement.dataset.androidCopy = 'ready';
    setLabel('copyResult', '⧉');
  };

  const onClick = async () => {
    const string = calculationShareText(document);
    if (!string) return;
    button.disabled = true;
    try {
      await write({ string });
      const copies = Number(document.documentElement.dataset.androidCopyEvents || '0') + 1;
      document.documentElement.dataset.androidCopyEvents = String(copies);
      document.documentElement.dataset.androidCopy = 'copied';
      setLabel('copiedResult', '✓');
      schedule(restore, 1600);
    } catch {
      document.documentElement.dataset.androidCopy = 'error';
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener('click', onClick);
  button.hidden = false;
  restore();
  return () => button.removeEventListener('click', onClick);
}
