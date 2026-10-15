(function statisticsCalculatorInterface() {
  "use strict";
  const core = window.StatisticsCalculatorCore;
  const form = document.querySelector("#statistics-form");
  if (!core || !form) return;

  const inputX = document.querySelector("#statistics-x");
  const inputY = document.querySelector("#statistics-y");
  const summaryResult = document.querySelector("#statistics-summary");
  const frequencyCard = document.querySelector("#statistics-frequency-card");
  const frequencyBody = document.querySelector("#statistics-frequency-body");
  const bivariateCard = document.querySelector("#statistics-bivariate-card");
  const bivariateResult = document.querySelector("#statistics-bivariate");
  const status = document.querySelector("#statistics-status");
  const languageSelect = document.querySelector("#language-select");
  let hasResult = false;

  const t = (key) => window.SciCalUI?.translate(key) || key;

  function format(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    if (!Number.isFinite(value)) return value < 0 ? "−∞" : "∞";
    if (Object.is(value, -0)) return "0";
    const magnitude = Math.abs(value);
    if (magnitude && (magnitude < 1e-6 || magnitude >= 1e10)) return value.toExponential(7);
    return Number(value.toPrecision(10)).toString();
  }

  function renderGrid(container, entries) {
    const grid = document.createElement("div");
    grid.className = "result-grid";
    entries.forEach(([label, value]) => {
      const item = document.createElement("span");
      const caption = document.createElement("span");
      const output = document.createElement("strong");
      caption.textContent = label;
      output.textContent = value;
      item.append(caption, output);
      grid.append(item);
    });
    container.classList.remove("is-error");
    container.replaceChildren(grid);
  }

  function renderError(error) {
    const message = document.createElement("strong");
    message.textContent = error instanceof Error ? error.message : "Unable to calculate statistics.";
    summaryResult.classList.add("is-error");
    summaryResult.replaceChildren(message);
    frequencyCard.hidden = true;
    bivariateCard.hidden = true;
    status.textContent = message.textContent;
    status.classList.add("is-error");
    hasResult = false;
  }

  function calculate() {
    try {
      const x = core.parseSeries(inputX.value, "Data X");
      const result = core.summary(x);
      const modes = result.modes.length ? result.modes.map(format).join(", ") : t("noMode");
      renderGrid(summaryResult, [
        [t("countLabel"), String(result.n)], [t("sumLabel"), format(result.sum)], [t("sumSquaresLabel"), format(result.sumSquares)],
        [t("meanLabel"), format(result.mean)], [t("medianLabel"), format(result.median)], [t("modeLabel"), modes],
        [t("minimumLabel"), format(result.minimum)], [t("maximumLabel"), format(result.maximum)], [t("rangeLabel"), format(result.range)],
        [t("q1Label"), format(result.q1)], [t("q3Label"), format(result.q3)], [t("iqrLabel"), format(result.iqr)],
        [t("populationVarianceLabel"), format(result.populationVariance)], [t("sampleVarianceLabel"), format(result.sampleVariance)],
        [t("populationSdLabel"), format(result.populationStdDev)], [t("sampleSdLabel"), format(result.sampleStdDev)],
        [t("standardErrorLabel"), format(result.standardError)], [t("coefficientVariationLabel"), result.coefficientVariation === null ? "—" : `${format(result.coefficientVariation)}%`],
        [t("skewnessLabel"), format(result.skewness)], [t("kurtosisLabel"), format(result.excessKurtosis)],
      ]);

      frequencyBody.replaceChildren();
      result.frequency.slice(0, 250).forEach((row) => {
        const tableRow = document.createElement("tr");
        [format(row.value), String(row.count), `${format(row.relative * 100)}%`, String(row.cumulative)].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          tableRow.append(cell);
        });
        frequencyBody.append(tableRow);
      });
      frequencyCard.hidden = false;

      if (inputY.value.trim()) {
        const y = core.parseSeries(inputY.value, "Data Y");
        const paired = core.bivariate(x, y);
        renderGrid(bivariateResult, [
          [t("pairsLabel"), String(paired.n)], ["x̄", format(paired.xMean)], ["ȳ", format(paired.yMean)],
          [t("populationCovarianceLabel"), format(paired.populationCovariance)], [t("sampleCovarianceLabel"), format(paired.sampleCovariance)],
          [t("correlationLabel"), format(paired.correlation)], [t("rSquaredLabel"), format(paired.rSquared)],
          [t("slopeLabel"), format(paired.slope)], [t("interceptLabel"), format(paired.intercept)],
          ["ŷ = a + bx", `ŷ = ${format(paired.intercept)} + ${format(paired.slope)}x`],
        ]);
        bivariateCard.hidden = false;
      } else {
        bivariateCard.hidden = true;
      }
      status.textContent = result.frequency.length > 250 ? `${t("calculationComplete")} First 250 frequency rows shown.` : t("calculationComplete");
      status.classList.remove("is-error");
      hasResult = true;
    } catch (error) {
      renderError(error);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculate();
  });
  document.querySelector("#statistics-example").addEventListener("click", () => {
    inputX.value = "1, 2, 3, 4, 5, 6, 7, 8";
    inputY.value = "2, 4, 5, 8, 10, 11, 14, 16";
    calculate();
  });
  document.querySelector("#statistics-clear").addEventListener("click", () => {
    inputX.value = "";
    inputY.value = "";
    const ready = document.createElement("span");
    ready.textContent = t("statisticsReady");
    summaryResult.classList.remove("is-error");
    summaryResult.replaceChildren(ready);
    frequencyCard.hidden = true;
    bivariateCard.hidden = true;
    status.textContent = "";
    status.classList.remove("is-error");
    hasResult = false;
    inputX.focus();
  });
  languageSelect?.addEventListener("change", () => {
    if (hasResult) requestAnimationFrame(calculate);
  });

  window.SciCalStatistics = Object.freeze({ calculate });
})();
