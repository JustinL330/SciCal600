"use strict";

(() => {
  const openButton = document.querySelector("#love-egg-button");
  const closeButton = document.querySelector("#love-egg-close");
  const copyButton = document.querySelector("#love-copy-button");
  const sourceElement = document.querySelector("#love-source-code");
  const dialog = document.querySelector("#love-egg-dialog");
  if (!openButton || !closeButton || !copyButton || !sourceElement || !dialog) return;

  let sourcePromise;
  const loadSource = () => {
    sourcePromise ||= fetch("love-heart.c")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((source) => {
        sourceElement.textContent = source;
        return source;
      })
      .catch(() => {
        const message = "The C source could not be loaded. Use the download button to try again.";
        sourceElement.textContent = message;
        return "";
      });
    return sourcePromise;
  };

  openButton.addEventListener("click", () => {
    loadSource();
    if (!dialog.open) dialog.showModal();
  });

  closeButton.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  copyButton.addEventListener("click", async () => {
    const source = await loadSource();
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source);
      copyButton.textContent = "Copied!";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(sourceElement);
      selection.removeAllRanges();
      selection.addRange(range);
      copyButton.textContent = "Code selected";
    }
    window.setTimeout(() => { copyButton.textContent = "Copy C code"; }, 1800);
  });
})();
